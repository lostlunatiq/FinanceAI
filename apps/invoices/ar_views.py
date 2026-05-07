# apps/invoices/ar_views.py
# ─── Accounts Receivable Module ───────────────────────────────────────────────
# This module handles money WE RECEIVE from customers:
#   - Customer master management
#   - AR Invoice creation & PDF upload (invoices WE send to customers)
#   - Record Payment (customer sent us money)
#   - AR Dashboard (KPIs, aging, outstanding)

import uuid
from datetime import date, timedelta

from django.db.models import Count, Q, Sum
from django.utils import timezone
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.models import FileRef
from apps.invoices.ar_models import ARCustomer, ARInvoice, ARPayment
from apps.core.permissions import HasMinimumGrade


# ─── 1. Customer List / Create ────────────────────────────────────────────────

class ARCustomerListView(APIView):
    """
    GET  /api/v1/invoices/ar/customers/       — list all customers
    POST /api/v1/invoices/ar/customers/       — create customer
    """
    permission_classes = [IsAuthenticated, HasMinimumGrade.make(3)]

    def get(self, request):
        qs = ARCustomer.objects.all().order_by("name")
        search = request.query_params.get("search", "")
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(gstin__icontains=search))

        data = []
        for c in qs:
            total_invoiced = float(
                ARInvoice.objects.filter(customer=c).aggregate(t=Sum("total_amount"))["t"] or 0
            )
            total_received = float(
                ARPayment.objects.filter(invoice__customer=c).aggregate(t=Sum("amount_received"))["t"] or 0
            )
            outstanding = total_invoiced - total_received
            overdue_count = ARInvoice.objects.filter(
                customer=c, status__in=["UNPAID", "PARTIALLY_PAID"], due_date__lt=date.today()
            ).count()
            data.append({
                "id": str(c.id),
                "name": c.name,
                "gstin": c.gstin or "",
                "email": c.email or "",
                "phone": c.phone or "",
                "payment_terms": c.payment_terms,
                "credit_limit": float(c.credit_limit or 0),
                "status": c.status,
                "total_invoiced": total_invoiced,
                "total_received": total_received,
                "outstanding": outstanding,
                "overdue_count": overdue_count,
                "created_at": c.created_at.date().isoformat(),
            })
        return Response({"customers": data, "total": len(data)})

    def post(self, request):
        d = request.data
        name = (d.get("name") or "").strip()
        if not name:
            return Response({"error": "Customer name is required."}, status=400)
        customer = ARCustomer.objects.create(
            name=name,
            gstin=(d.get("gstin") or "").strip().upper(),
            email=(d.get("email") or "").strip(),
            phone=(d.get("phone") or "").strip(),
            address=(d.get("address") or "").strip(),
            payment_terms=d.get("payment_terms", "Net 30"),
            credit_limit=d.get("credit_limit") or 0,
            status=d.get("status", "ACTIVE"),
            created_by=request.user,
        )
        return Response({"id": str(customer.id), "name": customer.name, "status": "created"}, status=201)


