from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .models import Invoice, InvoiceEvent
from .services import advance_invoice_state

@api_view(['POST'])
def submit_invoice(request):
    """Creates the DAG Source"""
    amount = request.data.get('amount')

    invoice = Invoice.objects.create(
        submitter=request.user,
        amount=amount,
        status=Invoice.Status.PENDING,
        current_step_index=0
    )

    # Append to Monoid
    InvoiceEvent.objects.create(
        invoice=invoice,
        actor=request.user,
        action=InvoiceEvent.Action.SUBMITTED
    )
    return Response({"id": invoice.id, "status": invoice.status}, status=status.HTTP_201_CREATED)

@api_view(['POST'])
def approve_invoice(request, invoice_id):
    """The Primary Endomorphism/Morphism Driver"""
    try:
        invoice = Invoice.objects.get(id=invoice_id)

        # Hand off to the pure math engine
        advance_invoice_state(invoice, request.user)

        return Response({"status": "Success", "new_state": invoice.status})

    except PermissionError as e:
        return Response({"error": str(e)}, status=status.HTTP_403_FORBIDDEN)
    except ValueError as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
def get_invoice_thread(request, invoice_id):
    """STRUCTURE 2: The Homomorphism (Read Path)"""
    # 1. Fetch the Free Monoid (The raw logs)
    # If using ClickHouse, this query hits the ClickHouse client instead of ORM
    events = InvoiceEvent.objects.filter(invoice_id=invoice_id).select_related('actor')

    unique_users = set()
    history = []

    for event in events:
        if event.actor:
            unique_users.add(event.actor.username)
        history.append({
            "action": event.action,
            "actor": event.actor.username if event.actor else "System",
            "timestamp": event.timestamp
        })
        
    return Response({
        "thread_participants": list(unique_users), # The mathematical Set Union result
        "audit_trail": history
    })
