"""
End-to-end tests for the full invoice approval and payment lifecycle.

Tests cover every persona's happy path and key bad-path (security/SoD) cases.

Run with:
    python manage.py test apps.invoices.tests_e2e --verbosity=2
"""

from decimal import Decimal
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.core.models import User, Department
from apps.invoices.models import (
    Vendor,
    Expense,
    ExpenseApprovalStep,
    VendorL1Mapping,
    ExpensePolicyLimit,
)
from apps.invoices.services import _get_required_steps, transition_expense


# ── Helpers ──────────────────────────────────────────────────────────────────

def make_user(username, role, dept=None, **kwargs):
    u = User.objects.create_user(
        username=username,
        password="test1234!",
        role=role,
        department=dept,
        email=f"{username}@test.com",
        first_name=username.capitalize(),
        **kwargs,
    )
    return u


def token_for(client, username, password="test1234!"):
    resp = client.post("/api/v1/auth/login/", {"username": username, "password": password}, format="json")
    assert resp.status_code == 200, f"Login failed for {username}: {resp.data}"
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['access']}")
    return resp.data["access"]


class BaseFlowTest(TestCase):
    """Shared setup: users, vendor, policy limits, VendorL1Mapping."""

    @classmethod
    def setUpTestData(cls):
        cls.dept = Department.objects.create(name="Engineering", budget_annual=Decimal("5000000"))

        cls.vendor_user = make_user("tv_vendor", "vendor")
        cls.employee   = make_user("tv_emp", "employee", dept=cls.dept)
        cls.l1         = make_user("tv_l1", "employee",  dept=cls.dept)
        cls.l2         = make_user("tv_l2", "employee",  dept=cls.dept)
        cls.hod        = make_user("tv_hod", "dept_head", dept=cls.dept)
        cls.fin_l1     = make_user("tv_fin1", "finance_manager")
        cls.fin_l2     = make_user("tv_fin2", "finance_manager")
        cls.fin_admin  = make_user("tv_fin_admin", "finance_admin")
        cls.cfo        = make_user("tv_cfo", "cfo")

        cls.vendor = Vendor.objects.create(
            name="TestVendor Ltd",
            name_normalized="testvendor ltd",
            is_approved=True,
            status="ACTIVE",
            user=cls.vendor_user,
            gstin="27AABCT1234A1Z5",
        )

        VendorL1Mapping.objects.create(vendor=cls.vendor, l1_user=cls.l1, is_primary=True, assigned_by=cls.fin_admin)
        VendorL1Mapping.objects.create(vendor=cls.vendor, l1_user=cls.l2, is_primary=False, assigned_by=cls.fin_admin)

        # Finance policy limits: FIN_L2 ≤25k, FIN_HEAD ≤200k, CFO anything above
        ExpensePolicyLimit.objects.create(role="FIN_L2",  max_amount=Decimal("25000"),  is_active=True, set_by=cls.fin_admin)
        ExpensePolicyLimit.objects.create(role="FIN_HEAD", max_amount=Decimal("200000"), is_active=True, set_by=cls.fin_admin)
        ExpensePolicyLimit.objects.create(role="CFO",     max_amount=Decimal("99999999"), is_active=True, set_by=cls.fin_admin)

    def setUp(self):
        self.client = APIClient()

    def _submit_bill(self, amount="15000.00", submitter_token=None, via_vendor_portal=True):
        """Submit a bill and return the created expense data."""
        if submitter_token is None:
            submitter_token = token_for(self.client, "tv_vendor")
        url = "/api/v1/invoices/vendor/bills/" if via_vendor_portal else "/api/v1/invoices/submit/"
        resp = self.client.post(url, {
            "vendor": str(self.vendor.id),
            "invoice_number": f"INV-TEST-{timezone.now().timestamp():.0f}",
            "invoice_date": "2026-04-18",
            "pre_gst_amount": amount,
            "cgst": "0.00",
            "sgst": "0.00",
            "igst": "0.00",
            "total_amount": amount,
            "business_purpose": "E2E test submission",
        }, format="json")
        return resp