class ARCustomerDetailView(APIView):
    """
    GET   /api/v1/invoices/ar/customers/<id>/
    PATCH /api/v1/invoices/ar/customers/<id>/
    """
    permission_classes = [IsAuthenticated, HasMinimumGrade.make(3)]

    def get(self, request, pk):
        try:
            c = ARCustomer.objects.get(pk=pk)
        except ARCustomer.DoesNotExist:
            return Response({"error": "Customer not found."}, status=404)

        invoices = ARInvoice.objects.filter(customer=c).order_by("-issue_date")
        inv_data = []
        for inv in invoices:
            received = float(
                ARPayment.objects.filter(invoice=inv).aggregate(t=Sum("amount_received"))["t"] or 0
            )
            inv_data.append({
                "id": str(inv.id),
                "ref_no": inv.ref_no,
                "amount": float(inv.total_amount),
                "received": received,
                "balance": float(inv.total_amount) - received,
                "issue_date": inv.issue_date.isoformat(),
                "due_date": inv.due_date.isoformat() if inv.due_date else None,
                "status": inv.status,
            })

        total_invoiced = sum(i["amount"] for i in inv_data)
        total_received = sum(i["received"] for i in inv_data)

        return Response({
            "id": str(c.id),
            "name": c.name,
            "gstin": c.gstin or "",
            "email": c.email or "",
            "phone": c.phone or "",
            "address": c.address or "",
            "payment_terms": c.payment_terms,
            "credit_limit": float(c.credit_limit or 0),
            "status": c.status,
            "total_invoiced": total_invoiced,
            "total_received": total_received,
            "outstanding": total_invoiced - total_received,
            "invoices": inv_data,
        })

    def patch(self, request, pk):
        try:
            c = ARCustomer.objects.get(pk=pk)
        except ARCustomer.DoesNotExist:
            return Response({"error": "Customer not found."}, status=404)
        for field in ["name", "gstin", "email", "phone", "address", "payment_terms", "credit_limit", "status"]:
            if field in request.data:
                setattr(c, field, request.data[field])
        c.save()
        return Response({"id": str(c.id), "status": "updated"})


# ─── 2. AR Invoice List / Create ──────────────────────────────────────────────

class ARInvoiceListView(APIView):
    """
    GET  /api/v1/invoices/ar/invoices/   — list AR invoices (all or filter by customer)
    POST /api/v1/invoices/ar/invoices/   — create new AR invoice
    """
    permission_classes = [IsAuthenticated, HasMinimumGrade.make(3)]

    def get(self, request):
        qs = ARInvoice.objects.select_related("customer", "created_by").order_by("-issue_date")
        customer_id = request.query_params.get("customer_id")
        status_filter = request.query_params.get("status")
        if customer_id:
            qs = qs.filter(customer_id=customer_id)
        if status_filter:
            qs = qs.filter(status=status_filter)

        data = []
        for inv in qs:
            received = float(
                ARPayment.objects.filter(invoice=inv).aggregate(t=Sum("amount_received"))["t"] or 0
            )
            age = (date.today() - inv.due_date).days if inv.due_date else 0
            data.append({
                "id": str(inv.id),
                "ref_no": inv.ref_no,
                "customer_id": str(inv.customer_id),
                "customer_name": inv.customer.name,
                "invoice_number": inv.invoice_number or inv.ref_no,
                "amount": float(inv.total_amount),
                "amount_received": received,
                "balance_due": float(inv.total_amount) - received,
                "issue_date": inv.issue_date.isoformat(),
                "due_date": inv.due_date.isoformat() if inv.due_date else None,
                "age_days": age,
                "status": inv.status,
                "description": inv.description or "",
                "has_file": bool(inv.invoice_file_id),
            })
        return Response({"invoices": data, "total": len(data)})

    def post(self, request):
        d = request.data
        customer_id = d.get("customer_id")
        if not customer_id:
            return Response({"error": "customer_id is required."}, status=400)
        try:
            customer = ARCustomer.objects.get(pk=customer_id)
        except ARCustomer.DoesNotExist:
            return Response({"error": "Customer not found."}, status=404)

        try:
            total_amount = float(d.get("total_amount") or 0)
        except (ValueError, TypeError):
            return Response({"error": "Invalid total_amount."}, status=400)
        if total_amount <= 0:
            return Response({"error": "Total amount must be greater than zero."}, status=400)

        try:
            issue_date = date.fromisoformat(d.get("issue_date") or date.today().isoformat())
        except ValueError:
            issue_date = date.today()

        payment_terms = d.get("payment_terms") or customer.payment_terms or "Net 30"
        try:
            days = int(payment_terms.replace("Net", "").strip())
        except Exception:
            days = 30
        due_date_str = d.get("due_date")
        try:
            due_date = date.fromisoformat(due_date_str) if due_date_str else issue_date + timedelta(days=days)
        except ValueError:
            due_date = issue_date + timedelta(days=days)

        inv = ARInvoice.objects.create(
            customer=customer,
            invoice_number=(d.get("invoice_number") or "").strip(),
            issue_date=issue_date,
            due_date=due_date,
            pre_gst_amount=float(d.get("pre_gst_amount") or total_amount),
            cgst=float(d.get("cgst") or 0),
            sgst=float(d.get("sgst") or 0),
            igst=float(d.get("igst") or 0),
            total_amount=total_amount,
            description=(d.get("description") or "").strip(),
            payment_terms=payment_terms,
            status="UNPAID",
            created_by=request.user,
        )
        return Response({
            "id": str(inv.id),
            "ref_no": inv.ref_no,
            "customer": customer.name,
            "amount": float(inv.total_amount),
            "due_date": inv.due_date.isoformat(),
            "status": "created",
        }, status=201)


