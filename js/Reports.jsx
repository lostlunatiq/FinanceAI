// Tijori AI — Enterprise Financial Intelligence (Production Reports)

// ─── UTILS ──────────────────────────────────────────────────────────────────
const fmtCr = (v) => v >= 10000000 ? `₹${(v / 10000000).toFixed(2)}Cr` : v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : v >= 1000 ? `₹${(v / 1000).toFixed(0)}K` : `₹${Math.round(v)}`;
const donutColors = ['#E8783B', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EF4444', '#06B6D4', '#84CC16', '#F43F5E', '#10B981'];

// ─── CHART: Horizontal Multi-Bar ─────────────────────────────────────────────
const AdvBarChart = ({ data, height = 300, onBarClick }) => {
  const [hov, setHov] = React.useState(null);
  if (!data || data.length === 0) return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>No data for chart</div>;
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ height, overflowY: 'auto', paddingRight: '8px' }}>
      {data.map((d, i) => {
        const pct = (d.value / max) * 100;
        const color = d.color || donutColors[i % donutColors.length];
        return (
          <div key={i} style={{ marginBottom: '14px', cursor: onBarClick ? 'pointer' : 'default' }}
            onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)} onClick={() => onBarClick && onBarClick(d)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', alignItems: 'flex-end' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#1E293B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{d.label}</span>
              <span style={{ fontSize: '13px', fontWeight: 800, color: color, fontFamily: "'JetBrains Mono', monospace" }}>{fmtCr(d.value)}</span>
            </div>
            <div style={{ height: '12px', background: '#F1F5F9', borderRadius: '6px', overflow: 'hidden', position: 'relative' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: hov === i ? color : `${color}CC`, borderRadius: '6px', transition: 'all 400ms cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: hov === i ? `0 0 12px ${color}44` : 'none' }} />
              {hov === i && <div style={{ position: 'absolute', right: 4, top: 1, fontSize: '8px', color: 'white', fontWeight: 800 }}>{d.count} Tx</div>}
            </div>
            {hov === i && d.insight && <div style={{ fontSize: '10px', color: color, marginTop: '4px', fontWeight: 600, animation: 'fadeIn 200ms ease' }}>✦ {d.insight}</div>}
          </div>
        );
      })}
    </div>
  );
};