# ── 1. Amount-Based Chain Routing ─────────────────────────────────────────────

class TestAmountBasedRouting(TestCase):
    """Verify that _get_required_steps returns the right chain per amount."""

    @classmethod
    def setUpTestData(cls):
        cls.vendor = Vendor.objects.create(name="RoutingVendor", name_normalized="routingvendor", is_approved=True)
        cls.submitter = make_user("rv_submitter", "employee")
        ExpensePolicyLimit.objects.create(role="FIN_L2",  max_amount=Decimal("25000"))
        ExpensePolicyLimit.objects.create(role="FIN_HEAD", max_amount=Decimal("200000"))
        ExpensePolicyLimit.objects.create(role="CFO",     max_amount=Decimal("99999999"))

    def _fake_expense(self, amount):
        class FakeExpense:
            filed_on_behalf = False
            filer_on_behalf = None
            total_amount = Decimal(str(amount))
            vendor = TestAmountBasedRouting.vendor
            submitted_by = TestAmountBasedRouting.submitter
        return FakeExpense()

    def _roles(self, amount):
        return [r for _, r in _get_required_steps(self._fake_expense(amount))]

    def test_small_bill_stops_at_fin_l2(self):
        """₹5,000 ≤ ₹25k → chain ends at FIN_L2 (Finance L2 is final payer)."""
        roles = self._roles(5000)
        self.assertEqual(roles, ["EMP_L1", "EMP_L2", "DEPT_HEAD", "FIN_L1", "FIN_L2"])
        self.assertEqual(roles[-1], "FIN_L2")

    def test_at_fin_l2_boundary(self):
        """₹25,000 exactly hits FIN_L2 limit — Finance L2 is still final."""
        roles = self._roles(25000)
        self.assertEqual(roles[-1], "FIN_L2")

    def test_just_above_fin_l2_goes_to_fin_head(self):
        """₹25,001 exceeds FIN_L2 limit → Finance Admin is final payer."""
        roles = self._roles(25001)
        self.assertEqual(roles[-1], "FIN_HEAD")

    def test_medium_bill_stops_at_fin_head(self):
        """₹1,00,000 ≤ ₹2,00,000 → Finance Admin is final payer."""
        roles = self._roles(100000)
        self.assertEqual(roles[-1], "FIN_HEAD")
        self.assertIn("FIN_L2", roles)

    def test_at_fin_head_boundary(self):
        """₹2,00,000 exactly hits FIN_HEAD limit — Finance Admin is still final."""
        roles = self._roles(200000)
        self.assertEqual(roles[-1], "FIN_HEAD")

    def test_large_bill_requires_cfo(self):
        """₹2,00,001 exceeds FIN_HEAD limit → CFO must approve."""
        roles = self._roles(200001)
        self.assertEqual(roles[-1], "CFO")

    def test_very_large_bill_full_chain(self):
        """₹1 Cr → full 7-step chain including CFO."""
        roles = self._roles(10000000)
        self.assertEqual(roles, ["EMP_L1", "EMP_L2", "DEPT_HEAD", "FIN_L1", "FIN_L2", "FIN_HEAD", "CFO"])

    def test_operational_steps_always_present(self):
        """L1, L2, HOD, FIN_L1 must appear in every chain regardless of amount."""
        for amount in [1000, 25000, 100000, 200000, 500000, 5000000]:
            roles = self._roles(amount)
            for required in ["EMP_L1", "EMP_L2", "DEPT_HEAD", "FIN_L1"]:
                self.assertIn(required, roles, f"Missing {required} for amount {amount}")

    def test_no_policy_limits_uses_full_chain(self):
        """Without any policy limits configured, every bill gets the full 7-step chain."""
        ExpensePolicyLimit.objects.all().delete()
        roles = self._roles(5000)
        self.assertEqual(roles, ["EMP_L1", "EMP_L2", "DEPT_HEAD", "FIN_L1", "FIN_L2", "FIN_HEAD", "CFO"])
        # Restore
        ExpensePolicyLimit.objects.create(role="FIN_L2",  max_amount=Decimal("25000"))
        ExpensePolicyLimit.objects.create(role="FIN_HEAD", max_amount=Decimal("200000"))
        ExpensePolicyLimit.objects.create(role="CFO",     max_amount=Decimal("99999999"))

    def test_filed_on_behalf_by_hod_skips_l1_l2(self):
        """When HOD files on behalf of vendor, L1 and L2 are skipped."""
        hod = make_user("rv_hod", "dept_head")

        class BehalfExpense:
            filed_on_behalf = True
            filer_on_behalf = hod
            total_amount = Decimal("50000")
            vendor = TestAmountBasedRouting.vendor
            submitted_by = hod

        roles = [r for _, r in _get_required_steps(BehalfExpense())]
        self.assertNotIn("EMP_L1", roles)
        self.assertNotIn("EMP_L2", roles)
        self.assertIn("DEPT_HEAD", roles)

    def test_filed_on_behalf_by_finance_manager_skips_operational(self):
        """Finance Manager filing on behalf skips L1, L2, HOD."""
        fin = make_user("rv_fin", "finance_manager")

        class BehalfExpense:
            filed_on_behalf = True
            filer_on_behalf = fin
            total_amount = Decimal("15000")
            vendor = TestAmountBasedRouting.vendor
            submitted_by = fin

        roles = [r for _, r in _get_required_steps(BehalfExpense())]
        self.assertNotIn("EMP_L1", roles)
        self.assertNotIn("EMP_L2", roles)
        self.assertNotIn("DEPT_HEAD", roles)
        self.assertIn("FIN_L1", roles)


