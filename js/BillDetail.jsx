// Tijori AI — Bill / Invoice Detail (Screen 4A)
// Full-page detail — never a drawer

const BILL_DATA = {
  id: 'BILL-2026-00042',
  vendorCode: 'VND-001',
  vendorName: 'TechLogistics Solutions Global',
  vendorName2: 'TechLogistics India',
  gstin: '27AABCT3518Q1ZL',
  pan: 'AABCT3518Q',
  msme: false,
  address: '42, Industrial Area, Phase II',
  address2: 'Near MIDC Gate',
  city: 'Mumbai',
  state: 'Maharashtra',
  pin: '400093',
  phone: '+91 22 4567 8900',
  mobile: '+91 98765 43210',
  email: 'accounts@techlogistics.in',
  website: 'www.techlogistics.in',
  vendorInvoiceNo: 'TL/2026/INV/0842',
  vendorInvoiceDate: 'Apr 10, 2026',
  submitDate: 'Apr 11, 2026',
  dueDate: 'May 10, 2026',
  serviceMonth: 'March 2026',
  orderAddress: 'ADDR-MUM-01',
  locationCode: 'LOC-HQ',
  projectCode: 'PROJ-INFRA-Q1',
  currency: 'INR',
  paymentTerms: 'Net 30',
  hsnCode: '998319',
  expenseCategory: 'Infrastructure',
  basicAmount: 288136,
  gstPct: 18,
  cgst: 25932,
  sgst: 25932,
  igst: 0,
  total: 340000,
  tdsSection: '194C',
  tdsAmount: 5763,
  netPayable: 334237,
  status: 'PENDING_CFO',
  anomalySeverity: 'HIGH',
  department: 'Engineering — CC-001',
  category: 'Infrastructure',
  d365DocNo: null,
  paymentDate: null,
  utr: null,
};

const APPROVAL_STAGES_DATA = [
  { stage: 'Submitted', actor: 'TechLogistics', date: 'Apr 11, 2026 09:15', state: 'done', dept: null, category: null, notes: 'Invoice submitted with all attachments.' },
  { stage: 'L1 Review', actor: 'Priya Mehta', date: 'Apr 11, 2026 14:32', state: 'done', dept: 'Engineering — CC-001', category: 'Infrastructure', notes: 'Approved — charged to Engineering. AI category accepted.' },
  { stage: 'Dept Head Review', actor: 'Dev Kapoor', date: 'Apr 12, 2026 10:20', state: 'done', dept: null, category: null, notes: 'Approved within departmental budget.' },
  { stage: 'Finance L1', actor: 'Kavitha Sharma', date: 'Apr 13, 2026 11:00', state: 'done', dept: null, category: null, notes: 'Finance L1 approved.' },
  { stage: 'Finance L2', actor: null, date: null, state: 'skipped', dept: null, category: null, notes: 'Skipped — amount below Finance L2 threshold.' },
  { stage: 'CFO Approval', actor: 'Rohan Kapoor', date: null, state: 'current', dept: null, category: null, notes: '' },
  { stage: 'Finance Review', actor: null, date: null, state: 'pending', dept: null, category: null, notes: '' },
  { stage: 'ERP Booking', actor: null, date: null, state: 'pending', dept: null, category: null, notes: '' },
  { stage: 'Payment', actor: null, date: null, state: 'pending', dept: null, category: null, notes: '' },
];

const COMMENTS_DATA = [
  { id: 1, user: 'Priya Mehta', role: 'AP Clerk', time: 'Apr 11, 14:35', text: 'Please confirm the PO reference for this invoice. Could not locate matching PO in system.', internal: false, initials: 'PM' },
  { id: 2, user: 'TechLogistics', role: 'Vendor', time: 'Apr 11, 16:20', text: 'The service was rendered under a blanket agreement — PO reference: BLA-2026-004. Please check with procurement.', internal: false, initials: 'TL' },
  { id: 3, user: 'Kavitha Sharma', role: 'Finance Manager', time: 'Apr 12, 09:10', text: 'Blanket agreement verified with procurement. Proceeding to approval.', internal: true, initials: 'KS' },
];