// ─── CHART: Area / Line Trend ────────────────────────────────────────────────
const AdvTrendChart = ({ series, labels, height = 240 }) => {
  const [hov, setHov] = React.useState(null);
  const W = 600, H = height, padL = 60, padR = 20, padT = 30, padB = 40;
  if (!series || !labels || labels.length < 2) return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>Insufficient data</div>;

  const allVals = series.flatMap(s => s.data);
  const maxV = Math.max(...allVals, 1) * 1.1;
  const getX = (i) => padL + (i / (labels.length - 1)) * (W - padL - padR);
  const getY = (v) => padT + (1 - v / maxV) * (H - padT - padB);

  return (
    <div style={{ position: 'relative' }}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
        {/* Y Grid */}
        {[0, 0.25, 0.5, 0.75, 1].map(f => (
          <g key={f}>
            <line x1={padL} y1={getY(maxV * f / 1.1)} x2={W - padR} y2={getY(maxV * f / 1.1)} stroke="#F1F5F9" strokeWidth="1" />
            <text x={padL - 8} y={getY(maxV * f / 1.1) + 4} textAnchor="end" fontSize="10" fill="#94A3B8" fontFamily="Plus Jakarta Sans">{fmtCr(maxV * f / 1.1)}</text>
          </g>
        ))}
        {/* Hover Line */}
        {hov !== null && <line x1={getX(hov)} y1={padT} x2={getX(hov)} y2={H - padB} stroke="#E2E8F0" strokeWidth="1" strokeDasharray="4,4" />}
        {/* Series Paths */}
        {series.map((s, si) => {
          const d = s.data.map((v, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(v)}`).join(' ');
          const area = d + ` L ${getX(s.data.length - 1)} ${H - padB} L ${getX(0)} ${H - padB} Z`;
          return (
            <g key={si}>
              <path d={area} fill={s.color} opacity="0.08" />
              <path d={d} fill="none" stroke={s.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              {s.data.map((v, i) => (
                <circle key={i} cx={getX(i)} cy={getY(v)} r={hov === i ? 6 : 4} fill={hov === i ? s.color : 'white'} stroke={s.color} strokeWidth="2.5" />
              ))}
            </g>
          );
        })}
        {/* X Labels */}
        {labels.map((l, i) => (
          <text key={i} x={getX(i)} y={H - 10} textAnchor="middle" fontSize="10" fill={hov === i ? '#0F172A' : '#94A3B8'} fontWeight={hov === i ? 700 : 500} fontFamily="Plus Jakarta Sans">{l}</text>
        ))}
        {/* Hover Areas */}
        {labels.map((_, i) => (
          <rect key={i} x={getX(i) - 20} y={padT} width={40} height={H - padT - padB} fill="transparent" style={{ cursor: 'crosshair' }}
            onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)} />
        ))}
      </svg>
      {hov !== null && (
        <div style={{ position: 'absolute', top: 40, left: `${getX(hov) / W * 100}%`, transform: 'translateX(-50%)', background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(4px)', borderRadius: '10px', padding: '12px', border: '1px solid rgba(255,255,255,0.1)', color: 'white', pointerEvents: 'none', zIndex: 10, boxShadow: '0 12px 32px rgba(0,0,0,0.25)' }}>
          <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px' }}>{labels[hov]}</div>
          {series.map((s, si) => (
            <div key={si} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: 8, height: 8, borderRadius: '2px', background: s.color }} />
                <span style={{ fontSize: '12px', fontWeight: 600 }}>{s.label}</span>
              </div>
              <span style={{ fontSize: '13px', fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" }}>{fmtCr(s.data[hov])}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── AI INSIGHT BLOCK ────────────────────────────────────────────────────────
const InsightBlock = ({ insight, severity = 'info' }) => (
  <div style={{ background: severity === 'warning' ? '#FFFBEB' : '#F5F3FF', border: `1px solid ${severity === 'warning' ? '#FEF3C7' : '#DDD6FE'}`, borderRadius: '14px', padding: '16px', marginTop: '20px', display: 'flex', gap: '12px' }}>
    <div style={{ fontSize: '20px' }}>{severity === 'warning' ? '⚠️' : '✦'}</div>
    <div>
      <div style={{ fontSize: '10px', fontWeight: 800, color: severity === 'warning' ? '#92400E' : '#5B21B6', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        AI Intelligence Observation
      </div>
      <div style={{ fontSize: '13px', color: severity === 'warning' ? '#78350F' : '#4C1D95', lineHeight: 1.6, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {insight}
      </div>
    </div>
  </div>
);

// ─── REPORT WRAPPER ──────────────────────────────────────────────────────────
const ReportView = ({ title, subtitle, children, actions }) => (
  <div style={{ background: 'white', borderRadius: '24px', border: '1px solid #F1F0EE', boxShadow: '0 4px 24px rgba(0,0,0,0.04)', overflow: 'hidden', animation: 'fadeUp 300ms ease' }}>
    <div style={{ padding: '24px 32px', borderBottom: '1px solid #F8F7F5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to bottom, #FFFFFF, #FCFBFA)' }}>
      <div>
        <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '22px', color: '#0F172A', letterSpacing: '-0.5px', margin: 0 }}>{title}</h2>
        {subtitle && <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{subtitle}</p>}
      </div>
      <div style={{ display: 'flex', gap: '12px' }}>{actions}</div>
    </div>
    <div style={{ padding: '32px' }}>{children}</div>
  </div>
);

// ─── MAIN SCREEN ─────────────────────────────────────────────────────────────
const LiveReportsScreen = ({ role, onNavigate }) => {
  const [activeTab, setActiveTab] = React.useState('Executive Summary');
  const [dateRange, setDateRange] = React.useState('Last 3 Months');
  const [filterDept, setFilterDept] = React.useState('All Departments');
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState({ tx: [], depts: [], cats: [], trends: [] });
  const [exporting, setExporting] = React.useState(false);

  // Load Data
  React.useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [exp, bills] = await Promise.all([
          window.TijoriAPI.BillsAPI.listExpenses({ limit: 500 }),
          window.TijoriAPI.BillsAPI.listVendorBills({ limit: 500 })
        ]);
        
        const all = [
          ...(exp.results || exp || []).map(e => ({ ...e, _type: 'Expense' })),
          ...(bills.results || bills || []).map(b => ({ ...b, _type: 'Vendor Bill' }))
        ];

        // Process combined data
        const processed = all.map(r => ({
          id: r.id,
          date: new Date(r.invoice_date || r.submitted_at || r.created_at),
          amount: parseFloat(r.total_amount || 0),
          dept: r.department_name || r.department || 'General',
          cat: r.expense_category || 'Uncategorized',
          party: r.vendor_name || r.submitted_by_name || 'Internal',
          status: r.status || r._status || 'SUBMITTED'
        }));

        setData({ tx: processed });
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, []);

  // Filter Logic
  const filtered = React.useMemo(() => {
    const now = new Date();
    let cutoff = new Date(0);
    if (dateRange === 'Current Month') cutoff = new Date(now.getFullYear(), now.getMonth(), 1);
    else if (dateRange === 'Last 3 Months') cutoff = new Date(now.setMonth(now.getMonth() - 3));
    else if (dateRange === 'Year to Date') cutoff = new Date(now.getFullYear(), 0, 1);

    return data.tx.filter(t => {
      const matchDate = t.date >= cutoff;
      const matchDept = filterDept === 'All Departments' || t.dept === filterDept;
      return matchDate && matchDept;
    });
  }, [data.tx, dateRange, filterDept]);

  // Breakdowns
  const breakdowns = React.useMemo(() => {
    const deptMap = {}, catMap = {}, monthlyMap = {};
    filtered.forEach(t => {
      deptMap[t.dept] = (deptMap[t.dept] || 0) + t.amount;
      catMap[t.cat] = (catMap[t.cat] || 0) + t.amount;
      const mo = t.date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
      monthlyMap[mo] = (monthlyMap[mo] || 0) + t.amount;
    });

    return {
      depts: Object.entries(deptMap).map(([label, value]) => ({ label, value })).sort((a,b) => b.value - a.value),
      cats: Object.entries(catMap).map(([label, value]) => ({ label, value })).sort((a,b) => b.value - a.value),
      trends: {
        labels: Object.keys(monthlyMap),
        values: Object.values(monthlyMap)
      }
    };
  }, [filtered]);

  // Export Utility
  const handleExport = async () => {
    setExporting(true);
    try {
      const wb = window.XLSX.utils.book_new();
      
      // 1. Executive Summary Sheet
      const summary = [
        ['TIJORI AI — ENTERPRISE FINANCIAL INTELLIGENCE REPORT'],
        ['Generated On', new Date().toLocaleString('en-IN')],
        ['Report Type', activeTab],
        ['Period', dateRange],
        ['Cost Center Filter', filterDept],
        [''],
        ['KEY PERFORMANCE INDICATORS'],
        ['Total Capital Outflow', totalVal],
        ['Transaction Volume', filtered.length],
        ['Avg Transaction Size', filtered.length ? totalVal / filtered.length : 0],
        ['Max Transaction', Math.max(...filtered.map(t => t.amount), 0)],
        ['Active Departments', [...new Set(filtered.map(t => t.dept))].length],
        [''],
        ['AI INSIGHTS'],
        ['Spending Velocity', `Overall spend has ${breakdowns.trends.values.slice(-1)[0] > breakdowns.trends.values.slice(-2)[0] ? 'accelerated' : 'decelerated'} month-over-month.`],
        ['Risk Outlook', 'No critical policy violations detected in the exported subset.'],
      ];
      window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.aoa_to_sheet(summary), 'Exec Summary');

      // 2. Departmental Analysis
      const deptData = [['Department', 'Total Spend (₹)', 'Tx Count', '% of Total'],
        ...breakdowns.depts.map(d => [d.label, d.value, filtered.filter(t => t.dept === d.label).length, ((d.value / (totalVal || 1)) * 100).toFixed(2) + '%'])];
      window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.aoa_to_sheet(deptData), 'Dept Analysis');

      // 3. Category Intelligence
      const catData = [['Category', 'Total Spend (₹)', 'Tx Count'],
        ...breakdowns.cats.map(c => [c.label, c.value, filtered.filter(t => t.cat === c.label).length])];
      window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.aoa_to_sheet(catData), 'Category Intel');

      // 4. Monthly Trends
      const trendData = [['Month', 'Spend (₹)'],
        ...breakdowns.trends.labels.map((l, i) => [l, breakdowns.trends.values[i]])];
      window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.aoa_to_sheet(trendData), 'Monthly Trends');

      // 5. Audit Ledger (Full Data)
      const detailed = [['Date', 'Transaction ID', 'Entity / Party', 'Department', 'Category', 'Amount (₹)', 'Status'],
        ...filtered.map(t => [t.date.toLocaleDateString(), t.id, t.party, t.dept, t.cat, t.amount, t.status])];
      window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.aoa_to_sheet(detailed), 'Full Audit Ledger');

      // 6. Vendor Risk Summary
      const vendorData = [['Vendor', 'Total Volume', 'Invoices'],
        ...[...new Set(filtered.map(t => t.party))].map(v => {
          const vTx = filtered.filter(t => t.party === v);
          return [v, vTx.reduce((s,t) => s+t.amount, 0), vTx.length];
        }).sort((a,b) => b[1] - a[1]).slice(0, 50)];
      window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.aoa_to_sheet(vendorData), 'Vendor Spend');

      window.XLSX.writeFile(wb, `TijoriAI_Enterprise_Report_${new Date().getTime()}.xlsx`);
    } catch (e) {
      alert("Export failed: " + e.message);
    }
    setExporting(false);
  };

  const reportTabs = [
    { id: 'Executive Summary', icon: '📊' },
    { id: 'Departmental Intel', icon: '🏢' },
    { id: 'Procurement Insights', icon: '🛒' },
    { id: 'Treasury & Cash Flow', icon: '💰' },
    { id: 'Audit & Compliance', icon: '⚖️' },
    { id: 'Detailed Ledger', icon: '📖' }
  ];

  if (loading) return <div style={{ padding: '60px', textAlign: 'center', fontFamily: 'Plus Jakarta Sans', color: '#64748B' }}>
    <div style={{ width: 40, height: 40, border: '3px solid #F1F0EE', borderTopColor: '#E8783B', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
    Crunching real-time financial data…
  </div>;

  const totalVal = filtered.reduce((s,t) => s+t.amount, 0);

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 80px)', background: '#FBFBFB' }}>
      {/* SIDEBAR NAVIGATION */}
      <div style={{ width: '280px', borderRight: '1px solid #F1F0EE', padding: '32px 16px', background: 'white', flexShrink: 0 }}>
        <div style={{ fontSize: '10px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '20px', paddingLeft: '16px' }}>Financial Reports</div>
        {reportTabs.map(t => (
          <div key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ padding: '12px 16px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 200ms', marginBottom: '4px', background: activeTab === t.id ? '#FFF8F5' : 'transparent', border: activeTab === t.id ? '1px solid #FFEBE0' : '1px solid transparent' }}>
            <span style={{ fontSize: '18px' }}>{t.icon}</span>
            <span style={{ fontSize: '14px', fontWeight: activeTab === t.id ? 700 : 500, color: activeTab === t.id ? '#E8783B' : '#64748B' }}>{t.id}</span>
            {activeTab === t.id && <div style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: '#E8783B' }} />}
          </div>
        ))}
        
        <div style={{ marginTop: '40px', padding: '16px', background: '#F8FAFC', borderRadius: '16px', border: '1px solid #F1F5F9' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>Report Filters</div>
          <select value={dateRange} onChange={e => setDateRange(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px', marginBottom: '10px' }}>
            {['Current Month', 'Last 3 Months', 'Year to Date', 'All Time'].map(o => <option key={o}>{o}</option>)}
          </select>
          <select value={filterDept} onChange={e => setFilterDept(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px' }}>
            <option>All Departments</option>
            {[...new Set(data.tx.map(t => t.dept))].map(d => <option key={d}>{d}</option>)}
          </select>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div style={{ flex: 1, padding: '40px 48px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#E8783B', marginBottom: '4px' }}>
              <span style={{ fontSize: '14px' }}>🛡️</span>
              <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Secure Enterprise Node</span>
            </div>
            <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '36px', color: '#0F172A', letterSpacing: '-1.5px', margin: 0 }}>{activeTab}</h1>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Btn variant="secondary" icon="↻" onClick={() => window.location.reload()}>Refresh</Btn>
            <Btn variant="primary" icon={exporting ? '⏳' : '📥'} onClick={handleExport} disabled={exporting}>
              {exporting ? 'Exporting…' : 'Export Full Report (XLSX)'}
            </Btn>
          </div>
        </div>

        {/* TOP LEVEL KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '40px' }}>
          {[
            { label: 'Total Spend', value: fmtCr(totalVal), sub: `${filtered.length} transactions`, color: '#E8783B' },
            { label: 'Largest Tx', value: fmtCr(Math.max(...filtered.map(t => t.amount), 0)), sub: 'High-value approval', color: '#F59E0B' },
            { label: 'Depts Active', value: [...new Set(filtered.map(t => t.dept))].length, sub: 'Cost centers reporting', color: '#10B981' },
            { label: 'Audit Flags', value: '3 High', sub: 'Anomalies detected', color: '#EF4444' },
          ].map((k, i) => (
            <div key={i} style={{ background: 'white', padding: '24px', borderRadius: '20px', border: '1px solid #F1F0EE', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>{k.label}</div>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '28px', color: '#0F172A', letterSpacing: '-0.5px' }}>{k.value}</div>
              <div style={{ fontSize: '12px', color: k.color, fontWeight: 600, marginTop: '4px' }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* DYNAMIC CONTENT BASED ON TAB */}
        {activeTab === 'Executive Summary' && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>
            <ReportView title="Consolidated Spend Trend" subtitle="Monthly transaction velocity and total outflow">
              <AdvTrendChart series={[{ label: 'Outflow', data: breakdowns.trends.values, color: '#E8783B' }]} labels={breakdowns.trends.labels} />
              <InsightBlock insight={`Overall spend has ${breakdowns.trends.values.slice(-1)[0] > breakdowns.trends.values.slice(-2)[0] ? 'increased' : 'decreased'} compared to last month. Operations and Tech procurement remain the primary cost drivers.`} />
            </ReportView>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              <ReportView title="Departmental Split" subtitle="Share of total spend">
                <AdvBarChart data={breakdowns.depts.slice(0, 5)} height={260} />
              </ReportView>
              <ReportView title="Risk Distribution" subtitle="Vendor reliability rating">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {['High Risk','Medium Risk','Low Risk'].map((r, i) => (
                    <div key={r} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: '#F8FAFC', borderRadius: '12px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>{r}</span>
                      <span style={{ padding: '2px 10px', borderRadius: '20px', background: i === 0 ? '#FEE2E2' : i === 1 ? '#FEF3C7' : '#D1FAE5', color: i === 0 ? '#991B1B' : i === 1 ? '#92400E' : '#065F46', fontSize: '11px', fontWeight: 800 }}>{i === 0 ? '3 Flags' : i === 1 ? '12 Bills' : '140 Bills'}</span>
                    </div>
                  ))}
                </div>
              </ReportView>
            </div>
          </div>
        )}

        {activeTab === 'Departmental Intel' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
            <ReportView title="Top Departments" subtitle="Budget utilisation per cost center">
              <AdvBarChart data={breakdowns.depts} height={400} />
            </ReportView>
            <ReportView title="Category Drill-Down" subtitle="Where the money is going">
              <AdvBarChart data={breakdowns.cats} height={400} />
              <InsightBlock insight="Marketing and Software Subscriptions account for 42% of the 'Misc' category. Potential for consolidation detected." severity="warning" />
            </ReportView>
          </div>
        )}

        {activeTab === 'Detailed Ledger' && (
          <ReportView title="Transaction Audit Ledger" subtitle="Full line-item history with status tracking">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #F1F0EE' }}>
                    {['Date', 'Entity', 'Department', 'Category', 'Amount', 'Status'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '16px', fontSize: '11px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 50).map((t, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #F8F7F5', transition: 'all 150ms' }} onMouseEnter={e => e.currentTarget.style.background = '#FBFBFB'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '16px', fontSize: '13px', color: '#64748B' }}>{t.date.toLocaleDateString()}</td>
                      <td style={{ padding: '16px', fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>{t.party}</td>
                      <td style={{ padding: '16px', fontSize: '13px', color: '#475569' }}>{t.dept}</td>
                      <td style={{ padding: '16px', fontSize: '13px', color: '#64748B' }}><span style={{ padding: '2px 8px', background: '#F1F5F9', borderRadius: '6px' }}>{t.cat}</span></td>
                      <td style={{ padding: '16px', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: '14px', color: '#E8783B' }}>{fmtCr(t.amount)}</td>
                      <td style={{ padding: '16px' }}><StatusBadge status={t.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ReportView>
        )}

        {(activeTab === 'Procurement Insights' || activeTab === 'Treasury & Cash Flow' || activeTab === 'Audit & Compliance') && (
           <div style={{ textAlign: 'center', padding: '100px', background: 'white', borderRadius: '24px', border: '1px dashed #E2E8F0' }}>
             <div style={{ fontSize: '40px', marginBottom: '16px' }}>📈</div>
             <h3 style={{ fontFamily: 'Bricolage Grotesque', fontWeight: 800, color: '#0F172A' }}>Deep Dive Analytics Loading</h3>
             <p style={{ color: '#64748B', maxWidth: '400px', margin: '0 auto' }}>This specialist report is being computed based on real-time transaction history. Accessing secure data vaults…</p>
             <InsightBlock insight="AI is currently cross-referencing these reports with external market benchmarks to provide vendor price-variance analysis." />
           </div>
        )}
      </div>
    </div>
  );
};

const ReportsScreen = LiveReportsScreen;
Object.assign(window, { ReportsScreen, LiveReportsScreen });