# ── 2. Vendor Submission → L1 Queue ───────────────────────────────────────────

class TestVendorSubmitToL1Queue(BaseFlowTest):
    """When a vendor submits a bill, it must appear in the L1 approver's queue."""

    def test_vendor_submit_creates_pending_steps(self):
        """Vendor submits → expense status = PENDING_L1, step 1 assigned to l1_approver."""
        token_for(self.client, "tv_vendor")
        resp = self._submit_bill("15000.00")

        self.assertEqual(resp.status_code, 201, resp.data)
        bill_id = resp.data["id"]

        expense = Expense.objects.get(pk=bill_id)
        self.assertEqual(expense.status, "PENDING_L1")
        self.assertEqual(expense.current_step, 1)

        step1 = ExpenseApprovalStep.objects.get(expense=expense, level=1)
        self.assertEqual(step1.assigned_to, self.l1)
        self.assertEqual(step1.status, "PENDING")

        step2 = ExpenseApprovalStep.objects.get(expense=expense, level=2)
        self.assertEqual(step2.assigned_to, self.l2)

    def test_bill_visible_in_l1_queue(self):
        """Bill submitted by vendor must appear in l1_approver's finance queue."""
        token_for(self.client, "tv_vendor")
        submit_resp = self._submit_bill("15000.00")
        self.assertEqual(submit_resp.status_code, 201)
        bill_id = submit_resp.data["id"]

        # L1 approver checks queue
        token_for(self.client, "tv_l1")
        queue_resp = self.client.get("/api/v1/invoices/finance/bills/queue/")
        self.assertEqual(queue_resp.status_code, 200)

        ids_in_queue = [b["id"] for b in queue_resp.data]
        self.assertIn(bill_id, ids_in_queue, "Bill not found in L1 approver's queue")

    def test_bill_not_visible_in_l2_queue_yet(self):
        """Bill should NOT be in L2 queue until L1 has approved."""
        token_for(self.client, "tv_vendor")
        self._submit_bill("15000.00")

        token_for(self.client, "tv_l2")
        queue_resp = self.client.get("/api/v1/invoices/finance/bills/queue/")
        self.assertEqual(queue_resp.status_code, 200)
        self.assertEqual(len(queue_resp.data), 0, "L2 should not see bill before L1 approves")

    def test_bill_not_visible_in_hod_queue_yet(self):
        """Bill should NOT be in HOD queue until L1+L2 approve."""
        token_for(self.client, "tv_vendor")
        self._submit_bill("15000.00")

        token_for(self.client, "tv_hod")
        queue_resp = self.client.get("/api/v1/invoices/finance/bills/queue/")
        self.assertEqual(queue_resp.status_code, 200)
        self.assertEqual(len(queue_resp.data), 0)