# ─── 3. AR Invoice Detail ─────────────────────────────────────────────────────

class ARInvoiceDetailView(APIView):
    """
    GET   /api/v1/invoices/ar/invoices/<id>/
    PATCH /api/v1/invoices/ar/invoices/<id>/
    """
    permission_classes = [IsAuthenticated, HasMinimumGrade.make(3)]

    def get(self, request, pk):
        try:
            inv = ARInvoice.objects.select_related("customer", "created_by", "invoice_file").get(pk=pk)
        except ARInvoice.DoesNotExist:
            return Response({"error": "Invoice not found."}, status=404)

        payments = ARPayment.objects.filter(invoice=inv).order_by("-received_at")
        total_received = float(payments.aggregate(t=Sum("amount_received"))["t"] or 0)
        payment_list = [{
            "id": str(p.id),
            "amount_received": float(p.amount_received),
            "received_at": p.received_at.isoformat(),
            "payment_method": p.payment_method,
            "reference_number": p.reference_number or "",
            "notes": p.notes or "",
            "recorded_by": p.recorded_by.get_full_name() if p.recorded_by else "",
        } for p in payments]

        return Response({
            "id": str(inv.id),
            "ref_no": inv.ref_no,
            "invoice_number": inv.invoice_number or inv.ref_no,
            "customer": {"id": str(inv.customer_id), "name": inv.customer.name, "gstin": inv.customer.gstin or ""},
            "issue_date": inv.issue_date.isoformat(),
            "due_date": inv.due_date.isoformat() if inv.due_date else None,
            "total_amount": float(inv.total_amount),
            "pre_gst_amount": float(inv.pre_gst_amount),
            "cgst": float(inv.cgst),
            "sgst": float(inv.sgst),
            "igst": float(inv.igst),
            "description": inv.description or "",
            "payment_terms": inv.payment_terms,
            "status": inv.status,
            "amount_received": total_received,
            "balance_due": float(inv.total_amount) - total_received,
            "payments": payment_list,
            "invoice_file_url": inv.invoice_file.file.url if inv.invoice_file else None,
            "created_by": inv.created_by.get_full_name() if inv.created_by else "",
            "created_at": inv.created_at.isoformat(),
        })


# ─── 4. AR Invoice PDF Upload ─────────────────────────────────────────────────

class ARInvoiceUploadView(APIView):
    """
    POST /api/v1/invoices/ar/invoices/<id>/upload/
    Upload the invoice PDF/image that we send to the customer.
    """
    permission_classes = [IsAuthenticated, HasMinimumGrade.make(3)]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, pk):
        try:
            inv = ARInvoice.objects.get(pk=pk)
        except ARInvoice.DoesNotExist:
            return Response({"error": "Invoice not found."}, status=404)

        file_obj = request.FILES.get("file")
        if not file_obj:
            return Response({"error": "No file provided."}, status=400)

        allowed_types = ["application/pdf", "image/jpeg", "image/png", "image/jpg"]
        if file_obj.content_type not in allowed_types:
            return Response({"error": "Only PDF, JPG, PNG allowed."}, status=400)

        # Save file via FileRef
        file_ref = FileRef.objects.create(
            file=file_obj,
            original_name=file_obj.name,
            content_type=file_obj.content_type,
            uploaded_by=request.user,
        )
        inv.invoice_file = file_ref
        inv.save(update_fields=["invoice_file"])

        return Response({
            "message": "Invoice file uploaded successfully.",
            "file_url": file_ref.file.url,
            "invoice_id": str(inv.id),
            "ref_no": inv.ref_no,
        })