const ATTACHMENTS_DATA = [
  { name: 'Invoice_TL_0842.pdf', size: '342 KB', type: 'pdf', uploader: 'TechLogistics', date: 'Apr 11' },
  { name: 'GST_Certificate.pdf', size: '128 KB', type: 'pdf', uploader: 'TechLogistics', date: 'Apr 11' },
  { name: 'Service_Completion.pdf', size: '512 KB', type: 'pdf', uploader: 'Priya Mehta', date: 'Apr 11' },
];

const GST_CHECKS = [
  { label: 'GSTIN Format Valid', result: true, note: '27AABCT3518Q1ZL — 15-char format ✓' },
  { label: 'GSTIN Active (GSTN portal)', result: true, note: 'Last verified Apr 11, 2026' },
  { label: 'TDS Section Applicable', result: true, note: '194C — Contractors' },
  { label: 'HSN/SAC Code Valid', result: true, note: '998319 — IT infrastructure services' },
  { label: 'GST % matches HSN', result: true, note: '18% confirmed for 998319' },
  { label: 'Reverse Charge Applicable', result: false, note: 'Not applicable' },
  { label: 'Budget Code Matched', result: true, note: 'Engineering Q3 FY26 — CC-001' },
  { label: 'PO Reference', result: 'warn', note: 'No PO linked — blanket agreement BLA-2026-004 used' },
];

const FINANCE_CHECKLIST = [
  { label: 'GST compliance verified', done: false },
  { label: 'TDS section confirmed', done: false },
  { label: 'Budget code assigned and headroom confirmed', done: false },
  { label: 'PO match verified (or manual override approved)', done: false },
  { label: 'Duplicate invoice check passed', done: false },
  { label: 'Vendor bank details verified', done: false },
];

