// Tijori AI — Reports & Analytics (Screen 17)

const ReportsScreen = ({ role, onNavigate }) => {
  const [tab, setTab] = React.useState('');
  const [dateRange, setDateRange] = React.useState('Last 3M');
  const [exportOpen, setExportOpen] = React.useState(false);
  const [selectedFormat, setSelectedFormat] = React.useState('PDF');
  const [recentInvoices, setRecentInvoices] = React.useState([]);

  React.useEffect(() => {
    window.TijoriAPI.BillsAPI.listExpenses({ limit: 10 }).then(data => {
      const items = (data?.results || data || []).map(b => ({
        date: b.date || b.invoice_date ? new Date(b.date || b.invoice_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : '—',
        ref: b.ref_no || b.id.slice(0,8).toUpperCase(),
        who: b.vendor_name || b.vendor?.name || '—',
        cat: b.business_purpose?.slice(0, 15) || 'General',
        amt: '₹' + parseFloat(b.total_amount || 0).toLocaleString('en-IN'),
        status: b.status || b._status || 'PENDING',
        due: b.due_date ? new Date(b.due_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : '—',
      }));
      setRecentInvoices(items);
    }).catch(() => {});
  }, []);

  // ── Role-based config ─────────────────────────────────────────────────────
  const roleConfigs = {
    'CFO': {
      tabs: ['Dashboard', 'P&L Summary', 'Revenue Dashboard', 'Expense Breakdown', 'Vendor Analysis', 'Month-over-Month'],
      defaultTab: 'Dashboard'
    },
    'Finance Admin': {
      tabs: ['Dashboard', 'P&L Summary', 'Revenue Dashboard', 'Expense Breakdown', 'Vendor Analysis', 'Month-over-Month'],
      defaultTab: 'Dashboard'
    },
    'Finance Manager': {
      tabs: ['Dashboard', 'Dept Variance', 'Expense Breakdown', 'Vendor Analysis', 'Month-over-Month'],
      defaultTab: 'Dashboard'
    },
    'AP Clerk': {
      tabs: ['Dashboard', 'Vendor Analysis', 'Expense Breakdown', 'Queue Analytics'],
      defaultTab: 'Dashboard'
    },
    'Employee': {
      tabs: ['Dashboard', 'My Expenses', 'Reimbursement Status'],
      defaultTab: 'Dashboard'
    },
    'Vendor': {
      tabs: ['Dashboard', 'My Invoices', 'Payment Status', 'Performance'],
      defaultTab: 'Dashboard'
    }
  };

  const config = roleConfigs[role] || roleConfigs['Employee'];
  const tabs = config.tabs;

  React.useEffect(() => {
    if (!tab && tabs.length > 0) setTab(config.defaultTab);
  }, [role, tabs]);

  const dateRanges = ['This Month', 'Last 3M', 'Last 6M', 'YTD', 'Custom'];

  // ── Shared SVG helpers ────────────────────────────────────────────────────
  const W = 520, H = 200;
  const months = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

  // P&L waterfall data
  const plBars = [
    { label: 'Revenue', val: 580, color: '#10B981', type: 'up' },
    { label: 'COGS', val: -180, color: '#EF4444', type: 'down' },
    { label: 'Gross Profit', val: 400, color: '#10B981', type: 'total' },
    { label: 'OpEx', val: -240, color: '#EF4444', type: 'down' },
    { label: 'EBITDA', val: 160, color: '#E8783B', type: 'total' },
  ];

  // Revenue trend
  const rev = [42, 48, 38, 55, 51, 62];
  const col = [35, 42, 30, 48, 44, 56];

  // Expense by dept bars
  const deptData = [
    { name: 'Engineering', spent: 240, budget: 240, pct: 100 },
    { name: 'Marketing', spent: 110, budget: 130, pct: 85 },
    { name: 'Operations', spent: 65, budget: 150, pct: 43 },
    { name: 'HR', spent: 54, budget: 80, pct: 68 },
    { name: 'Finance', spent: 22, budget: 50, pct: 44 },
  ];

  const topVendors = Array.from(recentInvoices.reduce((acc, curr) => {
    acc.set(curr.who, (acc.get(curr.who) || 0) + parseFloat(curr.amt.replace(/[^0-9.-]+/g,"")));
    return acc;
  }, new Map())).map(([name, spend]) => ({ name, spend: spend / 1000, color: '#E8783B' })).sort((a,b) => b.spend - a.spend).slice(0, 5);

  // MoM charts
  const momRev = [38, 42, 35, 48, 51, 62];
  const momExp = [45, 48, 52, 55, 50, 58];

  const linePoints = (data, w, h, pad = 40) => {
    const max = Math.max(...data), min = Math.min(...data);
    return data.map((v, i) => ({
      x: pad + (i / (data.length - 1)) * (w - pad * 2),
      y: h - pad - ((v - min) / (max - min || 1)) * (h - pad * 2)
    }));
  };

  const linePath = (pts) => pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = (pts, h) => `${linePath(pts)} L ${pts[pts.length - 1].x} ${h - 20} L ${pts[0].x} ${h - 20} Z`;

  const KPIStrip = ({ cards }) => (
    <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
      {cards.map((c, i) => <KPICard key={i} {...c} />)}
    </div>
  );

  // ── Tab content ───────────────────────────────────────────────────────────

  const renderPL = () => (
    <>
      <KPIStrip cards={[
        { label: 'Total Revenue', value: '₹58.2L', delta: '↑ 12%', deltaType: 'positive', color: '#10B981' },
        { label: 'Total Expenses', value: '₹42.0L', delta: '↑ 8%', deltaType: 'negative', color: '#E8783B' },
        { label: 'Gross Profit', value: '₹16.2L', delta: '↑ 22%', deltaType: 'positive', color: '#10B981' },
        { label: 'Net Margin', value: '27.8%', delta: '↑ 3.2pp', deltaType: 'positive' },
      ]} />
      <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: '20px' }}>
        <Card style={{ padding: '22px' }}>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '16px', color: '#0F172A', marginBottom: '16px' }}>P&L Waterfall</div>
          <svg width="100%" viewBox="0 0 480 200" style={{ overflow: 'visible' }}>
            {plBars.reduce((acc, b, i) => {
              const barW = 60, gap = 36, x = 20 + i * (barW + gap);
              const scale = 0.28;
              const prev = i === 0 || b.type === 'total' ? 0 : acc.baseline;
              const h = Math.abs(b.val) * scale;
              const y = b.val >= 0 ? 160 - (prev + b.val) * scale : 160 - prev * scale;
              const newBase = b.type === 'total' ? b.val : acc.baseline + b.val;
              return { baseline: newBase, els: [...acc.els,
                <g key={i}>
                  {i > 0 && b.type !== 'total' && (
                    <line x1={x} y1={160 - acc.baseline * scale} x2={x - gap} y2={160 - acc.baseline * scale} stroke="#E2E8F0" strokeWidth="1" strokeDasharray="3,3" />
                  )}
                  <rect x={x} y={y} width={barW} height={h} rx="4" fill={b.color} opacity={b.type === 'total' ? 1 : 0.8} />
                  <text x={x + barW / 2} y={y - 5} textAnchor="middle" fontSize="11" fontWeight="700" fill={b.color} fontFamily="Bricolage Grotesque">
                    {b.val > 0 ? '+' : ''}₹{Math.abs(b.val)}L
                  </text>
                  <text x={x + barW / 2} y={175} textAnchor="middle" fontSize="10" fill="#64748B" fontFamily="Plus Jakarta Sans">{b.label}</text>
                </g>
              ]};
            }, { baseline: 0, els: [] }).els}
          </svg>
        </Card>

        <Card style={{ padding: '22px' }}>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '16px', color: '#0F172A', marginBottom: '14px' }}>P&L Table</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: '#F8F7F5' }}>
                {['Category', 'Budget', 'Actual', 'Var %'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: '10px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { cat: 'Revenue', budget: '₹52L', actual: '₹58.2L', var: '+11.9%', positive: true },
                { cat: '  AR Collected', budget: '₹40L', actual: '₹45L', var: '+12.5%', positive: true, sub: true },
                { cat: 'Cost of Revenue', budget: '₹16L', actual: '₹18.0L', var: '+12.5%', positive: false },
                { cat: 'Operating Expenses', budget: '₹22L', actual: '₹24.0L', var: '+9.1%', positive: false },
                { cat: '  Engineering', budget: '₹10L', actual: '₹12.0L', var: '+20%', positive: false, sub: true },
                { cat: 'Net Profit', budget: '₹14L', actual: '₹16.2L', var: '+15.7%', positive: true },
              ].map((r, i) => (
                <tr key={i} style={{ borderTop: '1px solid #F1F0EE', background: r.cat === 'Net Profit' ? '#F0FDF4' : 'white' }}>
                  <td style={{ padding: '9px 10px', fontSize: '12px', color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: r.sub ? 400 : 600, paddingLeft: r.sub ? 20 : 10 }}>{r.cat}</td>
                  <td style={{ padding: '9px 10px', fontSize: '12px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{r.budget}</td>
                  <td style={{ padding: '9px 10px', fontSize: '12px', fontWeight: 700, color: '#0F172A', fontFamily: "'Bricolage Grotesque', sans-serif", letterSpacing: '-0.3px' }}>{r.actual}</td>
                  <td style={{ padding: '9px 10px' }}>
                    <span style={{ background: r.positive ? '#D1FAE5' : '#FEE2E2', color: r.positive ? '#065F46' : '#991B1B', padding: '2px 7px', borderRadius: '999px', fontSize: '10px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{r.var}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  );

  const renderRevenue = () => {
    const rPts = linePoints(rev, W, H);
    const cPts = linePoints(col, W, H);
    return (
      <>
        <KPIStrip cards={[
          { label: 'Total AR Raised', value: '₹12.52L', delta: '↑ 4.2%', deltaType: 'negative', color: '#E8783B' },
          { label: 'Collected', value: '₹9.87L', delta: '↑ 18%', deltaType: 'positive', color: '#10B981' },
          { label: 'Outstanding', value: '₹2.65L', delta: '2 overdue', deltaType: 'neutral', color: '#F59E0B' },
          { label: 'Collection Rate', value: '78.8%', delta: '↑ 3pp', deltaType: 'positive' },
        ]} />
        <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: '20px', marginBottom: '20px' }}>
          <Card style={{ padding: '22px' }}>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '16px', color: '#0F172A', marginBottom: '16px' }}>Revenue Trend</div>
            <div style={{ display: 'flex', gap: '14px', marginBottom: '12px', fontSize: '11px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: 12, height: 3, background: '#E8783B', display: 'inline-block', borderRadius: 2 }} />Invoiced</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: 12, height: 3, background: '#10B981', display: 'inline-block', borderRadius: 2 }} />Collected</span>
            </div>
            <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
              {months.map((m, i) => <text key={i} x={rPts[i].x} y={H - 4} textAnchor="middle" fontSize="10" fill="#94A3B8" fontFamily="Plus Jakarta Sans">{m}</text>)}
              <path d={areaPath(rPts, H)} fill="rgba(232,120,59,0.08)" />
              <path d={linePath(rPts)} fill="none" stroke="#E8783B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d={areaPath(cPts, H)} fill="rgba(16,185,129,0.08)" />
              <path d={linePath(cPts)} fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              {rPts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="4" fill="white" stroke="#E8783B" strokeWidth="2" />)}
              {cPts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="4" fill="white" stroke="#10B981" strokeWidth="2" />)}
            </svg>
          </Card>
          <Card style={{ padding: '22px' }}>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '16px', color: '#0F172A', marginBottom: '14px' }}>Top Customers</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ background: '#F8F7F5' }}>
                {['Customer', 'Invoiced', 'Days'].map(h => <th key={h} style={{ padding: '8px 10px', fontSize: '10px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: "'Plus Jakarta Sans', sans-serif", textAlign: 'left' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {[['Global Tech', '₹5.2L', 32], ['Acme Corp', '₹6.8L', 55], ['SkyBridge', '₹0.9L', 22], ['Meridian', '₹1.2L', 41]].map(([n, v, d], i) => (
                  <tr key={i} style={{ borderTop: '1px solid #F1F0EE', height: 44 }}>
                    <td style={{ padding: '0 10px', fontSize: '12px', fontWeight: 600, color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{n}</td>
                    <td style={{ padding: '0 10px', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '13px', color: '#10B981' }}>{v}</td>
                    <td style={{ padding: '0 10px' }}><span style={{ background: d > 45 ? '#FEE2E2' : d > 30 ? '#FEF3C7' : '#D1FAE5', color: d > 45 ? '#991B1B' : d > 30 ? '#92400E' : '#065F46', padding: '2px 7px', borderRadius: '999px', fontSize: '10px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{d}d</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      </>
    );
  };

  const renderExpense = () => (
    <>
      <KPIStrip cards={[
        { label: 'Total Spend', value: '₹4.91M', delta: '↑ 8%', deltaType: 'negative', color: '#E8783B' },
        { label: 'vs Budget', value: '75.5%', delta: '↑ utilised', deltaType: 'neutral' },
        { label: 'Avg per Transaction', value: '₹1.24L', delta: '↑ 3.2%', deltaType: 'negative' },
        { label: 'Transactions', value: '247', delta: 'This period', deltaType: 'positive' },
      ]} />
      <Card style={{ padding: '22px', marginBottom: '20px' }}>
        <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '16px', color: '#0F172A', marginBottom: '16px' }}>Spend by Department</div>
        {deptData.map((d, i) => (
          <div key={i} style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{d.name}</span>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '13px', color: '#E8783B' }}>₹{d.spent}L</span>
                <span style={{ background: d.pct >= 90 ? '#FEE2E2' : d.pct >= 70 ? '#FEF3C7' : '#D1FAE5', color: d.pct >= 90 ? '#991B1B' : d.pct >= 70 ? '#92400E' : '#065F46', padding: '2px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{d.pct}%</span>
              </div>
            </div>
            <div style={{ height: 8, background: '#F1F5F9', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
              <div style={{ height: '100%', width: `${d.pct}%`, background: d.pct >= 90 ? '#EF4444' : d.pct >= 70 ? '#F59E0B' : '#E8783B', borderRadius: 4, transition: 'width 600ms ease' }} />
              {/* Budget line */}
              <div style={{ position: 'absolute', top: 0, left: '100%', width: 1, height: '100%', background: '#0F172A', opacity: 0.3 }} />
            </div>
          </div>
        ))}
      </Card>
      <Card style={{ padding: '22px' }}>
        <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '16px', color: '#0F172A', marginBottom: '14px' }}>Expense Transactions</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: '#F8F7F5' }}>
            {['Date', 'Ref #', 'Vendor / Employee', 'Category', 'Amount', 'Status'].map(h => <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '10px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {recentInvoices.map((r, i) => (
              <tr key={i} style={{ borderTop: '1px solid #F1F0EE', height: 48, transition: 'background 150ms', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = '#FFF8F5'}
                onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                <td style={{ padding: '0 12px', fontSize: '12px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{r.date}</td>
                <td style={{ padding: '0 12px', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#E8783B' }}>{r.ref}</td>
                <td style={{ padding: '0 12px', fontSize: '13px', fontWeight: 600, color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{r.who}</td>
                <td style={{ padding: '0 12px' }}><span style={{ background: '#F1F5F9', color: '#475569', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{r.cat}</span></td>
                <td style={{ padding: '0 12px', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '13px', color: '#E8783B', letterSpacing: '-0.3px' }}>{r.amt}</td>
                <td style={{ padding: '0 12px' }}><StatusBadge status={r.status} /></td>
              </tr>
            ))}
            {recentInvoices.length === 0 && <tr><td colSpan="6" style={{ padding: '20px', textAlign: 'center', color: '#94A3B8', fontSize: '12px' }}>No expenses found.</td></tr>}
          </tbody>
        </table>
      </Card>
    </>
  );

  const renderVendor = () => (
    <>
      <KPIStrip cards={[
        { label: 'Total Vendors', value: '6', delta: '↑ 2 this month', deltaType: 'positive' },
        { label: 'Active', value: '4', delta: 'Verified', deltaType: 'positive', color: '#10B981' },
        { label: 'Total AP Spend', value: '₹2.84Cr', delta: '↑ 8.2%', deltaType: 'negative', color: '#E8783B' },
        { label: 'Avg Payment Days', value: '34d', delta: '↑ 3d vs target', deltaType: 'negative', color: '#F59E0B' },
      ]} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <Card style={{ padding: '22px' }}>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '16px', color: '#0F172A', marginBottom: '16px' }}>Top Vendors by Spend</div>
          {topVendors.map((v, i) => (
            <div key={i} style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{v.name}</span>
                <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '13px', color: '#E8783B' }}>₹{v.spend}K</span>
              </div>
              <div style={{ height: 8, background: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(v.spend / 840) * 100}%`, background: '#E8783B', borderRadius: 4, transition: 'width 600ms ease' }} />
              </div>
            </div>
          ))}
        </Card>
        <Card style={{ padding: '22px' }}>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '16px', color: '#0F172A', marginBottom: '14px' }}>Vendor Directory</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: '#F8F7F5' }}>
              {['Vendor', 'Spend', 'Days', 'Status'].map(h => <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: '10px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {topVendors.map((v, i) => {
                const d = Math.floor(Math.random() * 40) + 10;
                return (
                  <tr key={i} style={{ borderTop: '1px solid #F1F0EE', height: 44, transition: 'background 150ms' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#FFF8F5'}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                    <td style={{ padding: '0 10px', fontSize: '12px', fontWeight: 600, color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{v.name}</td>
                    <td style={{ padding: '0 10px', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '13px', color: '#E8783B' }}>₹{v.spend.toFixed(1)}K</td>
                    <td style={{ padding: '0 10px' }}><span style={{ background: d > 45 ? '#FEE2E2' : d > 30 ? '#FEF3C7' : '#D1FAE5', color: d > 45 ? '#991B1B' : d > 30 ? '#92400E' : '#065F46', padding: '2px 7px', borderRadius: '999px', fontSize: '10px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{d}d</span></td>
                    <td style={{ padding: '0 10px' }}><StatusBadge status="ACTIVE" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  );

  const renderMoM = () => {
    const revPts = linePoints(momRev, W, H);
    const expPts = linePoints(momExp, W, H);
    const anomPts = linePoints([2, 4, 1, 3, 5, 3], W, H);
    return (
      <>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          {['FY 2025-26', 'FY 2024-25'].map(y => (
            <button key={y} style={{ padding: '6px 14px', borderRadius: '999px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif", background: y === 'FY 2025-26' ? '#E8783B' : '#F8F7F5', color: y === 'FY 2025-26' ? 'white' : '#64748B' }}>{y}</button>
          ))}
        </div>
        {[
          { title: 'Revenue vs Expenses', lines: [{ pts: revPts, color: '#10B981', label: 'Revenue' }, { pts: expPts, color: '#E8783B', label: 'Expenses' }] },
          { title: 'Anomaly Count', lines: [{ pts: anomPts, color: '#EF4444', label: 'Anomalies' }] },
        ].map((chart, ci) => (
          <Card key={ci} style={{ padding: '22px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '16px', color: '#0F172A' }}>{chart.title}</div>
              <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {chart.lines.map(l => <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: 12, height: 3, background: l.color, display: 'inline-block', borderRadius: 2 }} />{l.label}</span>)}
              </div>
            </div>
            <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
              {months.map((m, i) => {
                const x = 40 + (i / (months.length - 1)) * (W - 80);
                return <text key={i} x={x} y={H - 4} textAnchor="middle" fontSize="10" fill="#94A3B8" fontFamily="Plus Jakarta Sans">{m}</text>;
              })}
              {ci === 0 && (
                <path d={`M ${expPts[0].x} ${expPts[0].y} ${expPts.map(p => `L ${p.x} ${p.y}`).join(' ')} L ${revPts[revPts.length - 1].x} ${revPts[revPts.length - 1].y} ${[...revPts].reverse().map(p => `L ${p.x} ${p.y}`).join(' ')} Z`} fill="rgba(16,185,129,0.06)" />
              )}
              {chart.lines.map(l => (
                <React.Fragment key={l.label}>
                  <path d={linePath(l.pts)} fill="none" stroke={l.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  {l.pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="4" fill="white" stroke={l.color} strokeWidth="2" />)}
                </React.Fragment>
              ))}
            </svg>
          </Card>
        ))}
      </>
    );
  };

  const renderDashboard = () => (
    <div style={{ animation: 'fadeUp 250ms ease both' }}>
      <KPIStrip cards={[
        { label: 'Total Revenue', value: '₹5.82Cr', delta: '+12.4%', deltaType: 'positive' },
        { label: 'OpEx', value: '₹2.40Cr', delta: '+8.1%', deltaType: 'negative' },
        { label: 'Net Profit', value: '₹1.62Cr', delta: '+15.7%', deltaType: 'positive', color: '#10B981' },
        { label: 'System Health', value: '98.2%', delta: 'Optimal', deltaType: 'positive' },
      ]} />
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <Card style={{ padding: '22px' }}>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '16px', color: '#0F172A', marginBottom: '16px' }}>Monthly Performance</div>
          <svg width="100%" height={160} viewBox="0 0 520 160">
            {linePoints(rev, 520, 160).map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r="4" fill="#E8783B" />
            ))}
            <path d={linePath(linePoints(rev, 520, 160))} fill="none" stroke="#E8783B" strokeWidth="2" />
          </svg>
        </Card>
        <Card style={{ padding: '22px' }}>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '16px', color: '#0F172A', marginBottom: '16px' }}>Expense Distribution</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
             {deptData.map(d => (
               <div key={d.name}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                   <span>{d.name}</span>
                   <span style={{ fontWeight: 700 }}>₹{d.spent}L</span>
                 </div>
                 <div style={{ height: '6px', background: '#F1F0EE', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${d.pct}%`, background: '#E8783B' }} />
                 </div>
               </div>
             ))}
          </div>
        </Card>
      </div>
    </div>
  );

  const renderMyExpenses = () => (
    <>
      <KPIStrip cards={[
        { label: 'Total Submitted', value: '₹42,000', delta: 'Last 30 days', deltaType: 'neutral' },
        { label: 'Approved', value: '₹38,000', delta: 'Ready for payout', deltaType: 'positive', color: '#10B981' },
        { label: 'Pending', value: '₹4,000', delta: 'With HOD', deltaType: 'neutral', color: '#F59E0B' },
        { label: 'Avg Approval', value: '2.4 days', delta: '↓ 0.5d', deltaType: 'positive' },
      ]} />
      <Card style={{ padding: '22px' }}>
        <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '16px', color: '#0F172A', marginBottom: '16px' }}>My Recent Expenses</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: '#F8F7F5' }}>
            {['Date', 'Ref #', 'Category', 'Amount', 'Status'].map(h => <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '10px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {[
              { date: 'Apr 16', ref: 'EXP-2024-441', cat: 'Travel', amt: '₹4,200', status: 'PENDING_L1' },
              { date: 'Apr 02', ref: 'EXP-2024-398', cat: 'Meals', amt: '₹1,250', status: 'APPROVED' },
              { date: 'Mar 28', ref: 'EXP-2024-382', cat: 'Office', amt: '₹12,400', status: 'PAID' },
            ].map((r, i) => (
              <tr key={i} style={{ borderTop: '1px solid #F1F0EE', height: 48 }}>
                <td style={{ padding: '0 12px', fontSize: '12px', color: '#94A3B8' }}>{r.date}</td>
                <td style={{ padding: '0 12px', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#E8783B' }}>{r.ref}</td>
                <td style={{ padding: '0 12px' }}><span style={{ background: '#F1F5F9', color: '#475569', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600 }}>{r.cat}</span></td>
                <td style={{ padding: '0 12px', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '13px' }}>{r.amt}</td>
                <td style={{ padding: '0 12px' }}><StatusBadge status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );

  const renderMyInvoices = () => (
    <>
      <KPIStrip cards={[
        { label: 'Total Billed', value: '₹8.42L', delta: 'Total lifecycle', deltaType: 'neutral' },
        { label: 'Paid', value: '₹6.20L', delta: 'Last payment: Apr 12', deltaType: 'positive', color: '#10B981' },
        { label: 'Outstanding', value: '₹2.22L', delta: '1 overdue', deltaType: 'negative', color: '#EF4444' },
        { label: 'Avg Pay Cycle', value: '28 days', delta: '↓ 2d', deltaType: 'positive' },
      ]} />
      <Card style={{ padding: '22px' }}>
        <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '16px', color: '#0F172A', marginBottom: '16px' }}>Invoice History</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: '#F8F7F5' }}>
            {['Date', 'Invoice #', 'Amount', 'Status', 'Due Date'].map(h => <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '10px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {recentInvoices.map((r, i) => (
              <tr key={i} style={{ borderTop: '1px solid #F1F0EE', height: 48 }}>
                <td style={{ padding: '0 12px', fontSize: '12px', color: '#94A3B8' }}>{r.date}</td>
                <td style={{ padding: '0 12px', fontWeight: 600 }}>{r.ref}</td>
                <td style={{ padding: '0 12px', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700 }}>{r.amt}</td>
                <td style={{ padding: '0 12px' }}><StatusBadge status={r.status} /></td>
                <td style={{ padding: '0 12px', fontSize: '12px', color: '#64748B' }}>{r.due}</td>
              </tr>
            ))}
            {recentInvoices.length === 0 && <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#94A3B8', fontSize: '12px' }}>No invoices found.</td></tr>}
          </tbody>
        </table>
      </Card>
    </>
  );

  const renderDeptVariance = () => (
    <>
      <KPIStrip cards={[
        { label: 'Dept Budget', value: '₹2.4M', delta: 'Engineering', deltaType: 'neutral' },
        { label: 'Total Spent', value: '₹2.4M', delta: '100% utilized', deltaType: 'negative', color: '#EF4444' },
        { label: 'Forecast Variance', value: '+₹0.2M', delta: 'Over budget', deltaType: 'negative', color: '#EF4444' },
        { label: 'Pending Approval', value: '₹0.15M', delta: '3 invoices', deltaType: 'neutral' },
      ]} />
      <Card style={{ padding: '22px' }}>
        <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '16px', color: '#0F172A', marginBottom: '16px' }}>Variance Analysis by Category</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: '#F8F7F5' }}>
            {['Category', 'Budget', 'Actual', 'Variance', 'Status'].map(h => <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '10px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {[
              { cat: 'Cloud Infra', budget: '₹10.0L', actual: '₹12.0L', var: '+20%', ok: false },
              { cat: 'Software Licenses', budget: '₹5.0L', actual: '₹4.8L', var: '-4%', ok: true },
              { cat: 'Hardware', budget: '₹8.0L', actual: '₹7.2L', var: '-10%', ok: true },
              { cat: 'Training', budget: '₹1.0L', actual: '₹0.0L', var: '-100%', ok: true },
            ].map((r, i) => (
              <tr key={i} style={{ borderTop: '1px solid #F1F0EE', height: 44 }}>
                <td style={{ padding: '0 12px', fontWeight: 600 }}>{r.cat}</td>
                <td style={{ padding: '0 12px' }}>{r.budget}</td>
                <td style={{ padding: '0 12px', fontWeight: 700 }}>{r.actual}</td>
                <td style={{ padding: '0 12px', color: r.ok ? '#059669' : '#DC2626', fontWeight: 700 }}>{r.var}</td>
                <td style={{ padding: '0 12px' }}>
                  <span style={{ background: r.ok ? '#D1FAE5' : '#FEE2E2', color: r.ok ? '#065F46' : '#991B1B', padding: '2px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: 700 }}>
                    {r.ok ? 'ON TRACK' : 'OVER BUDGET'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );

  const getExportData = () => {
    if (tab === 'P&L Summary') {
      return {
        headers: ["Category", "Budget", "Actual", "Variance %"],
        rows: [
          ["Revenue", "52,00,000", "58,20,000", "+11.9%"],
          ["Cost of Revenue", "16,00,000", "18,00,000", "+12.5%"],
          ["Gross Profit", "36,00,000", "40,20,000", "+11.7%"],
          ["Operating Expenses", "22,00,000", "24,00,000", "+9.1%"],
          ["Net Profit", "14,00,000", "16,20,000", "+15.7%"]
        ]
      };
    } else if (tab === 'Expense Breakdown') {
      return {
        headers: ["Department", "Budget (₹)", "Spent (₹)", "Utilisation %"],
        rows: deptData.map(d => [d.name, `${d.budget}L`, `${d.spent}L`, `${d.pct}%`])
      };
    } else if (tab === 'Vendor Analysis' || tab === 'My Invoices' || tab === 'Payment Status' || tab === 'My Expenses' || tab === 'Reimbursement Status') {
      return {
        headers: ["Date", "Invoice #", "Vendor", "Category", "Amount (₹)", "Status"],
        rows: recentInvoices.map(r => [r.date, r.ref, r.who, r.cat, r.amt, r.status])
      };
    } else {
      return {
        headers: ["Report", "Period", "Role", "Generated At"],
        rows: [
          [tab, dateRange, role, new Date().toLocaleString('en-IN')]
        ]
      };
    }
  };

  const handleExport = (format) => {
    const { headers, rows } = getExportData();
    const timestamp = new Date().toLocaleString('en-IN');
    const filename = `TijoriAI_${tab.replace(/[\s&/]/g, '_')}_${dateRange.replace(/\s/g, '')}_${new Date().getFullYear()}`;

    if (format === 'PDF') {
      // Open a print-friendly version
      const printWindow = window.open('', '_blank');
      const tableRows = rows.map(r => `<tr>${r.map(c => `<td style="padding:8px 12px;border:1px solid #e2e8f0;">${c}</td>`).join('')}</tr>`).join('');
      printWindow.document.write(`
        <!DOCTYPE html><html><head><title>${tab} — Tijori AI</title>
        <style>body{font-family:sans-serif;padding:32px;color:#0F172A;}
        h1{font-size:22px;margin-bottom:4px;}
        .meta{font-size:12px;color:#64748B;margin-bottom:24px;}
        table{width:100%;border-collapse:collapse;font-size:13px;}
        th{background:#F8F7F5;padding:10px 12px;text-align:left;border:1px solid #e2e8f0;font-weight:700;}
        @media print{@page{margin:20mm;}}</style></head>
        <body>
        <h1>Tijori AI — ${tab}</h1>
        <div class="meta">Period: ${dateRange} · Role: ${role} · Generated: ${timestamp}</div>
        <table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${tableRows}</tbody></table>
        <div style="margin-top:32px;font-size:11px;color:#94A3B8;">Generated by Tijori AI Finance OS · Confidential</div>
        <script>window.onload=function(){window.print();}<\/script></body></html>
      `);
      printWindow.document.close();
      setExportOpen(false);
      return;
    }

    if (format === 'Excel') {
      // Generate proper Excel-compatible XML (XLSX-lite via XML)
      const xmlHeader = '<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>';
      const xmlBody = `<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
        <Worksheet ss:Name="${tab.slice(0,31)}">
          <Table>
            <Row>${headers.map(h => `<Cell><Data ss:Type="String">${h}</Data></Cell>`).join('')}</Row>
            ${rows.map(r => `<Row>${r.map(c => `<Cell><Data ss:Type="String">${c}</Data></Cell>`).join('')}</Row>`).join('\n')}
          </Table>
        </Worksheet>
      </Workbook>`;
      const blob = new Blob([xmlHeader + xmlBody], { type: 'application/vnd.ms-excel' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = filename + '.xls';
      a.click(); URL.revokeObjectURL(url);
      setExportOpen(false);
      return;
    }

    // CSV
    const csvContent = [
      [`Tijori AI — ${tab}`, `Period: ${dateRange}`, `Role: ${role}`, `Generated: ${timestamp}`].join(','),
      '',
      headers.map(h => `"${h}"`).join(','),
      ...rows.map(r => r.map(c => `"${c}"`).join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename + '.csv';
    a.click(); URL.revokeObjectURL(url);
    setExportOpen(false);
  };

  const tabContent = {
    'Dashboard': renderDashboard,
    'P&L Summary': renderPL,
    'Revenue Dashboard': renderRevenue,
    'Expense Breakdown': renderExpense,
    'Vendor Analysis': renderVendor,
    'Month-over-Month': renderMoM,
    'My Expenses': renderMyExpenses,
    'My Invoices': renderMyInvoices,
    'Dept Variance': renderDeptVariance,
    'Reimbursement Status': renderMyExpenses, // Reuse for demo
    'Payment Status': renderMyInvoices, // Reuse for demo
    'Performance': renderVendor, // Reuse for demo
    'Queue Analytics': renderExpense, // Reuse for demo
  };

  return (
    <div style={{ padding: '32px' }}>
      {/* Header */}
      <SectionHeader title="Reports & Analytics"
        subtitle="Generate, filter, and export financial intelligence across every dimension."
        right={<>
          <Btn variant="secondary" small onClick={() => {
            const freq = window.prompt('Schedule this report? Enter frequency:', 'Weekly');
            if (freq) alert(`Report "${tab}" scheduled to run ${freq}. You will receive it at your registered email.`);
          }}>Schedule Report</Btn>
          <Btn variant="primary" onClick={() => setExportOpen(true)}>Export ↓</Btn>
        </>} />

      {/* Tab selector */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '0', borderBottom: '2px solid #F1F0EE', overflowX: 'auto' }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: tab === t ? 700 : 500, fontSize: '13px', color: tab === t ? '#0F172A' : '#94A3B8', borderBottom: `2px solid ${tab === t ? '#E8783B' : 'transparent'}`, marginBottom: '-2px', whiteSpace: 'nowrap', transition: 'all 150ms' }}>
            {t}
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '14px 0', marginBottom: '20px', borderBottom: '1px solid #F1F0EE', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          {dateRanges.map(r => (
            <button key={r} onClick={() => setDateRange(r)}
              style={{ padding: '5px 12px', borderRadius: '999px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif", background: dateRange === r ? '#E8783B' : '#F8F7F5', color: dateRange === r ? 'white' : '#64748B', transition: 'all 150ms' }}>
              {r}
            </button>
          ))}
        </div>
        <div style={{ height: 24, width: 1, background: '#E2E8F0' }} />
        {['Department ▾', 'Category ▾', 'Status ▾'].map(f => (
          <button key={f} style={{ padding: '5px 12px', borderRadius: '8px', border: '1.5px solid #E2E8F0', cursor: 'pointer', fontSize: '11px', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif", background: 'white', color: '#475569' }}>{f}</button>
        ))}
        <Btn variant="primary" small style={{ marginLeft: 'auto' }} onClick={() => {
          // Filters are already reflected via state; re-render happens automatically
          // This button signals intent and could fetch filtered data in a real backend
        }}>Apply Filters</Btn>
      </div>

      {/* Tab content */}
      <div style={{ animation: 'fadeUp 220ms ease both' }} key={tab}>
        {(tabContent[tab] || tabContent['P&L Summary'])()}
      </div>

      {/* Export side panel */}
      <SidePanel open={exportOpen} onClose={() => setExportOpen(false)} title="Export Report">
        <div style={{ marginBottom: '16px', padding: '12px 14px', background: '#F8F7F5', borderRadius: '10px', fontSize: '13px', color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600 }}>
          {tab} · {dateRange}
        </div>
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '10px' }}>Format</div>
          {[
            { id: 'PDF', label: 'PDF (Print-ready report)', icon: '📄' },
            { id: 'Excel', label: 'Excel (XLS workbook)', icon: '📊' },
            { id: 'CSV', label: 'CSV (Raw data)', icon: '📋' }
          ].map(f => (
            <div key={f.id} onClick={() => setSelectedFormat(f.id)}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', border: `1.5px solid ${selectedFormat === f.id ? '#E8783B' : '#E2E8F0'}`, borderRadius: '10px', marginBottom: '8px', cursor: 'pointer', transition: 'all 150ms', background: selectedFormat === f.id ? '#FFF8F5' : 'white' }}>
              <span style={{ fontSize: '18px' }}>{f.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{f.id}</div>
                <div style={{ fontSize: '10px', color: '#94A3B8' }}>{f.label}</div>
              </div>
              {selectedFormat === f.id && <span style={{ color: '#E8783B', fontSize: '14px' }}>✓</span>}
            </div>
          ))}
        </div>
        <TjInput label="Send via Email" placeholder="finance@company.com" type="email" />
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Frequency</div>
          <select style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E2E8F0', borderRadius: '8px', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', color: '#0F172A', background: '#FAFAF8', outline: 'none' }}>
            <option>Once</option><option>Weekly</option><option>Monthly</option>
          </select>
        </div>
        <Btn variant="primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => handleExport(selectedFormat)}>Generate & Download {selectedFormat}</Btn>
      </SidePanel>
    </div>
  );
};

Object.assign(window, { ReportsScreen });

const LiveReportsScreen = ({ role, onNavigate }) => {
  const [loading, setLoading] = React.useState(true);
  const [spend, setSpend] = React.useState(null);
  const [risk, setRisk] = React.useState(null);
  const [budgetHealth, setBudgetHealth] = React.useState(null);
  const [workingCapital, setWorkingCapital] = React.useState(null);
  const [policy, setPolicy] = React.useState(null);
  const [recentInvoices, setRecentInvoices] = React.useState([]);
  const [filterStatus, setFilterStatus] = React.useState('');
  const [filterCategory, setFilterCategory] = React.useState('');
  const [filterDept, setFilterDept] = React.useState('');
  const [filterSearch, setFilterSearch] = React.useState('');

  React.useEffect(() => {
    const { AnalyticsAPI, BillsAPI } = window.TijoriAPI;
    Promise.allSettled([
      AnalyticsAPI.spendIntelligence(),
      AnalyticsAPI.vendorRisk(),
      AnalyticsAPI.budgetHealth(),
      AnalyticsAPI.workingCapital(),
      AnalyticsAPI.policyCompliance(),
      BillsAPI.listExpenses({ limit: 12 }),
    ]).then(([spendRes, riskRes, budgetRes, wcRes, policyRes, invoicesRes]) => {
      if (spendRes.status === 'fulfilled') setSpend(spendRes.value);
      if (riskRes.status === 'fulfilled') setRisk(riskRes.value);
      if (budgetRes.status === 'fulfilled') setBudgetHealth(budgetRes.value);
      if (wcRes.status === 'fulfilled') setWorkingCapital(wcRes.value);
      if (policyRes.status === 'fulfilled') setPolicy(policyRes.value);
      if (invoicesRes.status === 'fulfilled') setRecentInvoices(invoicesRes.value?.results || invoicesRes.value || []);
    }).finally(() => setLoading(false));
  }, []);

  const topBudgets = budgetHealth?.budgets || [];
  const topVendors = spend?.top_vendors || [];
  const riskyVendors = risk?.vendors?.slice(0, 5) || [];

  const allCategories = [...new Set(recentInvoices.map(r => r.business_purpose || r.expense_category || 'General').filter(Boolean))];
  const allDepts = [...new Set(recentInvoices.map(r => r.department_name || r.department).filter(Boolean))];

  const recentRows = recentInvoices.filter(row => {
    if (filterStatus && (row.status || row._status) !== filterStatus) return false;
    if (filterCategory) {
      const cat = row.business_purpose || row.expense_category || 'General';
      if (!cat.toLowerCase().includes(filterCategory.toLowerCase())) return false;
    }
    if (filterDept && (row.department_name || row.department) !== filterDept) return false;
    if (filterSearch) {
      const s = filterSearch.toLowerCase();
      const party = (row.vendor_name || row.vendor?.name || row.submitted_by_name || '').toLowerCase();
      const ref = (row.ref_no || row.id || '').toString().toLowerCase();
      if (!party.includes(s) && !ref.includes(s)) return false;
    }
    return true;
  }).slice(0, 20);

  const exportCsv = () => {
    const rows = [['Type', 'Name', 'Value']];
    topVendors.forEach((v) => rows.push(['Vendor Spend', v.name, String(v.amount)]));
    riskyVendors.forEach((v) => rows.push(['Vendor Risk', v.vendor_name, String(v.risk_score)]));
    topBudgets.forEach((b) => rows.push(['Budget Utilization', b.name, String(b.utilization_pct || 0)]));
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'live_reports.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '32px', color: '#0F172A', letterSpacing: '-1.5px' }}>Reports & Analytics</h1>
          <div style={{ fontSize: '13px', color: '#64748B', marginTop: '4px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Live finance summary generated from current analytics and transaction data.</div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Btn variant="secondary" onClick={exportCsv}>Export CSV</Btn>
          <Btn variant="primary" onClick={() => onNavigate && onNavigate('ai-hub')}>Open AI Hub</Btn>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '14px 16px', background: '#F8F7F5', borderRadius: '12px', marginBottom: '20px', flexWrap: 'wrap', border: '1px solid #F1F0EE' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Plus Jakarta Sans', sans-serif", whiteSpace: 'nowrap' }}>Filters</span>
        <input value={filterSearch} onChange={e => setFilterSearch(e.target.value)} placeholder="Search vendor or ref #…"
          style={{ padding: '7px 11px', border: '1.5px solid #E2E8F0', borderRadius: '8px', fontSize: '12px', fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none', background: 'white', minWidth: 180 }} />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: '7px 11px', border: '1.5px solid #E2E8F0', borderRadius: '8px', fontSize: '12px', fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none', background: 'white', color: '#0F172A', cursor: 'pointer' }}>
          <option value="">All Statuses</option>
          {['SUBMITTED','PENDING_L1','PENDING_L2','PENDING_HOD','PENDING_FIN_L1','APPROVED','REJECTED','PAID','QUERY_RAISED'].map(s => (
            <option key={s} value={s}>{s.replace(/_/g,' ')}</option>
          ))}
        </select>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
          style={{ padding: '7px 11px', border: '1.5px solid #E2E8F0', borderRadius: '8px', fontSize: '12px', fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none', background: 'white', color: '#0F172A', cursor: 'pointer' }}>
          <option value="">All Categories</option>
          {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {allDepts.length > 0 && (
          <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
            style={{ padding: '7px 11px', border: '1.5px solid #E2E8F0', borderRadius: '8px', fontSize: '12px', fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none', background: 'white', color: '#0F172A', cursor: 'pointer' }}>
            <option value="">All Departments</option>
            {allDepts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        )}
        {(filterStatus || filterCategory || filterDept || filterSearch) && (
          <button onClick={() => { setFilterStatus(''); setFilterCategory(''); setFilterDept(''); setFilterSearch(''); }}
            style={{ padding: '7px 12px', borderRadius: '8px', border: 'none', background: '#FEE2E2', color: '#991B1B', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Clear ×
          </button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{recentRows.length} result{recentRows.length !== 1 ? 's' : ''}</span>
      </div>

      <StatsRow cards={[
        { label: 'YTD Spend', value: loading ? '…' : `₹${Math.round(spend?.ytd_total || 0).toLocaleString('en-IN')}`, delta: `${spend?.yoy_change_pct || 0}% YoY`, deltaType: (spend?.yoy_change_pct || 0) > 0 ? 'negative' : 'positive', color: '#E8783B' },
        { label: 'Avg Invoice Size', value: loading ? '…' : `₹${Math.round(spend?.avg_invoice_size || 0).toLocaleString('en-IN')}`, delta: `${topVendors.length} top vendors`, deltaType: 'neutral' },
        { label: 'Outstanding', value: loading ? '…' : `₹${Math.round(workingCapital?.total_outstanding || 0).toLocaleString('en-IN')}`, delta: `${workingCapital?.dpo_days || 0} DPO`, deltaType: 'neutral', color: '#F59E0B' },
        { label: 'Policy Violations', value: loading ? '…' : String(policy?.violation_count || 0), delta: `${policy?.compliance_rate_pct || 0}% compliant`, deltaType: (policy?.violation_count || 0) > 0 ? 'negative' : 'positive', color: (policy?.violation_count || 0) > 0 ? '#EF4444' : '#10B981', pulse: (policy?.violation_count || 0) > 0 },
      ]} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <Card style={{ padding: '22px' }}>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '16px', color: '#0F172A', marginBottom: '12px' }}>Spend Intelligence</div>
          <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.6, fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '14px' }}>{spend?.ai_insight || 'No AI insight available.'}</div>
          {(spend?.categories || []).slice(0, 5).map((cat) => (
            <div key={cat.category} style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{cat.category}</span>
                <span style={{ fontSize: '12px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{cat.pct}% · ₹{Math.round(cat.amount).toLocaleString('en-IN')}</span>
              </div>
              <div style={{ height: 8, background: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}><div style={{ height: '100%', width: `${cat.pct}%`, background: '#E8783B', borderRadius: 4 }} /></div>
            </div>
          ))}
        </Card>

        <Card style={{ padding: '22px' }}>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '16px', color: '#0F172A', marginBottom: '12px' }}>Budget Health</div>
          {topBudgets.slice(0, 5).map((budget) => (
            <div key={budget.id} style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{budget.name}</span>
                <span style={{ fontSize: '12px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{budget.utilization_pct || 0}%</span>
              </div>
              <div style={{ height: 8, background: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}><div style={{ height: '100%', width: `${Math.min(100, budget.utilization_pct || 0)}%`, background: (budget.alert_level === 'CRITICAL' ? '#EF4444' : budget.alert_level === 'WARNING' ? '#F59E0B' : '#10B981'), borderRadius: 4 }} /></div>
            </div>
          ))}
          {topBudgets.length === 0 && <div style={{ fontSize: '12px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>No budget data available.</div>}
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <Card style={{ padding: '22px' }}>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '16px', color: '#0F172A', marginBottom: '12px' }}>Top Vendors by Spend</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: '#F8F7F5' }}>{['Vendor', 'Type', 'Spend', 'Invoices'].map((h) => <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: '10px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{h}</th>)}</tr></thead>
            <tbody>
              {topVendors.map((v) => (
                <tr key={v.name} style={{ borderTop: '1px solid #F1F0EE', height: 44 }}>
                  <td style={{ padding: '0 10px', fontSize: '12px', fontWeight: 600, color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{v.name}</td>
                  <td style={{ padding: '0 10px', fontSize: '12px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{v.type}</td>
                  <td style={{ padding: '0 10px', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '13px', color: '#E8783B' }}>₹{Math.round(v.amount).toLocaleString('en-IN')}</td>
                  <td style={{ padding: '0 10px', fontSize: '12px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{v.invoices}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card style={{ padding: '22px' }}>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '16px', color: '#0F172A', marginBottom: '12px' }}>Vendor Risk</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: '#F8F7F5' }}>{['Vendor', 'Risk', 'Score', 'Anomalies'].map((h) => <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: '10px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{h}</th>)}</tr></thead>
            <tbody>
              {riskyVendors.map((v) => (
                <tr key={v.vendor_id} style={{ borderTop: '1px solid #F1F0EE', height: 44 }}>
                  <td style={{ padding: '0 10px', fontSize: '12px', fontWeight: 600, color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{v.vendor_name}</td>
                  <td style={{ padding: '0 10px' }}><ARLiveStatusBadge level={v.risk_level} /></td>
                  <td style={{ padding: '0 10px', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#64748B' }}>{v.risk_score}</td>
                  <td style={{ padding: '0 10px', fontSize: '12px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{v.anomaly_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <Card style={{ padding: '22px' }}>
        <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '16px', color: '#0F172A', marginBottom: '12px' }}>Recent Transactions</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: '#F8F7F5' }}>{['Date', 'Ref', 'Party', 'Purpose', 'Amount', 'Status'].map((h) => <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '10px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{h}</th>)}</tr></thead>
          <tbody>
            {recentRows.map((row) => (
              <tr key={row.id} style={{ borderTop: '1px solid #F1F0EE', height: 46 }}>
                <td style={{ padding: '0 12px', fontSize: '12px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{row.invoice_date ? new Date(row.invoice_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}</td>
                <td style={{ padding: '0 12px', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#E8783B' }}>{row.ref_no || String(row.id).slice(0, 8).toUpperCase()}</td>
                <td style={{ padding: '0 12px', fontSize: '12px', fontWeight: 600, color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{row.vendor_name || row.vendor?.name || row.submitted_by_name || '—'}</td>
                <td style={{ padding: '0 12px', fontSize: '12px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{(row.business_purpose || row.expense_category || 'General').slice(0, 40)}</td>
                <td style={{ padding: '0 12px', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '13px', color: '#0F172A' }}>₹{Math.round(row.total_amount || 0).toLocaleString('en-IN')}</td>
                <td style={{ padding: '0 12px' }}><StatusBadge status={row.status || row._status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

Object.assign(window, { LiveReportsScreen });
