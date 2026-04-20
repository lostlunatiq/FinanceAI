// Tijori AI — Accounts Receivable (Dashboard + Raise Invoice + Customer Detail)

const AR_INVOICES = [
  { id: 'AR-2024-108', customer: 'Global Tech Solutions', amount: '₹3,40,000', issued: 'Apr 10', due: 'May 10', age: 9, status: 'UNPAID' },
  { id: 'AR-2024-107', customer: 'Meridian Industries', amount: '₹1,20,000', issued: 'Mar 25', due: 'Apr 24', age: 25, status: 'OVERDUE' },
  { id: 'AR-2024-106', customer: 'Acme Corporation', amount: '₹6,80,000', issued: 'Mar 15', due: 'Apr 14', age: 35, status: 'OVERDUE' },
  { id: 'AR-2024-105', customer: 'SkyBridge Ventures', amount: '₹92,500', issued: 'Mar 01', due: 'Mar 31', age: 49, status: 'PARTIALLY_PAID' },
  { id: 'AR-2024-104', customer: 'NovaTech Ltd.', amount: '₹2,15,000', issued: 'Feb 20', due: 'Mar 21', age: 29, status: 'PAID' },
  { id: 'AR-2024-103', customer: 'Global Tech Solutions', amount: '₹1,80,000', issued: 'Feb 10', due: 'Mar 11', age: 39, status: 'DISPUTED' },
];

const AR_CUSTOMERS = [
  { id: 'CUS-001', name: 'Global Tech Solutions', gstin: '27AABCG1234K1ZL', outstanding: '₹5,20,000', overdue: '₹1,80,000', avgDays: 32, status: 'ACTIVE', terms: 'Net 30' },
  { id: 'CUS-002', name: 'Meridian Industries', gstin: '29AABCM5678R1ZP', outstanding: '₹1,20,000', overdue: '₹1,20,000', avgDays: 41, status: 'ACTIVE', terms: 'Net 30' },
  { id: 'CUS-003', name: 'Acme Corporation', gstin: '06AABCA9012N1ZA', outstanding: '₹6,80,000', overdue: '₹6,80,000', avgDays: 55, status: 'ON_HOLD', terms: 'Net 45' },
  { id: 'CUS-004', name: 'SkyBridge Ventures', gstin: '24AABCS3456P1ZD', outstanding: '₹92,500', overdue: '₹0', avgDays: 22, status: 'ACTIVE', terms: 'Net 30' },
];

const AR_ACTIVITY = [
  { type: 'payment', text: '₹2,15,000 received from NovaTech Ltd. against AR-2024-104', time: '2h ago', color: '#10B981' },
  { type: 'reminder', text: 'Payment reminder sent to Acme Corporation — 35 days overdue', time: '5h ago', color: '#94A3B8' },
  { type: 'invoice', text: 'Invoice AR-2024-108 raised for ₹3,40,000 to Global Tech Solutions', time: 'Yesterday', color: '#E8783B' },
  { type: 'dispute', text: 'Dispute raised on AR-2024-103 by Global Tech Solutions — under review', time: 'Yesterday', color: '#8B5CF6' },
  { type: 'reminder', text: 'Payment reminder sent to Meridian Industries — 25 days overdue', time: '2d ago', color: '#94A3B8' },
  { type: 'payment', text: '₹46,250 partial payment received from SkyBridge Ventures', time: '3d ago', color: '#10B981' },
];

const ageColor = (days) => days > 90 ? '#EF4444' : days > 60 ? '#E8783B' : days > 30 ? '#F59E0B' : '#10B981';
const ageBg = (days) => days > 90 ? '#FEE2E2' : days > 60 ? '#FFF7ED' : days > 30 ? '#FEF3C7' : '#D1FAE5';
const arStatusConfig = {
  UNPAID: { bg: '#FEF3C7', color: '#92400E', label: 'Unpaid' },
  OVERDUE: { bg: '#FEE2E2', color: '#991B1B', label: 'Overdue', pulse: true },
  PARTIALLY_PAID: { bg: '#DBEAFE', color: '#1E40AF', label: 'Partially Paid' },
  PAID: { bg: '#D1FAE5', color: '#065F46', label: 'Paid' },
  DISPUTED: { bg: '#EDE9FE', color: '#5B21B6', label: 'Disputed' },
  ACTIVE: { bg: '#D1FAE5', color: '#065F46', label: 'Active' },
  ON_HOLD: { bg: '#FEF3C7', color: '#92400E', label: 'On Hold' },
};