# ── 3. Full Happy-Path: Small Bill (₹15k → Finance L2 pays) ─────────────────

class TestSmallBillFullFlow(BaseFlowTest):
    """Full approval + payment flow for a ₹15k bill. Finance L2 is final payer."""

    def _get_bill_id(self):
        token_for(self.client, "tv_vendor")
        resp = self._submit_bill("15000.00")
        self.assertEqual(resp.status_code, 201)
        return resp.data["id"]

    def test_full_small_bill_flow(self):
        """₹15k bill: vendor → L1 → L2 → HOD → FinL1 → FinL2 (pay) → PAID."""
        bill_id = self._get_bill_id()

        # L1 approves
        token_for(self.client, "tv_l1")
        r = self.client.post(f"/api/v1/invoices/finance/bills/{bill_id}/approve/", {"reason": "L1 approved"}, format="json")
        self.assertEqual(r.status_code, 200, f"L1 approve failed: {r.data}")
        self.assertEqual(r.data["status"], "PENDING_L2")

        # L2 approves
        token_for(self.client, "tv_l2")
        r = self.client.post(f"/api/v1/invoices/finance/bills/{bill_id}/approve/", {"reason": "L2 approved"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["status"], "PENDING_HOD")

        # HOD approves
        token_for(self.client, "tv_hod")
        r = self.client.post(f"/api/v1/invoices/finance/bills/{bill_id}/approve/", {"reason": "HOD approved"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["status"], "PENDING_FIN_L1")

        # Finance L1 approves
        token_for(self.client, "tv_fin1")
        r = self.client.post(f"/api/v1/invoices/finance/bills/{bill_id}/approve/", {"reason": "Fin L1 approved"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["status"], "PENDING_FIN_L2")

        # Finance L2 approves → APPROVED (final payer for ≤₹25k)
        token_for(self.client, "tv_fin2")
        r = self.client.post(f"/api/v1/invoices/finance/bills/{bill_id}/approve/", {"reason": "Fin L2 approved"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["status"], "APPROVED", f"Expected APPROVED, got {r.data['status']}")

        # Finance Admin initiates payment (P+3 days)
        token_for(self.client, "tv_fin_admin")
        r = self.client.post(f"/api/v1/invoices/finance/bills/{bill_id}/initiate-payment/", {"notes": "Initiating"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["status"], "PAYMENT_INITIATED")
        self.assertIsNotNone(r.data["payment_due_date"])

        # Finance Admin marks paid with UTR
        r = self.client.post(f"/api/v1/invoices/finance/bills/{bill_id}/mark-paid/", {"utr": "UTR202604180001", "notes": "Paid"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["status"], "PAID")
        self.assertEqual(r.data["d365_payment_utr"], "UTR202604180001")

    def test_queue_advances_correctly_after_each_approval(self):
        """Each approver sees the bill only at their step; queue clears after they approve."""
        bill_id = self._get_bill_id()

        # Before any approval: only L1 sees it
        token_for(self.client, "tv_l1")
        self.assertEqual(len(self.client.get("/api/v1/invoices/finance/bills/queue/").data), 1)
        token_for(self.client, "tv_l2")
        self.assertEqual(len(self.client.get("/api/v1/invoices/finance/bills/queue/").data), 0)

        # L1 approves
        token_for(self.client, "tv_l1")
        self.client.post(f"/api/v1/invoices/finance/bills/{bill_id}/approve/", {"reason": "ok"}, format="json")

        # Now L2 sees it, L1 queue is clear
        token_for(self.client, "tv_l2")
        self.assertEqual(len(self.client.get("/api/v1/invoices/finance/bills/queue/").data), 1)
        token_for(self.client, "tv_l1")
        self.assertEqual(len(self.client.get("/api/v1/invoices/finance/bills/queue/").data), 0)


# ── 4. Full Happy-Path: Large Bill (₹5L → Finance Admin pays) ────────────────

class TestLargeBillFlow(BaseFlowTest):
    """₹5L bill: full chain through Finance Admin as final payer."""

    def test_large_bill_requires_fin_admin_approval(self):
        """₹5L bill must pass through FIN_L2 and reach PENDING_FIN_HEAD before APPROVED."""
        token_for(self.client, "tv_vendor")
        resp = self._submit_bill("500000.00")
        self.assertEqual(resp.status_code, 201)
        bill_id = resp.data["id"]

        # Verify chain: should include FIN_HEAD step (since 500000 > 200000 > 25000 → CFO)
        expense = Expense.objects.get(pk=bill_id)
        levels = list(expense.approval_steps.values_list("level", flat=True).order_by("level"))
        self.assertIn(7, levels, "CFO step (level 7) must be in chain for ₹5L bill > ₹2L limit")

        steps_for_approval = [
            ("tv_l1", "PENDING_L2"),
            ("tv_l2", "PENDING_HOD"),
            ("tv_hod", "PENDING_FIN_L1"),
            ("tv_fin1", "PENDING_FIN_L2"),
            ("tv_fin2", "PENDING_FIN_HEAD"),
            ("tv_fin_admin", "PENDING_CFO"),
            ("tv_cfo", "APPROVED"),
        ]
        for username, expected_status in steps_for_approval:
            token_for(self.client, username)
            r = self.client.post(f"/api/v1/invoices/finance/bills/{bill_id}/approve/", {"reason": "approved"}, format="json")
            self.assertEqual(r.status_code, 200, f"{username} approve failed: {r.data}")
            self.assertEqual(r.data["status"], expected_status, f"After {username}: expected {expected_status}, got {r.data['status']}")


# ── 5. Vendor Portal — UTR and Payment Date Visibility ───────────────────────

class TestVendorPaymentVisibility(BaseFlowTest):
    """Vendor must see payment_due_date and UTR on their bill detail."""

    def _run_to_payment_initiated(self, bill_id):
        """Fast-forward bill through all approvals to PAYMENT_INITIATED."""
        for username in ["tv_l1", "tv_l2", "tv_hod", "tv_fin1", "tv_fin2"]:
            token_for(self.client, username)
            self.client.post(f"/api/v1/invoices/finance/bills/{bill_id}/approve/", {"reason": "ok"}, format="json")
        token_for(self.client, "tv_fin_admin")
        self.client.post(f"/api/v1/invoices/finance/bills/{bill_id}/initiate-payment/", {}, format="json")

    def test_vendor_sees_payment_due_date(self):
        """After payment is initiated, vendor can see payment_due_date on their bill."""
        token_for(self.client, "tv_vendor")
        resp = self._submit_bill("15000.00")
        bill_id = resp.data["id"]

        self._run_to_payment_initiated(bill_id)

        # Vendor polls their bill
        token_for(self.client, "tv_vendor")
        r = self.client.get(f"/api/v1/invoices/vendor/bills/{bill_id}/")
        self.assertEqual(r.status_code, 200)
        self.assertIsNotNone(r.data.get("payment_due_date"), "Vendor should see payment_due_date")
        self.assertEqual(r.data["status"], "PAYMENT_INITIATED")

    def test_vendor_sees_utr_after_paid(self):
        """After Finance Admin marks paid, vendor can see UTR on their bill."""
        token_for(self.client, "tv_vendor")
        resp = self._submit_bill("15000.00")
        bill_id = resp.data["id"]

        self._run_to_payment_initiated(bill_id)

        token_for(self.client, "tv_fin_admin")
        self.client.post(f"/api/v1/invoices/finance/bills/{bill_id}/mark-paid/", {"utr": "UTR_TEST_001"}, format="json")

        token_for(self.client, "tv_vendor")
        r = self.client.get(f"/api/v1/invoices/vendor/bills/{bill_id}/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["status"], "PAID")
        self.assertEqual(r.data["d365_payment_utr"], "UTR_TEST_001")


# ── 6. Rejection Flow ─────────────────────────────────────────────────────────

class TestRejectionFlow(BaseFlowTest):
    """Any approver can reject; bill goes terminal."""

    def test_l1_reject_terminates_bill(self):
        """L1 rejects → bill becomes REJECTED, disappears from all queues."""
        token_for(self.client, "tv_vendor")
        resp = self._submit_bill("15000.00")
        bill_id = resp.data["id"]

        token_for(self.client, "tv_l1")
        r = self.client.post(f"/api/v1/invoices/finance/bills/{bill_id}/reject/", {"reason": "Documentation is insufficient"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["status"], "REJECTED")

        # L2 queue should be empty
        token_for(self.client, "tv_l2")
        self.assertEqual(len(self.client.get("/api/v1/invoices/finance/bills/queue/").data), 0)

    def test_rejection_reason_required(self):
        """Rejection without a meaningful reason (≥10 chars) must be rejected."""
        token_for(self.client, "tv_vendor")
        resp = self._submit_bill("15000.00")
        bill_id = resp.data["id"]

        token_for(self.client, "tv_l1")
        r = self.client.post(f"/api/v1/invoices/finance/bills/{bill_id}/reject/", {"reason": "No"}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("10 characters", str(r.data))


# ── 7. HOD File-on-Behalf ────────────────────────────────────────────────────

class TestHODFileOnBehalf(BaseFlowTest):
    """HOD can file a bill on behalf of vendor; L1/L2 steps are skipped."""

    def test_hod_submit_starts_at_hod_step(self):
        """Bill filed by HOD on behalf of vendor starts at PENDING_HOD, not L1."""
        token_for(self.client, "tv_hod")
        resp = self.client.post("/api/v1/invoices/submit/", {
            "vendor": str(self.vendor.id),
            "invoice_number": "INV-HOD-001",
            "invoice_date": "2026-04-18",
            "pre_gst_amount": "50000.00",
            "cgst": "0.00",
            "sgst": "0.00",
            "igst": "0.00",
            "total_amount": "50000.00",
            "business_purpose": "Filed on behalf of vendor",
            "filed_on_behalf": True,
            "filer_on_behalf": str(self.hod.id),
        }, format="json")
        self.assertEqual(resp.status_code, 201, resp.data)
        self.assertEqual(resp.data["status"], "PENDING_HOD")

        expense = Expense.objects.get(pk=resp.data["id"])
        levels = list(expense.approval_steps.values_list("level", flat=True).order_by("level"))
        self.assertNotIn(1, levels, "L1 step should be skipped when HOD files on behalf")
        self.assertNotIn(2, levels, "L2 step should be skipped when HOD files on behalf")
        self.assertIn(3, levels, "HOD step must be present")

    def test_hod_can_approve_own_filed_bill(self):
        """HOD who filed the bill can approve the HOD step (SoD exception for administrative filing)."""
        token_for(self.client, "tv_hod")
        resp = self.client.post("/api/v1/invoices/submit/", {
            "vendor": str(self.vendor.id),
            "invoice_number": "INV-HOD-002",
            "invoice_date": "2026-04-18",
            "pre_gst_amount": "50000.00",
            "cgst": "0.00",
            "sgst": "0.00",
            "igst": "0.00",
            "total_amount": "50000.00",
            "business_purpose": "Filed on behalf of vendor by HOD",
            "filed_on_behalf": True,
            "filer_on_behalf": str(self.hod.id),
        }, format="json")
        bill_id = resp.data["id"]

        # HOD approves their own filed bill
        r = self.client.post(f"/api/v1/invoices/finance/bills/{bill_id}/approve/", {"reason": "HOD self-approved filed bill"}, format="json")
        self.assertEqual(r.status_code, 200, f"HOD could not approve their own filed bill: {r.data}")
        self.assertEqual(r.data["status"], "PENDING_FIN_L1")


# ── 8. Security / SoD Tests ───────────────────────────────────────────────────

class TestSecurityAndSoD(BaseFlowTest):
    """Bad-path tests: privilege escalation, SoD violations, unauthorized actions."""

    def test_vendor_cannot_approve_bill(self):
        """Vendor must not be able to approve any invoice."""
        token_for(self.client, "tv_vendor")
        resp = self._submit_bill("15000.00")
        bill_id = resp.data["id"]

        r = self.client.post(f"/api/v1/invoices/finance/bills/{bill_id}/approve/", {"reason": "self approve"}, format="json")
        self.assertIn(r.status_code, [403, 400])

    def test_submitter_cannot_approve_own_bill(self):
        """Employee who submitted cannot be the L1 approver (SoD)."""
        token_for(self.client, "tv_emp")
        resp = self.client.post("/api/v1/invoices/submit/", {
            "vendor": str(self.vendor.id),
            "invoice_number": "INV-SoD-001",
            "invoice_date": "2026-04-18",
            "pre_gst_amount": "15000.00",
            "cgst": "0.00", "sgst": "0.00", "igst": "0.00",
            "total_amount": "15000.00",
            "business_purpose": "SoD test submission",
        }, format="json")
        bill_id = resp.data["id"]

        # tv_emp tries to approve their own bill
        r = self.client.post(f"/api/v1/invoices/finance/bills/{bill_id}/approve/", {"reason": "self approve"}, format="json")
        self.assertIn(r.status_code, [403, 400], "Submitter must not be able to approve own bill")

    def test_l2_cannot_approve_before_l1(self):
        """L2 must not be able to approve when bill is at PENDING_L1."""
        token_for(self.client, "tv_vendor")
        resp = self._submit_bill("15000.00")
        bill_id = resp.data["id"]

        token_for(self.client, "tv_l2")
        r = self.client.post(f"/api/v1/invoices/finance/bills/{bill_id}/approve/", {"reason": "jumping the queue"}, format="json")
        self.assertIn(r.status_code, [403, 400])

    def test_mark_paid_requires_utr(self):
        """Mark-paid must reject request if UTR is not provided."""
        token_for(self.client, "tv_vendor")
        resp = self._submit_bill("15000.00")
        bill_id = resp.data["id"]

        # Fast forward to PAYMENT_INITIATED
        for username in ["tv_l1", "tv_l2", "tv_hod", "tv_fin1", "tv_fin2"]:
            token_for(self.client, username)
            self.client.post(f"/api/v1/invoices/finance/bills/{bill_id}/approve/", {"reason": "ok"}, format="json")
        token_for(self.client, "tv_fin_admin")
        self.client.post(f"/api/v1/invoices/finance/bills/{bill_id}/initiate-payment/", {}, format="json")

        r = self.client.post(f"/api/v1/invoices/finance/bills/{bill_id}/mark-paid/", {"utr": ""}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("UTR", str(r.data))

    def test_vendor_cannot_see_other_vendor_bills(self):
        """Vendor must only see their own bills, not another vendor's."""
        # vendor1 submits a bill
        token_for(self.client, "tv_vendor")
        resp = self._submit_bill("15000.00")
        bill_id = resp.data["id"]

        # Create another vendor
        other_vendor_user = make_user("tv_other_vendor", "vendor")
        r = self.client.post("/api/v1/auth/login/", {"username": "tv_other_vendor", "password": "test1234!"}, format="json")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {r.data['access']}")

        r = self.client.get(f"/api/v1/invoices/vendor/bills/{bill_id}/")
        self.assertEqual(r.status_code, 403)

    def test_policy_limits_only_finance_admin_or_cfo_can_set(self):
        """Only Finance Admin or CFO can configure approval policy limits."""
        # L1 approver tries to set a policy limit → must fail
        token_for(self.client, "tv_l1")
        r = self.client.post("/api/v1/invoices/policy-limits/", {"role": "FIN_L2", "max_amount": "50000"}, format="json")
        self.assertEqual(r.status_code, 403)

        # Finance Admin can set
        token_for(self.client, "tv_fin_admin")
        r = self.client.post("/api/v1/invoices/policy-limits/", {"role": "FIN_L2", "max_amount": "30000"}, format="json")
        self.assertIn(r.status_code, [200, 201])


# ── 9. Policy Limits CRUD ─────────────────────────────────────────────────────

class TestPolicyLimitsCRUD(BaseFlowTest):
    """Finance Admin / CFO can read and write approval limits."""

    def test_get_policy_limits(self):
        """Finance Admin can list all policy limits."""
        token_for(self.client, "tv_fin_admin")
        r = self.client.get("/api/v1/invoices/policy-limits/")
        self.assertEqual(r.status_code, 200)
        roles = [lim["role"] for lim in r.data]
        self.assertIn("FIN_L2", roles)
        self.assertIn("FIN_HEAD", roles)
        self.assertIn("CFO", roles)

    def test_operational_roles_not_settable(self):
        """Setting limits for L1, L2, HOD, FIN_L1 must be rejected."""
        token_for(self.client, "tv_fin_admin")
        for invalid_role in ["EMP_L1", "EMP_L2", "DEPT_HEAD", "FIN_L1"]:
            r = self.client.post("/api/v1/invoices/policy-limits/", {"role": invalid_role, "max_amount": "10000"}, format="json")
            self.assertEqual(r.status_code, 400, f"Should reject limit for {invalid_role}")

    def test_cfo_can_update_limit(self):
        """CFO can update Finance L2 limit."""
        token_for(self.client, "tv_cfo")
        r = self.client.post("/api/v1/invoices/policy-limits/", {"role": "FIN_L2", "max_amount": "40000", "notes": "Updated by CFO"}, format="json")
        self.assertIn(r.status_code, [200, 201])
        self.assertEqual(str(r.data["max_amount"]), "40000.00" if "." in str(r.data["max_amount"]) else "40000")


# ── 10. DB Consistency Check ──────────────────────────────────────────────────

class TestDBConsistency(BaseFlowTest):
    """After submission and approvals, current_step must always be consistent."""

    def test_current_step_matches_status_after_each_transition(self):
        """current_step must equal the active step level after every approval."""
        from apps.invoices.models import STEP_TO_STATUS
        status_to_step = {v: k for k, v in STEP_TO_STATUS.items()}

        token_for(self.client, "tv_vendor")
        resp = self._submit_bill("15000.00")
        bill_id = resp.data["id"]

        approvers = ["tv_l1", "tv_l2", "tv_hod", "tv_fin1", "tv_fin2"]
        for username in approvers:
            token_for(self.client, username)
            r = self.client.post(f"/api/v1/invoices/finance/bills/{bill_id}/approve/", {"reason": "ok"}, format="json")
            self.assertEqual(r.status_code, 200)

            expense = Expense.objects.get(pk=bill_id)
            status = expense.status
            expected_step = status_to_step.get(status)
            if expected_step:
                self.assertEqual(
                    expense.current_step, expected_step,
                    f"After transition to {status}: current_step={expense.current_step}, expected={expected_step}"
                )

    def test_no_orphan_pending_steps_after_rejection(self):
        """After rejection, no further approver should see the bill in their queue."""
        token_for(self.client, "tv_vendor")
        resp = self._submit_bill("15000.00")
        bill_id = resp.data["id"]

        # L1 approves, L2 rejects
        token_for(self.client, "tv_l1")
        self.client.post(f"/api/v1/invoices/finance/bills/{bill_id}/approve/", {"reason": "ok"}, format="json")
        token_for(self.client, "tv_l2")
        self.client.post(f"/api/v1/invoices/finance/bills/{bill_id}/reject/", {"reason": "Duplicate invoice found"}, format="json")

        # Check that HOD, fin_l1, fin_l2 queues are all empty for this bill
        for username in ["tv_hod", "tv_fin1", "tv_fin2", "tv_fin_admin"]:
            token_for(self.client, username)
            queue = self.client.get("/api/v1/invoices/finance/bills/queue/")
            ids = [b["id"] for b in queue.data]
            self.assertNotIn(bill_id, ids, f"{username} should not see rejected bill")