const BillDetailScreen = ({ onNavigate, role: propRole, billId }) => {
  const [approveOpen, setApproveOpen] = React.useState(false);
  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [queryOpen, setQueryOpen] = React.useState(false);
  const [paymentOpen, setPaymentOpen] = React.useState(false);
  const [expandedStage, setExpandedStage] = React.useState(null);
  const [commentText, setCommentText] = React.useState('');
  const [isInternal, setIsInternal] = React.useState(false);
  const [comments, setComments] = React.useState(COMMENTS_DATA);
  const [finChecklist, setFinChecklist] = React.useState(FINANCE_CHECKLIST);
  const [rejectReason, setRejectReason] = React.useState('');
  const [queryText, setQueryText] = React.useState('');

  const currentRole = propRole || localStorage.getItem('tj_role') || 'CFO';
  const isVendor = currentRole === 'Vendor';
  const isFinanceAdmin = currentRole === 'Finance Admin';
  const isInternal2 = !isVendor;

  const bill = BILL_DATA;
  const fmtINR = (n) => '₹' + n.toLocaleString('en-IN');

  const stageIcon = (state) => {
    if (state === 'done') return { bg: '#10B981', color: 'white', icon: '✓' };
    if (state === 'current') return { bg: '#E8783B', color: 'white', icon: '●', pulse: true };
    if (state === 'skipped') return { bg: '#F1F5F9', color: '#CBD5E1', icon: '—' };
    return { bg: '#F1F5F9', color: '#94A3B8', icon: '' };
  };

  const allChecked = finChecklist.every(c => c.done);

  const postComment = () => {
    if (!commentText.trim()) return;
    setComments(c => [...c, {
      id: c.length + 1, user: currentRole, role: currentRole,
      time: 'Just now', text: commentText, internal: isInternal,
      initials: currentRole.substring(0, 2).toUpperCase()
    }]);
    setCommentText('');
  };

  // Vendor simplified stages
  const vendorStages = ['Submitted', 'Under Review', 'Approved', 'Processing', 'Paid'];

  return (
    <div style={{ padding: '0', position: 'relative' }}>
      {/* Sticky header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'white', borderBottom: '1px solid #E2E8F0', padding: '14px 28px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button onClick={() => onNavigate && onNavigate('ap-hub')}
          style={{ fontSize: '13px', color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 10px', borderRadius: '8px', transition: 'background 150ms' }}
          onMouseEnter={e => e.currentTarget.style.background = '#F8F7F5'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}>
          ← AP Hub
        </button>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '18px', color: '#E8783B', fontWeight: 500 }}>{bill.id}</span>
          <StatusBadge status={bill.status} />
          {bill.anomalySeverity && (
            <span style={{ background: '#FEE2E2', color: '#991B1B', padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'flex', alignItems: 'center', gap: '5px', animation: 'dotPulse 2s ease infinite' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF4444', display: 'inline-block' }} />
              {bill.anomalySeverity} RISK
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {!isVendor && <Btn variant="green" small onClick={() => setApproveOpen(true)}>Approve</Btn>}
          {!isVendor && <Btn variant="destructive" small onClick={() => setRejectOpen(true)}>Reject</Btn>}
          {!isVendor && <Btn variant="purple" small onClick={() => setQueryOpen(true)}>Raise Query</Btn>}
          {isFinanceAdmin && <Btn variant="primary" small onClick={() => setPaymentOpen(true)}>Record Payment</Btn>}
          <button style={{ width: 32, height: 32, border: '1.5px solid #E2E8F0', borderRadius: '8px', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', color: '#64748B' }}>⋮</button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: '0', minHeight: 'calc(100vh - 130px)' }}>

        {/* LEFT COLUMN */}
        <div style={{ padding: '24px 24px 40px 28px', display: 'flex', flexDirection: 'column', gap: '20px', borderRight: '1px solid #F1F0EE' }}>

          {/* Section A — Invoice Details */}
          <Card style={{ padding: '24px' }}>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '17px', color: '#0F172A', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Invoice Details
              <span style={{ background: '#FEF3C7', color: '#92400E', padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{bill.expenseCategory}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px', marginBottom: '20px' }}>
              {[
                { l: 'Document No.', v: bill.id, mono: true },
                { l: 'Vendor Invoice No.', v: bill.vendorInvoiceNo, mono: true },
                { l: 'Invoice Date', v: bill.vendorInvoiceDate },
                { l: 'Service Month', v: bill.serviceMonth },
                { l: 'Submit Date', v: bill.submitDate },
                { l: 'Due Date', v: bill.dueDate, overdue: false },
                { l: 'HSN / SAC Code', v: bill.hsnCode, mono: true },
                { l: 'Payment Terms', v: bill.paymentTerms },
                { l: 'Currency', v: bill.currency },
                { l: 'TDS Section', v: bill.tdsSection, mono: true },
              ].map(f => (
                <div key={f.l}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '3px' }}>{f.l}</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', fontFamily: f.mono ? "'JetBrains Mono', monospace" : "'Plus Jakarta Sans', sans-serif" }}>{f.v}</div>
                </div>
              ))}
            </div>

            {/* Amount breakdown */}
            <div style={{ background: '#F8F7F5', borderRadius: '12px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {[
                    { l: 'Basic Amount (Pre-GST)', v: fmtINR(bill.basicAmount), color: '#0F172A' },
                    { l: `CGST (${bill.gstPct / 2}%)`, v: fmtINR(bill.cgst), color: '#64748B' },
                    { l: `SGST (${bill.gstPct / 2}%)`, v: fmtINR(bill.sgst), color: '#64748B' },
                    { l: 'IGST (0%)', v: '₹0', color: '#94A3B8' },
                  ].map(r => (
                    <tr key={r.l} style={{ borderBottom: '1px solid #F1F0EE' }}>
                      <td style={{ padding: '10px 16px', fontSize: '13px', color: r.color, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{r.l}</td>
                      <td style={{ padding: '10px 16px', fontSize: '13px', fontWeight: 600, color: r.color, fontFamily: "'Plus Jakarta Sans', sans-serif", textAlign: 'right' }}>{r.v}</td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: '2px solid #E2E8F0', background: '#FFF7ED' }}>
                    <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 700, color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Total Invoice Value</td>
                    <td style={{ padding: '12px 16px', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '20px', color: '#E8783B', letterSpacing: '-1px', textAlign: 'right' }}>{fmtINR(bill.total)}</td>
                  </tr>
                  <tr style={{ borderTop: '1px solid #F1F0EE' }}>
                    <td style={{ padding: '10px 16px', fontSize: '13px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>TDS Deduction ({bill.tdsSection})</td>
                    <td style={{ padding: '10px 16px', fontSize: '13px', fontWeight: 600, color: '#EF4444', fontFamily: "'Plus Jakarta Sans', sans-serif", textAlign: 'right' }}>− {fmtINR(bill.tdsAmount)}</td>
                  </tr>
                  <tr style={{ borderTop: '2px solid #BBF7D0', background: '#F0FDF4' }}>
                    <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 700, color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Net Payable</td>
                    <td style={{ padding: '12px 16px', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '20px', color: '#10B981', letterSpacing: '-1px', textAlign: 'right' }}>{fmtINR(bill.netPayable)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>

          {/* Section B — Vendor Card */}
          <Card style={{ padding: '22px', borderLeft: '4px solid #E8783B' }}>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '17px', color: '#0F172A', marginBottom: '14px' }}>Vendor</div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '16px' }}>
              <div style={{ width: 48, height: 48, borderRadius: '12px', background: 'linear-gradient(135deg, #E8783B, #FF6B35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '16px', color: 'white', flexShrink: 0 }}>TL</div>
              <div>
                <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '18px', color: '#0F172A', letterSpacing: '-0.5px' }}>{bill.vendorName}</div>
                <div style={{ fontSize: '12px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{bill.vendorName2}</div>
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                  <span style={{ background: '#F1F5F9', color: '#475569', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{bill.gstin}</span>
                  <span style={{ background: '#F1F5F9', color: '#475569', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>PAN: {bill.pan.substring(0, 5)}****{bill.pan.slice(-1)}</span>
                  <StatusBadge status="ACTIVE" />
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#64748B' }}>
              <div>{bill.address}, {bill.address2}</div>
              <div>{bill.city}, {bill.state} — {bill.pin}</div>
              <div>📞 {bill.phone}</div>
              <div>✉ {bill.email}</div>
            </div>
            {isInternal2 && !isVendor && (
              <div style={{ marginTop: '14px', padding: '12px', background: '#F8F7F5', borderRadius: '10px', fontSize: '12px', color: '#475569', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Bank Details (Internal)</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#0F172A' }}>HDFC Bank · IFSC: HDFC0001234 · A/C: •••• •••• 4521</div>
              </div>
            )}
          </Card>

          {/* Section C — GST & Compliance */}
          <Card style={{ padding: '22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '17px', color: '#0F172A' }}>GST & Tax Compliance</div>
              <AIBadge />
              {isVendor ? (
                <span style={{ background: '#D1FAE5', color: '#065F46', padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>AI Verified</span>
              ) : (
                <span style={{ background: '#FEF3C7', color: '#92400E', padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>1 Item Needs Review</span>
              )}
            </div>

            {isVendor ? (
              <div style={{ padding: '14px 16px', background: '#F0FDF4', borderRadius: '10px', fontSize: '13px', color: '#065F46', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600 }}>
                ✓ Compliance Status: Verified — All GST checks passed
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {GST_CHECKS.map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: i < GST_CHECKS.length - 1 ? '1px solid #F8F7F5' : 'none' }}>
                    <span style={{ fontSize: '16px', flexShrink: 0 }}>{c.result === true ? '✅' : c.result === 'warn' ? '⚠️' : '❌'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{c.label}</div>
                      <div style={{ fontSize: '11px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{c.note}</div>
                    </div>
                    {c.result === 'warn' && isFinanceAdmin && (
                      <button style={{ fontSize: '11px', color: '#E8783B', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Fix →</button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Section D — Attachments */}
          <Card style={{ padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '17px', color: '#0F172A' }}>Attachments</div>
                <span style={{ background: '#F1F5F9', color: '#475569', padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{ATTACHMENTS_DATA.length}</span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '12px' }}>
              {ATTACHMENTS_DATA.map((a, i) => (
                <div key={i} style={{ border: '1.5px solid #F1F0EE', borderRadius: '10px', padding: '12px', cursor: 'pointer', transition: 'all 150ms', background: '#FAFAF8' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#E8783B'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#F1F0EE'; e.currentTarget.style.transform = 'none'; }}>
                  <div style={{ fontSize: '24px', marginBottom: '6px' }}>📄</div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</div>
                  <div style={{ fontSize: '10px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{a.size} · {a.uploader} · {a.date}</div>
                </div>
              ))}
            </div>
            <div style={{ border: '1.5px dashed #E2E8F0', borderRadius: '10px', padding: '14px', textAlign: 'center', cursor: 'pointer', transition: 'border-color 150ms' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#E8783B'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#E2E8F0'}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>📎 Add Attachment</div>
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ padding: '24px 28px 40px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Section E — Approval Timeline */}
          <Card style={{ padding: '22px' }}>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '17px', color: '#0F172A', marginBottom: '20px' }}>Approval Timeline</div>

            <div style={{ position: 'relative', paddingLeft: '16px' }}>
              {/* Vertical line */}
              <div style={{ position: 'absolute', left: 11, top: 14, bottom: 14, width: 2, background: 'linear-gradient(to bottom, #10B981, #E8783B44)' }} />

              {(isVendor ? vendorStages.map((s, i) => ({ stage: s, state: i === 0 ? 'done' : i === 1 ? 'current' : 'pending', actor: null, date: null, notes: '', dept: null, category: null })) : APPROVAL_STAGES_DATA).map((s, i, arr) => {
                const ic = stageIcon(s.state);
                const isExpanded = expandedStage === i;
                return (
                  <div key={i} style={{ display: 'flex', gap: '12px', marginBottom: i < arr.length - 1 ? '0' : '0', paddingBottom: i < arr.length - 1 ? '4px' : '0' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: ic.bg, border: `2px solid ${s.state === 'pending' || s.state === 'skipped' ? '#E2E8F0' : ic.bg}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: ic.color, fontWeight: 700, animation: ic.pulse ? 'dotPulse 2s ease infinite' : 'none', transition: 'all 200ms', zIndex: 1, position: 'relative' }}>
                        {s.state === 'current' ? <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'white', display: 'block' }} /> : ic.icon}
                      </div>
                      {i < arr.length - 1 && <div style={{ width: 2, flex: 1, minHeight: 20, background: 'transparent' }} />}
                    </div>

                    <div style={{ flex: 1, paddingBottom: i < arr.length - 1 ? '16px' : '0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', cursor: s.state === 'done' ? 'pointer' : 'default' }}
                        onClick={() => s.state === 'done' && setExpandedStage(isExpanded ? null : i)}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: s.state === 'current' ? 700 : 600, color: s.state === 'pending' || s.state === 'skipped' ? '#94A3B8' : '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{s.stage}</div>
                          {s.actor && <div style={{ fontSize: '11px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif", marginTop: '1px' }}>by {s.actor}</div>}
                          {/* Tags */}
                          {s.dept && (
                            <div style={{ display: 'flex', gap: '5px', marginTop: '4px', flexWrap: 'wrap' }}>
                              <span style={{ background: '#FFF7ED', color: '#E8783B', border: '1px solid #FED7AA', padding: '1px 7px', borderRadius: '6px', fontSize: '10px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Dept: {s.dept.split(' —')[0]}</span>
                              {s.category && <span style={{ background: '#F5F3FF', color: '#5B21B6', border: '1px solid #EDE9FE', padding: '1px 7px', borderRadius: '6px', fontSize: '10px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Cat: {s.category}</span>}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                          {s.date && <span style={{ fontSize: '10px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif", whiteSpace: 'nowrap' }}>{s.date}</span>}
                          {s.state === 'skipped' && <span style={{ background: '#F1F5F9', color: '#94A3B8', padding: '1px 7px', borderRadius: '999px', fontSize: '10px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Skipped</span>}
                          {s.state === 'current' && <span style={{ background: '#FFF7ED', color: '#E8783B', padding: '1px 7px', borderRadius: '999px', fontSize: '10px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", animation: 'dotPulse 2s ease infinite' }}>In Progress</span>}
                          {s.state === 'done' && <span style={{ fontSize: '10px', color: '#10B981', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>↓ expand</span>}
                        </div>
                      </div>
                      {isExpanded && s.notes && (
                        <div style={{ marginTop: '8px', padding: '10px 12px', background: '#F8F7F5', borderRadius: '8px', fontSize: '12px', color: '#475569', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.5, animation: 'fadeUp 200ms ease' }}>
                          {s.notes}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Section F — Finance Review (internal only) */}
          {!isVendor && (
            <Card style={{ padding: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '16px', color: '#0F172A' }}>Finance Review</div>
                <span style={{ background: '#FEF3C7', color: '#92400E', padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Pending</span>
              </div>
              <div style={{ fontSize: '12px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '14px' }}>Complete this checklist before ERP booking.</div>
              {finChecklist.map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: i < finChecklist.length - 1 ? '1px solid #F8F7F5' : 'none' }}>
                  <div onClick={() => isFinanceAdmin && setFinChecklist(f => f.map((x, idx) => idx === i ? { ...x, done: !x.done } : x))}
                    style={{ width: 18, height: 18, borderRadius: '4px', border: `2px solid ${c.done ? '#10B981' : '#E2E8F0'}`, background: c.done ? '#10B981' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isFinanceAdmin ? 'pointer' : 'default', flexShrink: 0, transition: 'all 150ms' }}>
                    {c.done && <span style={{ color: 'white', fontSize: '10px', fontWeight: 700 }}>✓</span>}
                  </div>
                  <span style={{ fontSize: '12px', color: c.done ? '#94A3B8' : '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif", textDecoration: c.done ? 'line-through' : 'none' }}>{c.label}</span>
                </div>
              ))}
              {isFinanceAdmin && (
                <div style={{ marginTop: '14px' }}>
                  <Btn variant="primary" disabled={!allChecked} style={{ width: '100%', justifyContent: 'center', opacity: allChecked ? 1 : 0.4 }}>
                    Clear for ERP →
                  </Btn>
                  {!allChecked && <div style={{ fontSize: '11px', color: '#94A3B8', textAlign: 'center', marginTop: '6px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Complete all checks to enable</div>}
                </div>
              )}
            </Card>
          )}

          {/* Section G — ERP & Payment (internal only) */}
          {!isVendor && (
            <Card style={{ padding: '22px' }}>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '16px', color: '#0F172A', marginBottom: '16px' }}>ERP Booking & Payment</div>

              {/* ERP */}
              <div style={{ padding: '14px', background: '#F8F7F5', borderRadius: '10px', marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '8px' }}>ERP Booking (D365)</div>
                {bill.d365DocNo ? (
                  <div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', color: '#10B981', fontWeight: 500 }}>{bill.d365DocNo}</div>
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Not yet booked in ERP — awaiting CFO approval.</div>
                )}
                {isFinanceAdmin && !bill.d365DocNo && (
                  <div style={{ marginTop: '10px' }}>
                    <Btn variant="secondary" small>Book in ERP</Btn>
                  </div>
                )}
              </div>

              {/* Payment */}
              <div style={{ padding: '14px', background: '#F8F7F5', borderRadius: '10px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '8px' }}>Payment</div>
                {bill.utr ? (
                  <div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', color: '#10B981' }}>{bill.utr}</div>
                    <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Paid on {bill.paymentDate}</div>
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Payment pending — bill not yet cleared.</div>
                )}
                {isFinanceAdmin && !bill.utr && (
                  <div style={{ marginTop: '10px' }}>
                    <Btn variant="green" small onClick={() => setPaymentOpen(true)}>Record Payment</Btn>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Section H — Comments Thread */}
          <Card style={{ padding: '22px' }}>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '16px', color: '#0F172A', marginBottom: '16px' }}>Comments</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px', maxHeight: 280, overflow: 'auto' }}>
              {comments.filter(c => isInternal2 || !c.internal).map((c, i) => (
                <div key={c.id} style={{ padding: '12px 14px', borderRadius: '10px', background: c.internal ? '#FFF7ED' : '#F8F7F5', border: c.internal ? '1px solid #FED7AA' : '1px solid #F1F0EE' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <div style={{ width: 26, height: 26, borderRadius: '6px', background: 'linear-gradient(135deg, #E8783B, #FF6B35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800, color: 'white', fontFamily: "'Bricolage Grotesque', sans-serif", flexShrink: 0 }}>{c.initials}</div>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{c.user}</span>
                      <span style={{ margin: '0 6px', fontSize: '10px', color: '#94A3B8' }}>·</span>
                      <span style={{ background: '#F1F5F9', color: '#64748B', padding: '1px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{c.role}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {c.internal && <span style={{ fontSize: '10px' }}>🔒</span>}
                      <span style={{ fontSize: '10px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{c.time}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: '13px', color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.55 }}>{c.text}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <textarea value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Add a comment…"
                rows={3} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E2E8F0', borderRadius: '10px', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', outline: 'none', resize: 'none', background: '#FAFAF8' }}
                onFocus={e => e.target.style.borderColor = '#E8783B'} onBlur={e => e.target.style.borderColor = '#E2E8F0'} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {isInternal2 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => setIsInternal(!isInternal)}>
                    <div style={{ width: 32, height: 18, borderRadius: 9, background: isInternal ? '#E8783B' : '#E2E8F0', position: 'relative', transition: 'background 200ms' }}>
                      <div style={{ width: 13, height: 13, borderRadius: '50%', background: 'white', position: 'absolute', top: 2.5, left: isInternal ? 16 : 2.5, transition: 'left 200ms', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} />
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: isInternal ? '#E8783B' : '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>🔒 Internal note</span>
                  </div>
                )}
                <Btn variant="primary" small onClick={postComment}>Post</Btn>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Approve Modal */}
      <TjModal open={approveOpen} onClose={() => setApproveOpen(false)} title="✓ Approve Bill" accentColor="#065F46" width={480}>
        <div style={{ background: '#F8F7F5', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#E8783B' }}>{bill.id}</div>
          <div style={{ fontWeight: 600, fontSize: '14px', color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif", marginTop: '2px' }}>{bill.vendorName}</div>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '22px', color: '#10B981', letterSpacing: '-1px', marginTop: '4px' }}>{fmtINR(bill.total)}</div>
        </div>
        <TjTextarea label="Approval Notes (optional)" placeholder="Add notes for the approval record…" rows={3} />
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <Btn variant="secondary" onClick={() => setApproveOpen(false)}>Cancel</Btn>
          <Btn variant="green" onClick={() => setApproveOpen(false)}>Confirm Approval</Btn>
        </div>
      </TjModal>

      {/* Reject Modal */}
      <TjModal open={rejectOpen} onClose={() => setRejectOpen(false)} title="✕ Reject Bill" accentColor="#991B1B" width={480}>
        <div style={{ background: '#FEF2F2', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#EF4444' }}>{bill.id}</div>
          <div style={{ fontWeight: 600, fontSize: '14px', color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif", marginTop: '2px' }}>{bill.vendorName}</div>
        </div>
        <TjTextarea label="Reason for Rejection *" placeholder="Minimum 10 characters required…" value={rejectReason} onChange={e => setRejectReason(e.target.value)} required rows={4} />
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <Btn variant="secondary" onClick={() => setRejectOpen(false)}>Cancel</Btn>
          <Btn variant="destructive" onClick={() => setRejectOpen(false)} disabled={rejectReason.length < 10}>Confirm Rejection</Btn>
        </div>
      </TjModal>

      {/* Query Modal */}
      <TjModal open={queryOpen} onClose={() => setQueryOpen(false)} title="? Raise Query to Vendor" accentColor="#5B21B6" width={480}>
        <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px', fontSize: '12px', color: '#92400E', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Query will be sent to the vendor. Internal dept/category details are NOT included.
        </div>
        <TjTextarea label="Query for Vendor" placeholder="What clarification do you need?" value={queryText} onChange={e => setQueryText(e.target.value)} rows={4} />
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <Btn variant="secondary" onClick={() => setQueryOpen(false)}>Cancel</Btn>
          <Btn variant="purple" onClick={() => setQueryOpen(false)}>Send Query to Vendor</Btn>
        </div>
      </TjModal>

      {/* Record Payment Modal */}
      <TjModal open={paymentOpen} onClose={() => setPaymentOpen(false)} title="Record Payment" accentColor="#065F46" width={440}>
        <TjInput label="UTR No. *" placeholder="Bank transfer reference number" />
        <TjInput label="Payment Date" type="date" />
        <TjInput label="Payment Amount (₹)" placeholder={String(bill.netPayable)} type="number" />
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <Btn variant="secondary" onClick={() => setPaymentOpen(false)}>Cancel</Btn>
          <Btn variant="green" onClick={() => setPaymentOpen(false)}>Confirm Payment</Btn>
        </div>
      </TjModal>
    </div>
  );
};

Object.assign(window, { BillDetailScreen });