const ARStatusBadge = ({ status }) => {
  const cfg = arStatusConfig[status] || { bg: '#F1F5F9', color: '#475569', label: status };
  return (
    <span style={{ background: cfg.bg, color: cfg.color, padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '0.04em', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
      {cfg.pulse && <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.color, display: 'inline-block', animation: 'dotPulse 1.5s ease infinite' }} />}
      {cfg.label}
    </span>
  );
};

// ─── AR DASHBOARD ─────────────────────────────────────────────────────────────

const ARScreen = ({ onNavigate }) => {
  const [filter, setFilter] = React.useState('All');
  const [customerDetail, setCustomerDetail] = React.useState(null);
  const [recordPaymentModal, setRecordPaymentModal] = React.useState(null);

  const filtered = AR_INVOICES.filter(inv => filter === 'All' || inv.status === filter.toUpperCase().replace(' ', '_'));

  // Aging chart data
  const customers = ['Global Tech', 'Meridian Ind.', 'Acme Corp', 'SkyBridge', 'NovaTech'];
  const agingData = [
    { name: 'Global Tech', '0-30': 340000, '31-60': 0, '61-90': 0, '>90': 180000 },
    { name: 'Meridian', '0-30': 0, '31-60': 120000, '61-90': 0, '>90': 0 },
    { name: 'Acme Corp', '0-30': 0, '31-60': 0, '61-90': 680000, '>90': 0 },
    { name: 'SkyBridge', '0-30': 92500, '31-60': 0, '61-90': 0, '>90': 0 },
    { name: 'NovaTech', '0-30': 0, '31-60': 215000, '61-90': 0, '>90': 0 },
  ];
  const maxVal = Math.max(...agingData.map(d => d['0-30'] + d['31-60'] + d['61-90'] + d['>90']));
  const bucketColors = { '0-30': '#10B981', '31-60': '#F59E0B', '61-90': '#E8783B', '>90': '#EF4444' };

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '32px', color: '#0F172A', letterSpacing: '-1.5px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            Accounts Receivable <span style={{ fontSize: '24px' }}>→</span>
          </h1>
          <div style={{ fontSize: '13px', color: '#64748B', marginTop: '4px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Track outgoing invoices, customer payments, and collections.</div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Btn variant="secondary">AR Aging Report ↓</Btn>
          <Btn variant="primary" icon={<span>+</span>} onClick={() => onNavigate && onNavigate('ar-raise')}>Raise Invoice</Btn>
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <KPICard label="Total Outstanding AR" value="₹12.52L" delta="↑ 4.2% MoM" deltaType="negative" color="#E8783B" />
        <KPICard label="Overdue > 30 Days" value="₹8.00L" delta="3 invoices" deltaType="negative" color="#EF4444" pulse />
        <KPICard label="Collected This Month" value="₹2.61L" delta="↑ 18% vs target" deltaType="positive" color="#10B981" />
        <KPICard label="Avg. Days to Pay" value="34" sublabel="Days" delta="↑ 3d vs Q1" deltaType="negative" color="#F59E0B" />
      </div>

      {/* Aging chart */}
      <Card style={{ padding: '24px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '17px', color: '#0F172A' }}>Receivables Aging</div>
            <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>By invoice age bucket · Click customer to drill in</div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            {Object.entries(bucketColors).map(([k, c]) => (
              <span key={k} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 500 }}>
                <span style={{ width: 10, height: 10, borderRadius: '2px', background: c, display: 'inline-block' }} />{k}d
              </span>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {agingData.map(d => {
            const total = d['0-30'] + d['31-60'] + d['61-90'] + d['>90'];
            return (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: 100, fontSize: '12px', fontWeight: 600, color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif", flexShrink: 0, textAlign: 'right' }}>{d.name}</div>
                <div style={{ flex: 1, height: 28, background: '#F8F7F5', borderRadius: 6, overflow: 'hidden', display: 'flex' }}>
                  {Object.entries(bucketColors).map(([bucket, color]) => {
                    const w = (d[bucket] / maxVal) * 100;
                    return w > 0 ? <div key={bucket} style={{ width: `${w}%`, background: color, transition: 'width 600ms ease' }} title={`${bucket}d: ₹${(d[bucket]/100000).toFixed(1)}L`} /> : null;
                  })}
                </div>
                <div style={{ width: 70, fontSize: '12px', fontWeight: 700, color: '#E8783B', fontFamily: "'Bricolage Grotesque', sans-serif", letterSpacing: '-0.5px', flexShrink: 0 }}>
                  ₹{(total / 100000).toFixed(1)}L
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Main 2-col */}
      <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: '20px' }}>
        {/* Outstanding invoices */}
        <Card style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid #F1F0EE', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '17px', color: '#0F172A' }}>Outstanding Invoices</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {['All', 'Unpaid', 'Overdue', 'Partially Paid', 'Disputed'].map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  style={{ padding: '4px 10px', borderRadius: '999px', border: 'none', cursor: 'pointer', fontSize: '10px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", background: filter === f ? '#10B981' : '#F8F7F5', color: filter === f ? 'white' : '#64748B', transition: 'all 150ms' }}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8F7F5' }}>
                {['Invoice #', 'Customer', 'Amount', 'Due Date', 'Age', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '10px', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(inv => (
                <tr key={inv.id} style={{ borderTop: '1px solid #F1F0EE', height: 52, transition: 'background 150ms' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F0FDF4'}
                  onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                  <td style={{ padding: '0 14px', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#10B981', fontWeight: 500 }}>{inv.id}</td>
                  <td style={{ padding: '0 14px', fontSize: '13px', fontWeight: 600, color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{inv.customer}</td>
                  <td style={{ padding: '0 14px', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '14px', color: '#10B981', letterSpacing: '-0.5px' }}>{inv.amount}</td>
                  <td style={{ padding: '0 14px', fontSize: '12px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{inv.due}</td>
                  <td style={{ padding: '0 14px' }}>
                    <span style={{ background: ageBg(inv.age), color: ageColor(inv.age), padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{inv.age}d</span>
                  </td>
                  <td style={{ padding: '0 14px' }}><ARStatusBadge status={inv.status} /></td>
                  <td style={{ padding: '0 14px' }}>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      {inv.status !== 'PAID' && <Btn variant="green" small onClick={() => setRecordPaymentModal(inv)}>Record Payment</Btn>}
                      {inv.status === 'OVERDUE' && <Btn variant="secondary" small>Remind</Btn>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {/* Activity feed */}
        <Card style={{ padding: '22px' }}>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '17px', color: '#0F172A', marginBottom: '16px' }}>Recent Activity</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {AR_ACTIVITY.map((a, i) => (
              <div key={i} style={{ display: 'flex', gap: '10px', padding: '12px 0', borderBottom: i < AR_ACTIVITY.length - 1 ? '1px solid #F8F7F5' : 'none' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: a.color, marginTop: 5, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.5 }}>{a.text}</div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '3px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{a.time}</div>
                </div>
              </div>
            ))}
          </div>
          <button style={{ marginTop: '12px', fontSize: '12px', color: '#10B981', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>View All Activity →</button>
        </Card>
      </div>

      {/* Record Payment Modal */}
      {recordPaymentModal && (
        <TjModal open onClose={() => setRecordPaymentModal(null)} title="Record Payment" accentColor="#065F46" width={440}>
          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#10B981' }}>{recordPaymentModal.id}</div>
            <div style={{ fontWeight: 700, fontSize: '14px', color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif", marginTop: '2px' }}>{recordPaymentModal.customer}</div>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '22px', color: '#10B981', letterSpacing: '-1px', marginTop: '4px' }}>{recordPaymentModal.amount}</div>
          </div>
          <TjInput label="Amount Received (₹)" placeholder="Full or partial amount" />
          <TjInput label="Payment Date" type="date" />
          <TjInput label="UTR / Reference Number" placeholder="Bank transfer reference" />
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <Btn variant="secondary" onClick={() => setRecordPaymentModal(null)}>Cancel</Btn>
            <Btn variant="green" onClick={() => setRecordPaymentModal(null)}>Confirm Payment</Btn>
          </div>
        </TjModal>
      )}
    </div>
  );
};

// ─── RAISE INVOICE ────────────────────────────────────────────────────────────

const ARRaiseScreen = ({ onNavigate }) => {
  const [customer, setCustomer] = React.useState('');
  const [invoiceNo] = React.useState('AR-2024-109');
  const [lines, setLines] = React.useState([
    { desc: '', qty: 1, price: '', tax: 18 }
  ]);

  const addLine = () => setLines(l => [...l, { desc: '', qty: 1, price: '', tax: 18 }]);
  const updateLine = (i, k, v) => setLines(l => l.map((r, idx) => idx === i ? { ...r, [k]: v } : r));
  const subtotal = lines.reduce((s, l) => s + (Number(l.qty) * Number(l.price) || 0), 0);
  const tax = lines.reduce((s, l) => s + ((Number(l.qty) * Number(l.price) || 0) * l.tax / 100), 0);
  const total = subtotal + tax;
  const fmt = (n) => n ? '₹' + n.toLocaleString('en-IN') : '—';

  const selectedCustomer = AR_CUSTOMERS.find(c => c.name === customer);

  return (
    <div style={{ padding: '32px' }}>
      {/* Breadcrumb header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
        <div>
          <div style={{ fontSize: '12px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '6px' }}>
            <span style={{ cursor: 'pointer', color: '#E8783B' }} onClick={() => onNavigate && onNavigate('ar')}>Accounts Receivable</span> › New Invoice
          </div>
          <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '32px', color: '#0F172A', letterSpacing: '-1.5px' }}>New Customer Invoice</h1>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Btn variant="secondary">Save Draft</Btn>
          <Btn variant="primary">Issue Invoice →</Btn>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: '24px' }}>
        {/* Left — Invoice Builder */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Customer */}
          <Card style={{ padding: '22px' }}>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '16px', color: '#0F172A', marginBottom: '14px' }}>Customer</div>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Select Customer</div>
              <select value={customer} onChange={e => setCustomer(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E2E8F0', borderRadius: '10px', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '14px', color: '#0F172A', background: '#FAFAF8', outline: 'none', cursor: 'pointer' }}>
                <option value="">— Search or select customer —</option>
                {AR_CUSTOMERS.map(c => <option key={c.id}>{c.name}</option>)}
              </select>
            </div>
            {selectedCustomer && (
              <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '10px', padding: '12px 14px' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{selectedCustomer.name}</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#64748B', marginTop: '2px' }}>{selectedCustomer.gstin}</div>
                <div style={{ fontSize: '12px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif", marginTop: '4px' }}>Terms: {selectedCustomer.terms} · Outstanding: <span style={{ color: '#E8783B', fontWeight: 700 }}>{selectedCustomer.outstanding}</span></div>
              </div>
            )}
          </Card>

          {/* Invoice details */}
          <Card style={{ padding: '22px' }}>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '16px', color: '#0F172A', marginBottom: '14px' }}>Invoice Details</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Invoice #</div>
                <div style={{ padding: '10px 12px', border: '1.5px solid #E2E8F0', borderRadius: '10px', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', color: '#E8783B', background: '#FAFAF8' }}>{invoiceNo}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Payment Terms</div>
                <select style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E2E8F0', borderRadius: '10px', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', color: '#0F172A', background: '#FAFAF8', outline: 'none' }}>
                  {['Net 15', 'Net 30', 'Net 45', 'Net 60', 'On Receipt'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <TjInput label="Issue Date" type="date" />
              <TjInput label="Due Date" type="date" />
            </div>
            <TjInput label="PO Reference (optional)" placeholder="PO-2024-XXX" />
          </Card>

          {/* Line items */}
          <Card style={{ padding: '22px' }}>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '16px', color: '#0F172A', marginBottom: '14px' }}>Line Items</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px' }}>
              <thead>
                <tr style={{ background: '#F8F7F5' }}>
                  {['#', 'Description', 'Qty', 'Unit Price', 'Tax %', 'Amount'].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: '10px', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lines.map((l, i) => (
                  <tr key={i} style={{ borderTop: '1px solid #F1F0EE' }}>
                    <td style={{ padding: '8px 10px', fontSize: '12px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif", width: 24 }}>{i + 1}</td>
                    <td style={{ padding: '6px 8px' }}><input value={l.desc} onChange={e => updateLine(i, 'desc', e.target.value)} placeholder="Service description…" style={{ width: '100%', padding: '6px 8px', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '12px', fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none', background: '#FAFAF8' }} /></td>
                    <td style={{ padding: '6px 8px', width: 50 }}><input type="number" value={l.qty} onChange={e => updateLine(i, 'qty', e.target.value)} style={{ width: '100%', padding: '6px 8px', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '12px', fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none', background: '#FAFAF8', textAlign: 'center' }} /></td>
                    <td style={{ padding: '6px 8px', width: 100 }}><input type="number" value={l.price} onChange={e => updateLine(i, 'price', e.target.value)} placeholder="0" style={{ width: '100%', padding: '6px 8px', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '12px', fontFamily: "'JetBrains Mono', monospace", outline: 'none', background: '#FAFAF8' }} /></td>
                    <td style={{ padding: '6px 8px', width: 60 }}><select value={l.tax} onChange={e => updateLine(i, 'tax', Number(e.target.value))} style={{ width: '100%', padding: '6px', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '12px', fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none', background: '#FAFAF8' }}>{[0, 5, 12, 18, 28].map(t => <option key={t}>{t}%</option>)}</select></td>
                    <td style={{ padding: '8px 10px', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '13px', color: '#10B981' }}>{fmt(Number(l.qty) * Number(l.price))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={addLine} style={{ fontSize: '12px', color: '#E8783B', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>+ Add Line Item</button>
            <div style={{ borderTop: '2px solid #F1F0EE', marginTop: '14px', paddingTop: '14px' }}>
              {[['Subtotal', fmt(subtotal)], ['Tax', fmt(tax)], ['Total', fmt(total)]].map(([l, v], i) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'flex-end', gap: '24px', marginBottom: i < 2 ? '6px' : '0' }}>
                  <span style={{ fontSize: i === 2 ? '14px' : '12px', fontWeight: i === 2 ? 700 : 500, color: '#475569', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{l}</span>
                  <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: i === 2 ? 800 : 600, fontSize: i === 2 ? '20px' : '14px', color: i === 2 ? '#10B981' : '#0F172A', letterSpacing: '-0.5px', minWidth: 100, textAlign: 'right' }}>{v}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right — Live Preview */}
        <div style={{ position: 'sticky', top: 16, alignSelf: 'flex-start' }}>
          <Card style={{ padding: '28px', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', paddingBottom: '16px', borderBottom: '2px solid #F1F0EE' }}>
              <div>
                <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '20px', color: '#0F172A', letterSpacing: '-1px' }}>Tijori AI</div>
                <div style={{ fontSize: '11px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Acme Corp HQ, Mumbai — 400001</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Invoice</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', color: '#10B981', fontWeight: 500, marginTop: '2px' }}>{invoiceNo}</div>
              </div>
            </div>
            {customer && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '4px' }}>Bill To</div>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{customer}</div>
              </div>
            )}
            <div style={{ marginBottom: '20px' }}>
              {lines.filter(l => l.desc || l.price).map((l, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F8F7F5', fontSize: '12px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  <span style={{ color: '#0F172A' }}>{l.desc || `Item ${i+1}`} × {l.qty}</span>
                  <span style={{ fontWeight: 600, color: '#10B981' }}>{fmt(Number(l.qty) * Number(l.price))}</span>
                </div>
              ))}
            </div>
            <div style={{ background: '#F0FDF4', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#065F46', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Total Due</div>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '28px', color: '#10B981', letterSpacing: '-1px', marginTop: '4px' }}>{fmt(total)}</div>
            </div>
            <button style={{ width: '100%', marginTop: '14px', padding: '9px', background: 'none', border: '1px solid #E2E8F0', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600 }}>↓ Download PDF Preview</button>
          </Card>
        </div>
      </div>
    </div>
  );
};

// ─── CUSTOMER DETAIL ──────────────────────────────────────────────────────────

const ARCustomerScreen = ({ onNavigate }) => {
  const cust = AR_CUSTOMERS[0];
  const custInvoices = AR_INVOICES.filter(i => i.customer === cust.name);

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ fontSize: '12px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '8px' }}>
        <span style={{ cursor: 'pointer', color: '#10B981' }} onClick={() => onNavigate && onNavigate('ar')}>Accounts Receivable</span> › Customers › {cust.name}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '30px', color: '#0F172A', letterSpacing: '-1.5px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            {cust.name} <ARStatusBadge status={cust.status} />
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Btn variant="secondary">Edit Customer</Btn>
          <Btn variant="primary" icon={<span>+</span>}>Raise Invoice</Btn>
        </div>
      </div>

      <StatsRow cards={[
        { label: 'Total Invoiced', value: '₹17.52L', delta: 'Lifetime', deltaType: 'positive' },
        { label: 'Outstanding', value: cust.outstanding, delta: '2 invoices', deltaType: 'negative', color: '#E8783B' },
        { label: 'Overdue', value: cust.overdue, delta: 'Immediate action', deltaType: 'negative', color: '#EF4444', pulse: true },
        { label: 'Avg Days to Pay', value: String(cust.avgDays), sublabel: 'days', delta: '↑ slow payer', deltaType: 'negative', color: '#F59E0B' },
      ]} />

      <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: '20px' }}>
        <Card style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '18px 22px', borderBottom: '1px solid #F1F0EE', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '17px', color: '#0F172A' }}>Invoice History</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8F7F5' }}>
                {['Invoice #', 'Amount', 'Due Date', 'Age', 'Status'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '10px', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {custInvoices.map(inv => (
                <tr key={inv.id} style={{ borderTop: '1px solid #F1F0EE', height: 52, transition: 'background 150ms', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F0FDF4'}
                  onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                  <td style={{ padding: '0 16px', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#10B981' }}>{inv.id}</td>
                  <td style={{ padding: '0 16px', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '14px', color: '#10B981' }}>{inv.amount}</td>
                  <td style={{ padding: '0 16px', fontSize: '12px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{inv.due}</td>
                  <td style={{ padding: '0 16px' }}><span style={{ background: ageBg(inv.age), color: ageColor(inv.age), padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{inv.age}d</span></td>
                  <td style={{ padding: '0 16px' }}><ARStatusBadge status={inv.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card style={{ padding: '22px' }}>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '16px', color: '#0F172A', marginBottom: '16px' }}>Customer Profile</div>
          {[
            { l: 'GSTIN', v: cust.gstin, mono: true },
            { l: 'Payment Terms', v: cust.terms },
            { l: 'Average Days to Pay', v: `${cust.avgDays} days` },
            { l: 'Status', v: cust.status },
          ].map(r => (
            <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F8F7F5' }}>
              <span style={{ fontSize: '12px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{r.l}</span>
              <span style={{ fontSize: '13px', color: '#0F172A', fontWeight: 600, fontFamily: r.mono ? "'JetBrains Mono', monospace" : "'Plus Jakarta Sans', sans-serif" }}>{r.v}</span>
            </div>
          ))}
          <div style={{ marginTop: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '8px' }}>Credit Utilisation</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>₹5,20,000 of ₹10,00,000</span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#F59E0B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>52%</span>
            </div>
            <div style={{ height: 8, background: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: '52%', background: '#F59E0B', borderRadius: 4 }} />
            </div>
          </div>
          <div style={{ marginTop: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '8px' }}>Internal Notes</div>
            <textarea placeholder="Add internal memo (not visible to customer)…"
              style={{ width: '100%', padding: '10px', border: '1.5px solid #E2E8F0', borderRadius: '8px', fontSize: '12px', fontFamily: "'Plus Jakarta Sans', sans-serif", resize: 'vertical', outline: 'none', background: '#FAFAF8', rows: 3 }} />
          </div>
        </Card>
      </div>
    </div>
  );
};

Object.assign(window, { ARScreen, ARRaiseScreen, ARCustomerScreen });