# ─── 5. Record Payment (Customer Paid Us) ─────────────────────────────────────

class ARRecordPaymentView(APIView):
    """
    POST /api/v1/invoices/ar/invoices/<id>/payment/
    Record a payment received from the customer.
    Body: {amount_received, received_at, payment_method, reference_number, notes}
    """
    permission_classes = [IsAuthenticated, HasMinimumGrade.make(3)]

    def post(self, request, pk):
        try:
            inv = ARInvoice.objects.get(pk=pk)
        except ARInvoice.DoesNotExist:
            return Response({"error": "Invoice not found."}, status=404)

        if inv.status == "PAID":
            return Response({"error": "This invoice is already fully paid."}, status=400)

        try:
            amount_received = float(request.data.get("amount_received") or 0)
        except (ValueError, TypeError):
            return Response({"error": "Invalid amount_received."}, status=400)
        if amount_received <= 0:
            return Response({"error": "Amount must be greater than zero."}, status=400)

        total_amount = float(inv.total_amount)
        already_received = float(
            ARPayment.objects.filter(invoice=inv).aggregate(t=Sum("amount_received"))["t"] or 0
        )
        balance = total_amount - already_received
        if amount_received > balance + 0.01:
            return Response({
                "error": f"Amount ₹{amount_received:,.2f} exceeds balance due ₹{balance:,.2f}."
            }, status=400)

        received_at_str = request.data.get("received_at")
        try:
            received_at = date.fromisoformat(received_at_str) if received_at_str else date.today()
        except ValueError:
            received_at = date.today()

        payment = ARPayment.objects.create(
            invoice=inv,
            amount_received=amount_received,
            received_at=received_at,
            payment_method=request.data.get("payment_method", "NEFT"),
            reference_number=(request.data.get("reference_number") or "").strip(),
            notes=(request.data.get("notes") or "").strip(),
            recorded_by=request.user,
        )

        # Update invoice status
        new_total_received = already_received + amount_received
        if abs(new_total_received - total_amount) < 1:  # within ₹1 = fully paid
            inv.status = "PAID"
            inv.paid_at = timezone.now()
        elif new_total_received > 0:
            inv.status = "PARTIALLY_PAID"
        inv.save(update_fields=["status", "paid_at"])

        return Response({
            "message": f"Payment of ₹{amount_received:,.2f} recorded successfully.",
            "payment_id": str(payment.id),
            "invoice_ref": inv.ref_no,
            "customer": inv.customer.name,
            "amount_received": amount_received,
            "total_received": new_total_received,
            "balance_remaining": total_amount - new_total_received,
            "invoice_status": inv.status,
        }, status=201)


# ─── 6. AR Dashboard (KPIs + Aging) ──────────────────────────────────────────

class ARDashboardView(APIView):
    """
    GET /api/v1/invoices/ar/dashboard/
    Returns AR KPIs, aging buckets, recent payments, overdue invoices.
    """
    permission_classes = [IsAuthenticated, HasMinimumGrade.make(3)]

    def get(self, request):
        today = date.today()
        month_start = today.replace(day=1)

        all_invoices = ARInvoice.objects.select_related("customer")
        all_payments = ARPayment.objects.select_related("invoice__customer")

        # KPIs
        total_invoiced = float(all_invoices.aggregate(t=Sum("total_amount"))["t"] or 0)
        total_received = float(all_payments.aggregate(t=Sum("amount_received"))["t"] or 0)
        total_outstanding = total_invoiced - total_received
        received_this_month = float(
            all_payments.filter(received_at__gte=month_start).aggregate(t=Sum("amount_received"))["t"] or 0
        )
        overdue_invoices = all_invoices.filter(
            status__in=["UNPAID", "PARTIALLY_PAID"],
            due_date__lt=today
        )
        overdue_amount = float(overdue_invoices.aggregate(t=Sum("total_amount"))["t"] or 0)
        total_customers = ARCustomer.objects.filter(status="ACTIVE").count()
        unpaid_count = all_invoices.filter(status__in=["UNPAID", "PARTIALLY_PAID"]).count()

        # Aging buckets
        def aging_bucket(days_min, days_max=None):
            qs = all_invoices.filter(status__in=["UNPAID", "PARTIALLY_PAID"])
            if days_max is not None:
                qs = qs.filter(due_date__lt=today - timedelta(days=days_min),
                               due_date__gte=today - timedelta(days=days_max))
            else:
                qs = qs.filter(due_date__lt=today - timedelta(days=days_min))
            return {
                "count": qs.count(),
                "amount": float(qs.aggregate(t=Sum("total_amount"))["t"] or 0),
            }

        aging = {
            "current": {
                "count": all_invoices.filter(status__in=["UNPAID", "PARTIALLY_PAID"], due_date__gte=today).count(),
                "amount": float(all_invoices.filter(status__in=["UNPAID", "PARTIALLY_PAID"], due_date__gte=today).aggregate(t=Sum("total_amount"))["t"] or 0),
            },
            "1_30_days": aging_bucket(0, 30),
            "31_60_days": aging_bucket(30, 60),
            "61_90_days": aging_bucket(60, 90),
            "over_90_days": aging_bucket(90),
        }

        # Recent payments (last 10)
        recent_payments = []
        for p in all_payments.order_by("-received_at")[:10]:
            recent_payments.append({
                "id": str(p.id),
                "customer": p.invoice.customer.name,
                "invoice_ref": p.invoice.ref_no,
                "amount": float(p.amount_received),
                "received_at": p.received_at.isoformat(),
                "method": p.payment_method,
                "reference": p.reference_number or "",
            })

        # Top overdue invoices
        overdue_list = []
        for inv in overdue_invoices.order_by("due_date")[:10]:
            received = float(
                ARPayment.objects.filter(invoice=inv).aggregate(t=Sum("amount_received"))["t"] or 0
            )
            days_overdue = (today - inv.due_date).days if inv.due_date else 0
            overdue_list.append({
                "id": str(inv.id),
                "ref_no": inv.ref_no,
                "customer": inv.customer.name,
                "amount": float(inv.total_amount),
                "received": received,
                "balance": float(inv.total_amount) - received,
                "days_overdue": days_overdue,
                "due_date": inv.due_date.isoformat() if inv.due_date else None,
            })

        # Top customers by outstanding
        top_customers = []
        for c in ARCustomer.objects.filter(status="ACTIVE")[:20]:
            inv_total = float(ARInvoice.objects.filter(customer=c).aggregate(t=Sum("total_amount"))["t"] or 0)
            pay_total = float(ARPayment.objects.filter(invoice__customer=c).aggregate(t=Sum("amount_received"))["t"] or 0)
            outstanding = inv_total - pay_total
            if outstanding > 0:
                top_customers.append({"name": c.name, "outstanding": outstanding})
        top_customers.sort(key=lambda x: x["outstanding"], reverse=True)

        return Response({
            "kpis": {
                "total_outstanding": round(total_outstanding, 2),
                "total_invoiced": round(total_invoiced, 2),
                "total_received": round(total_received, 2),
                "received_this_month": round(received_this_month, 2),
                "overdue_amount": round(overdue_amount, 2),
                "overdue_count": overdue_invoices.count(),
                "total_customers": total_customers,
                "unpaid_count": unpaid_count,
                "collection_rate_pct": round(total_received / total_invoiced * 100, 1) if total_invoiced else 0,
            },
            "aging": aging,
            "recent_payments": recent_payments,
            "overdue_invoices": overdue_list,
            "top_outstanding_customers": top_customers[:5],
        })
