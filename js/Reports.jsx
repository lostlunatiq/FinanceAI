// Tijori AI — Enterprise Financial Intelligence (Production Reports)

// ─── UTILS ──────────────────────────────────────────────────────────────────
const fmtCr = (v) => v >= 10000000 ? `₹${(v / 10000000).toFixed(2)}Cr` : v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : v >= 1000 ? `₹${(v / 1000).toFixed(0)}K` : `₹${Math.round(v)}`;
const donutColors = ['#E8783B', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EF4444', '#06B6D4', '#84CC16', '#F43F5E', '#14B8A6'];

// ─── CHART: Horizontal Multi-Bar ─────────────────────────────────────────────
const AdvBarChart = ({ data, height = 300, onBarClick, valueLabel = '₹' }) => {
  const [hov, setHov] = React.useState(null);
  if (!data || data.length === 0) return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>No data for chart</div>;
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ height, overflowY: 'auto', paddingRight: '8px' }}>
      {data.map((d, i) => {
        const pct = (d.value / max) * 100;
        const color = d.color || donutColors[i % donutColors.length];
        const valStr = valueLabel === '₹' ? fmtCr(d.value) : `${d.value} ${valueLabel}`;
        return (
          <div key={i} style={{ marginBottom: '14px', cursor: onBarClick ? 'pointer' : 'default' }}
            onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)} onClick={() => onBarClick && onBarClick(d)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', alignItems: 'flex-end' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#1E293B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{d.label}</span>
              <span style={{ fontSize: '13px', fontWeight: 800, color: color, fontFamily: "'JetBrains Mono', monospace" }}>{valStr}</span>
            </div>
            <div style={{ height: '12px', background: '#F1F5F9', borderRadius: '6px', overflow: 'hidden', position: 'relative' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: hov === i ? color : `${color}CC`, borderRadius: '6px', transition: 'all 400ms cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: hov === i ? `0 0 12px ${color}44` : 'none' }} />
              {hov === i && d.count !== undefined && <div style={{ position: 'absolute', right: 4, top: 1, fontSize: '8px', color: 'white', fontWeight: 800 }}>{d.count} Tx</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── CHART: Area / Line Trend ────────────────────────────────────────────────
const AdvTrendChart = ({ series, labels, height = 240 }) => {
  const [hov, setHov] = React.useState(null);
  if (!series || !labels || labels.length === 0) return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>Insufficient data</div>;

  const mainSeries = series[0];
  const allVals = mainSeries.data;
  const maxV = Math.max(...allVals, 1) * 1.1;

  return (
    <div style={{ height, display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '20px 10px 0', borderBottom: '1px solid #F1F0EE', position: 'relative' }}>
        {labels.map((l, i) => {
          const val = mainSeries.data[i];
          const pct = (val / Math.max(maxV, 1)) * 100;
          return (
            <div key={i} style={{ width: '100%', display: 'flex', justifyContent: 'center', position: 'relative', height: '100%', alignItems: 'flex-end', cursor: 'pointer' }}
              onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)}>
              <div style={{ position: 'absolute', inset: 0, background: hov === i ? '#F8FAFC' : 'transparent', zIndex: 0, transition: 'background 150ms' }} />
              <div style={{ width: '60%', maxWidth: '40px', height: `${pct}%`, background: hov === i ? mainSeries.color : `${mainSeries.color}DD`, borderRadius: '4px 4px 0 0', zIndex: 1, transition: 'all 300ms ease', position: 'relative', boxShadow: hov === i ? `0 0 12px ${mainSeries.color}44` : 'none' }}>
                {hov === i && (
                  <div style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '8px', background: '#0F172A', color: 'white', padding: '6px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 10, animation: 'fadeUp 150ms ease' }}>
                    {fmtCr(val)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 10px 0' }}>
        {labels.map((l, i) => (
          <div key={i} style={{ width: '100%', textAlign: 'center', fontSize: '10px', color: hov === i ? '#0F172A' : '#94A3B8', fontWeight: hov === i ? 700 : 500, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {l}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── CHART: Donut ─────────────────────────────────────────────────────────────
const AdvDonutChart = ({ slices, size = 200 }) => {
  const [hov, setHov] = React.useState(null);
  if (!slices || slices.length === 0) return <div style={{ height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>No data</div>;
  const total = slices.reduce((s, d) => s + d.value, 0) || 1;
  
  let currentPct = 0;
  const segments = slices.map((s, i) => {
    const pct = (s.value / total) * 100;
    const start = currentPct;
    currentPct += pct;
    const color = s.color || donutColors[i % donutColors.length];
    return { ...s, start, end: currentPct, pct: pct.toFixed(1), idx: i, color };
  });

  const gradient = segments.map(s => `${s.color} ${s.start}% ${s.end}%`).join(', ');

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          borderRadius: '50%',
          background: `conic-gradient(${gradient})`,
          transition: 'all 300ms ease',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
        }}></div>
        <div style={{
          position: 'absolute', top: '25%', left: '25%', right: '25%', bottom: '25%',
          background: 'white', borderRadius: '50%',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.05)', zIndex: 2
        }}>
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', fontFamily: "'Bricolage Grotesque', sans-serif" }}>
            {hov !== null ? segments[hov].pct + '%' : '100%'}
          </div>
          <div style={{ fontSize: '10px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif", textAlign: 'center', padding: '0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
            {hov !== null ? segments[hov].label : 'Total'}
          </div>
        </div>
      </div>
      <div style={{ flex: 1, minWidth: '160px', maxHeight: size, overflowY: 'auto' }}>
        {segments.map((a) => (
          <div key={a.idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', cursor: 'pointer', opacity: hov !== null && hov !== a.idx ? 0.4 : 1, transition: 'opacity 200ms' }}
            onMouseEnter={() => setHov(a.idx)} onMouseLeave={() => setHov(null)}>
            <span style={{ width: 12, height: 12, borderRadius: '4px', background: a.color, flexShrink: 0 }} />
            <span style={{ fontSize: '11px', color: '#475569', fontFamily: "'Plus Jakarta Sans', sans-serif", flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.label}</span>
            <span style={{ fontSize: '12px', fontWeight: 800, color: a.color, fontFamily: "'JetBrains Mono', monospace" }}>{a.pct}%</span>
          </div>
        ))}
      </div>
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
    <div style={{ padding: '20px 32px', borderBottom: '1px solid #F8F7F5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to bottom, #FFFFFF, #FCFBFA)' }}>
      <div>
        <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '20px', color: '#0F172A', letterSpacing: '-0.5px', margin: 0 }}>{title}</h2>
        {subtitle && <p style={{ fontSize: '12px', color: '#64748B', margin: '4px 0 0 0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{subtitle}</p>}
      </div>
      <div style={{ display: 'flex', gap: '12px' }}>{actions}</div>
    </div>
    <div style={{ padding: '32px' }}>{children}</div>
  </div>
);

// ─── AI REPORT MODAL ─────────────────────────────────────────────────────────
const AIReportModal = ({ title, content, loading, onClose }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }} onClick={onClose}>
    <div style={{ background: 'white', borderRadius: '24px', padding: '40px', maxWidth: '800px', width: '100%', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '22px', color: '#0F172A', margin: 0 }}>{title}</h2>
        <button onClick={onClose} style={{ background: '#F1F5F9', border: 'none', borderRadius: '10px', padding: '8px 14px', cursor: 'pointer', fontSize: '14px', color: '#64748B' }}>✕ Close</button>
      </div>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748B' }}>
          <div style={{ width: 36, height: 36, border: '3px solid #F1F0EE', borderTopColor: '#E8783B', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          AI is generating your report…
        </div>
      ) : (
        <div style={{ fontSize: '14px', lineHeight: 1.8, color: '#374151', fontFamily: "'Plus Jakarta Sans', sans-serif", whiteSpace: 'pre-wrap' }}>{content}</div>
      )}
    </div>
  </div>
);

// ─── MAIN SCREEN ─────────────────────────────────────────────────────────────
const LiveReportsScreen = ({ role, onNavigate }) => {
  const [activeTab, setActiveTab] = React.useState('Executive Summary');
  const [dateRange, setDateRange] = React.useState('Last 3 Months');
  const [filterDept, setFilterDept] = React.useState('All Departments');
  const [filterStatus, setFilterStatus] = React.useState('All Statuses');
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState({ tx: [] });
  const [exporting, setExporting] = React.useState(false);
  const [sortConfig, setSortConfig] = React.useState({ key: 'date', direction: 'desc' });
  const [aiInsight, setAiInsight] = React.useState('');
  const [modal, setModal] = React.useState(null); // { title, content, loading }
  const [sweeping, setSweeping] = React.useState(false);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  // Load Data
  React.useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [exp, bills, spendData] = await Promise.all([
          window.TijoriAPI.BillsAPI.listExpenses({ limit: 800 }),
          window.TijoriAPI.BillsAPI.listVendorBills({ limit: 800 }),
          window.TijoriAPI.AnalyticsAPI.spendIntelligence().catch(() => null),
        ]);

        const all = [
          ...(exp.results || exp || []).map(e => ({ ...e, _type: 'Expense' })),
          ...(bills.results || bills || []).map(b => ({ ...b, _type: 'Vendor Bill' }))
        ];

        const processed = all.map(r => ({
          id: r.id,
          date: new Date(r.invoice_date || r.submitted_at || r.created_at),
          amount: parseFloat(r.total_amount || 0),
          dept: r.department || r.department_name || 'General',
          cat: r.expense_category || 'Uncategorized',
          party: r.vendor_name || r.submitted_by_name || 'Internal',
          status: r.status || r._status || 'SUBMITTED',
          anomaly_severity: r.anomaly_severity || 'NONE',
          anomaly_score: r.anomaly_score || (r.anomaly_severity === 'CRITICAL' ? 95 : r.anomaly_severity === 'HIGH' ? 85 : r.anomaly_severity === 'MEDIUM' ? 65 : 10),
        }));

        setData({ tx: processed });
        if (spendData && spendData.ai_insight) setAiInsight(spendData.ai_insight);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, []);

  // Generate 10-Q AI Report
  const handle10Q = async () => {
    setModal({ title: '10-Q Regulatory Filing Draft', content: '', loading: true });
    try {
      const result = await window.TijoriAPI.AnalyticsAPI.generate10Q();
      setModal({ title: `${result.title || '10-Q Filing Draft'}`, content: result.content || result.sections?.executive_summary || 'No content generated.', loading: false });
    } catch (e) {
      setModal({ title: '10-Q Filing Draft', content: 'Failed to generate report: ' + e.message, loading: false });
    }
  };

  // Run Audit Sweep
  const handleAuditSweep = async () => {
    setSweeping(true);
    try {
      const result = await window.TijoriAPI.AnalyticsAPI.auditSweep();
      const msg = result.scanned
        ? `Audit sweep complete. Scanned ${result.scanned} invoices, flagged ${result.flagged || 0} anomalies.`
        : JSON.stringify(result, null, 2);
      setModal({ title: 'Audit Sweep Results', content: msg, loading: false });
    } catch (e) {
      setModal({ title: 'Audit Sweep Results', content: 'Sweep failed: ' + e.message, loading: false });
    }
    setSweeping(false);
  };

  // Filter Logic
  const filtered = React.useMemo(() => {
    const now = new Date();
    let cutoff = new Date(0);
    if (dateRange === 'Current Month') cutoff = new Date(now.getFullYear(), now.getMonth(), 1);
    else if (dateRange === 'Last 3 Months') cutoff = new Date(now.setMonth(now.getMonth() - 3));
    else if (dateRange === 'Last 6 Months') cutoff = new Date(now.setMonth(now.getMonth() - 6));
    else if (dateRange === 'Year to Date') cutoff = new Date(now.getFullYear(), 0, 1);

    const filteredData = data.tx.filter(t => {
      const matchDate = t.date >= cutoff;
      const matchDept = filterDept === 'All Departments' || t.dept === filterDept;
      const matchStatus = filterStatus === 'All Statuses' || t.status === filterStatus;
      return matchDate && matchDept && matchStatus;
    });

    filteredData.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      if (sortConfig.key === 'party') { aVal = a.party; bVal = b.party; }
      if (sortConfig.key === 'dept') { aVal = a.dept; bVal = b.dept; }
      if (sortConfig.key === 'cat') { aVal = a.cat; bVal = b.cat; }
      
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return filteredData;
  }, [data.tx, dateRange, filterDept, filterStatus, sortConfig]);

  // Comprehensive Breakdowns for 10+ Graphs
  const breakdowns = React.useMemo(() => {
    const deptMap = {}, catMap = {}, monthlyMap = {}, monthlyCountMap = {}, vendorMap = {};
    const statusMap = {}, riskMap = { 'High Risk': 0, 'Medium Risk': 0, 'Low Risk': 0 };
    const paidVsPendingMap = { 'Settled (Paid/Posted)': 0, 'Pending/Processing': 0, 'Rejected': 0 };
    const deptVolumeMap = {};
    const deptAnomalousSpend = {};

    filtered.forEach(t => {
      // 1. Dept Spend
      deptMap[t.dept] = (deptMap[t.dept] || 0) + t.amount;
      // 2. Cat Spend
      catMap[t.cat] = (catMap[t.cat] || 0) + t.amount;
      // 3. Monthly Spend + Count (for correct avg calculation)
      const mo = t.date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
      monthlyMap[mo] = (monthlyMap[mo] || 0) + t.amount;
      monthlyCountMap[mo] = (monthlyCountMap[mo] || 0) + 1;
      // 4. Vendor Spend
      if (t.party !== 'Internal') {
        vendorMap[t.party] = (vendorMap[t.party] || 0) + t.amount;
      }
      // 5. Status Dist
      statusMap[t.status] = (statusMap[t.status] || 0) + 1;

      // 6. Paid vs Pending
      if (['PAID', 'POSTED_D365'].includes(t.status)) paidVsPendingMap['Settled (Paid/Posted)'] += t.amount;
      else if (['REJECTED', 'AUTO_REJECT'].includes(t.status)) paidVsPendingMap['Rejected'] += t.amount;
      else paidVsPendingMap['Pending/Processing'] += t.amount;

      // 7. Risk
      if (t.anomaly_severity === 'CRITICAL' || t.anomaly_severity === 'HIGH') {
        riskMap['High Risk']++;
        deptAnomalousSpend[t.dept] = (deptAnomalousSpend[t.dept] || 0) + t.amount;
      } else if (t.anomaly_severity === 'MEDIUM') {
        riskMap['Medium Risk']++;
        deptAnomalousSpend[t.dept] = (deptAnomalousSpend[t.dept] || 0) + (t.amount * 0.5);
      } else {
        riskMap['Low Risk']++;
      }

      // 8. Dept Volume
      deptVolumeMap[t.dept] = (deptVolumeMap[t.dept] || 0) + 1;
    });

    const sortMap = (m) => Object.entries(m).map(([label, value]) => ({ label, value })).sort((a,b) => b.value - a.value);

    // Ensure chronological order for trends
    const sortedMonths = Object.keys(monthlyMap).sort((a, b) => {
      const [m1, y1] = a.split(' '); const [m2, y2] = b.split(' ');
      return new Date(`1 ${m1} 20${y1}`) - new Date(`1 ${m2} 20${y2}`);
    });

    return {
      depts: sortMap(deptMap),
      cats: sortMap(catMap),
      vendors: sortMap(vendorMap),
      statuses: sortMap(statusMap),
      risks: Object.entries(riskMap).map(([label, value]) => ({ label, value })),
      paidVsPending: Object.entries(paidVsPendingMap).map(([label, value]) => ({ label, value })),
      deptVolume: sortMap(deptVolumeMap),
      riskDepts: Object.entries(deptAnomalousSpend).map(([label, value]) => ({ label, value, color: '#EF4444' })).sort((a,b)=>b.value-a.value),
      trends: {
        labels: sortedMonths,
        values: sortedMonths.map(m => monthlyMap[m]),
        avgValues: sortedMonths.map(m => monthlyCountMap[m] > 0 ? monthlyMap[m] / monthlyCountMap[m] : 0),
      }
    };
  }, [filtered]);

  // Export Utility
  const handleExport = async () => {
    setExporting(true);
    try {
      const wb = window.XLSX.utils.book_new();
      const totalVal = filtered.reduce((s,t) => s+t.amount, 0);
      
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
      ];
      window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.aoa_to_sheet(summary), 'Exec Summary');

      const deptData = [['Department', 'Total Spend (₹)', '% of Total'], ...breakdowns.depts.map(d => [d.label, d.value, ((d.value / (totalVal || 1)) * 100).toFixed(2) + '%'])];
      window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.aoa_to_sheet(deptData), 'Dept Analysis');

      const catData = [['Category', 'Total Spend (₹)'], ...breakdowns.cats.map(c => [c.label, c.value])];
      window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.aoa_to_sheet(catData), 'Category Intel');

      const trendData = [['Month', 'Spend (₹)'], ...breakdowns.trends.labels.map((l, i) => [l, breakdowns.trends.values[i]])];
      window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.aoa_to_sheet(trendData), 'Monthly Trends');

      const detailed = [['Date', 'Transaction ID', 'Entity / Party', 'Department', 'Category', 'Amount (₹)', 'Status'],
        ...filtered.map(t => [t.date.toLocaleDateString(), t.id, t.party, t.dept, t.cat, t.amount, t.status])];
      window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.aoa_to_sheet(detailed), 'Full Audit Ledger');

      window.XLSX.writeFile(wb, `TijoriAI_Enterprise_Report_${new Date().getTime()}.xlsx`);
    } catch (e) { alert("Export failed: " + e.message); }
    setExporting(false);
  };

  // Annual Report state
  const [annualData, setAnnualData] = React.useState(null);
  const [annualYear, setAnnualYear] = React.useState(new Date().getFullYear());
  const [annualLoading, setAnnualLoading] = React.useState(false);

  const loadAnnualReport = async (yr) => {
    setAnnualLoading(true);
    try {
      const data = await window.TijoriAPI.AnalyticsAPI.annualReport(yr || annualYear);
      setAnnualData(data);
    } catch (e) {
      console.error('Annual report failed:', e);
    }
    setAnnualLoading(false);
  };

  React.useEffect(() => {
    if (activeTab === 'Annual Report' && !annualData) loadAnnualReport(annualYear);
  }, [activeTab]);

  const handlePrint = () => window.print();

  const reportTabs = [
    { id: 'Executive Summary', icon: '📊' },
    { id: 'Departmental Intel', icon: '🏢' },
    { id: 'Procurement Insights', icon: '🛒' },
    { id: 'Treasury & Cash Flow', icon: '💰' },
    { id: 'Audit & Compliance', icon: '⚖️' },
    { id: 'Detailed Ledger', icon: '📖' },
    { id: 'Annual Report', icon: '📅' },
  ];

  if (loading) return <div style={{ padding: '60px', textAlign: 'center', fontFamily: 'Plus Jakarta Sans', color: '#64748B' }}>
    <div style={{ width: 40, height: 40, border: '3px solid #F1F0EE', borderTopColor: '#E8783B', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
    Crunching real-time financial data…
  </div>;

  const totalVal = filtered.reduce((s,t) => s+t.amount, 0);

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 80px)', background: '#FBFBFB' }}>
      {modal && <AIReportModal title={modal.title} content={modal.content} loading={modal.loading} onClose={() => setModal(null)} />}
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
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
            Report Filters
            <span style={{ color: '#E8783B', cursor: 'pointer' }} onClick={() => { setFilterDept('All Departments'); setFilterStatus('All Statuses'); }}>Clear</span>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Date Range</label>
            <select value={dateRange} onChange={e => setDateRange(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px', outline: 'none' }}>
              {['Current Month', 'Last 3 Months', 'Last 6 Months', 'Year to Date', 'All Time'].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Department</label>
            <select value={filterDept} onChange={e => setFilterDept(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px', outline: 'none' }}>
              <option>All Departments</option>
              {[...new Set(data.tx.map(t => t.dept))].filter(Boolean).map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Status</label>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px', outline: 'none' }}>
              <option>All Statuses</option>
              {[...new Set(data.tx.map(t => t.status))].filter(Boolean).map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
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
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Btn variant="secondary" icon={sweeping ? '⏳' : '🔍'} onClick={handleAuditSweep} disabled={sweeping}>
              {sweeping ? 'Sweeping…' : 'Run Audit Sweep'}
            </Btn>
            <Btn variant="secondary" icon="📋" onClick={handle10Q}>
              Generate 10-Q Report
            </Btn>
            <Btn variant="secondary" icon="🖨️" onClick={handlePrint}>Print Report</Btn>
            <Btn variant="primary" icon={exporting ? '⏳' : '📥'} onClick={handleExport} disabled={exporting}>
              {exporting ? 'Exporting…' : 'Export XLSX'}
            </Btn>
          </div>
        </div>

        {/* TOP LEVEL KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '40px' }}>
          {[
            { label: 'Total Spend', value: fmtCr(totalVal), sub: `${filtered.length} transactions`, color: '#E8783B' },
            { label: 'Avg Transaction', value: fmtCr(filtered.length ? totalVal / filtered.length : 0), sub: 'Across filters', color: '#F59E0B' },
            { label: 'Depts Active', value: [...new Set(filtered.map(t => t.dept))].length, sub: 'Cost centers reporting', color: '#10B981' },
            { label: 'Risk Flags', value: breakdowns.risks.find(r => r.label === 'High Risk')?.value || 0, sub: 'Critical anomalies', color: '#EF4444' },
          ].map((k, i) => (
            <div key={i} style={{ background: 'white', padding: '24px', borderRadius: '20px', border: '1px solid #F1F0EE', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>{k.label}</div>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '28px', color: '#0F172A', letterSpacing: '-0.5px' }}>{k.value}</div>
              <div style={{ fontSize: '12px', color: k.color, fontWeight: 600, marginTop: '4px' }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* --- 1. EXECUTIVE SUMMARY --- */}
        {activeTab === 'Executive Summary' && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>
            {/* Graph 1: Area Trend */}
            <ReportView title="Consolidated Spend Trend" subtitle="Monthly transaction velocity and total outflow">
              <AdvTrendChart series={[{ label: 'Total Outflow', data: breakdowns.trends.values, color: '#E8783B' }]} labels={breakdowns.trends.labels} />
              <InsightBlock insight={aiInsight || `Overall spend has ${breakdowns.trends.values.slice(-1)[0] > (breakdowns.trends.values.slice(-2)[0]||0) ? 'accelerated' : 'decelerated'} recently. Use "Generate 10-Q Report" for a comprehensive AI analysis.`} />
            </ReportView>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {/* Graph 2: Bar Chart Dept Split */}
              <ReportView title="Top Department Share" subtitle="Spend split by cost center">
                <AdvBarChart data={breakdowns.depts.slice(0, 4)} height={180} />
              </ReportView>
              {/* Graph 3: Donut Status */}
              <ReportView title="Transaction Status" subtitle="Count of approvals vs pending">
                <AdvDonutChart slices={breakdowns.statuses.map((s, i) => ({ ...s, color: s.label === 'PAID' ? '#10B981' : s.label.includes('REJECT') ? '#EF4444' : donutColors[i % donutColors.length] }))} size={180} />
              </ReportView>
            </div>
          </div>
        )}

        {/* --- 2. DEPARTMENTAL INTEL --- */}
        {activeTab === 'Departmental Intel' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
            {/* Graph 4: Bar Chart Top Depts Spend */}
            <ReportView title="Budget Utilisation by Dept" subtitle="Total capital deployment per center">
              <AdvBarChart data={breakdowns.depts} height={380} />
              <InsightBlock insight={`${breakdowns.depts[0]?.label || 'The top department'} consumes ${((breakdowns.depts[0]?.value || 0) / (totalVal || 1) * 100).toFixed(1)}% of the total outflow.`} />
            </ReportView>
            {/* Graph 5: Bar Chart Dept Volume */}
            <ReportView title="Transaction Volume" subtitle="Number of invoices/expenses processed">
              <AdvBarChart data={breakdowns.deptVolume} valueLabel="Transactions" height={380} />
            </ReportView>
          </div>
        )}

        {/* --- 3. PROCUREMENT INSIGHTS --- */}
        {activeTab === 'Procurement Insights' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
            {/* Graph 6: Bar Chart Top Vendors */}
            <ReportView title="Top Vendors by Spend" subtitle="Identifying major supply chain dependencies">
              <AdvBarChart data={breakdowns.vendors.slice(0, 8)} height={380} />
            </ReportView>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {/* Graph 7: Donut Top Categories */}
              <ReportView title="Spend by Category" subtitle="Distribution of purchased services/goods">
                <AdvDonutChart slices={breakdowns.cats.slice(0, 5)} size={220} />
              </ReportView>
              <InsightBlock insight={`Vendor concentration risk is low. Top 3 vendors account for ${breakdowns.vendors.length ? ((breakdowns.vendors.slice(0,3).reduce((s,v)=>s+v.value,0) / totalVal) * 100).toFixed(1) : 0}% of procurement.`} severity="warning" />
            </div>
          </div>
        )}

        {/* --- 4. TREASURY & CASH FLOW --- */}
        {activeTab === 'Treasury & Cash Flow' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
              {/* Graph 8: Donut Paid vs Pending Cash */}
              <ReportView title="Capital Settlement Status" subtitle="Realised cash vs outstanding liabilities">
                <AdvDonutChart slices={breakdowns.paidVsPending.map(p => ({ ...p, color: p.label.includes('Settled') ? '#10B981' : p.label.includes('Rejected') ? '#EF4444' : '#F59E0B' }))} size={240} />
              </ReportView>
              {/* Graph 9: Area Trend Avg Size — uses per-month count for correct avg */}
              <ReportView title="Average Transaction Value" subtitle="Monthly fluctuation in ticket size">
                <AdvTrendChart series={[{ label: 'Avg Value (₹)', data: breakdowns.trends.avgValues, color: '#3B82F6' }]} labels={breakdowns.trends.labels} height={200} />
              </ReportView>
            </div>
            <InsightBlock insight={`Current outstanding liabilities amount to ${fmtCr(breakdowns.paidVsPending.find(p => p.label === 'Pending/Processing')?.value || 0)}. Ensure sufficient liquidity for upcoming AP cycles.`} />
          </div>
        )}

        {/* --- 5. AUDIT & COMPLIANCE --- */}
        {activeTab === 'Audit & Compliance' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
            {/* Graph 10: Donut Risk Tiers */}
            <ReportView title="System-wide Risk Assessment" subtitle="Invoices flagged by AI Fraud Engine">
              <AdvDonutChart slices={breakdowns.risks.map(r => ({ ...r, color: r.label.includes('High') ? '#EF4444' : r.label.includes('Medium') ? '#F59E0B' : '#10B981' }))} size={240} />
            </ReportView>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Graph 11: Bar Chart Anomalies by Dept */}
              <ReportView title="Risk by Cost Center" subtitle="Departments generating the most flags">
                <AdvBarChart data={breakdowns.riskDepts.slice(0, 4)} height={200} />
              </ReportView>
            </div>
          </div>
        )}

        {/* --- 6. DETAILED LEDGER --- */}
        {activeTab === 'Detailed Ledger' && (
          <ReportView title="Transaction Audit Ledger" subtitle="Full line-item history with status tracking" actions={
            <Btn variant="secondary" onClick={() => {
              const csv = [
                ['Date', 'Entity', 'Department', 'Category', 'Amount', 'Status'],
                ...filtered.map(t => [t.date.toLocaleDateString(), t.party, t.dept, t.cat, t.amount, t.status])
              ].map(r => r.join(',')).join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `ledger_export_${new Date().toISOString().slice(0,10)}.csv`;
              link.click();
              URL.revokeObjectURL(url);
            }}>Export to CSV</Btn>
          }>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #F1F0EE' }}>
                    {[
                      { label: 'Date', key: 'date' },
                      { label: 'Entity', key: 'party' },
                      { label: 'Department', key: 'dept' },
                      { label: 'Category', key: 'cat' },
                      { label: 'Amount', key: 'amount' },
                      { label: 'Status', key: 'status' }
                    ].map(h => (
                      <th key={h.key} onClick={() => handleSort(h.key)} style={{ textAlign: 'left', padding: '16px', fontSize: '11px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer' }}>
                        {h.label} {sortConfig.key === h.key ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                      </th>
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
              {filtered.length > 50 && <div style={{ textAlign: 'center', padding: '20px', color: '#94A3B8', fontSize: '12px' }}>Showing top 50 records. Export XLSX for all {filtered.length} records.</div>}
            </div>
          </ReportView>
        )}

        {/* --- 7. ANNUAL FINANCIAL REPORT --- */}
        {activeTab === 'Annual Report' && (
          <div>
            {/* Year selector + actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>Financial Year:</span>
                <select value={annualYear} onChange={e => setAnnualYear(Number(e.target.value))}
                  style={{ padding: '8px 14px', borderRadius: '10px', border: '1.5px solid #E2E8F0', fontSize: '14px', fontWeight: 700, outline: 'none', background: '#FAFAF8' }}>
                  {[2026, 2025, 2024, 2023].map(y => <option key={y} value={y}>FY {y}</option>)}
                </select>
                <Btn variant="primary" onClick={() => { setAnnualData(null); loadAnnualReport(annualYear); }} disabled={annualLoading}>
                  {annualLoading ? '⏳ Generating…' : '↻ Load Report'}
                </Btn>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <Btn variant="secondary" icon="🖨️" onClick={handlePrint}>Print Annual Report</Btn>
                {annualData && <Btn variant="secondary" icon="📥" onClick={() => {
                  if (!window.XLSX) return;
                  const wb = window.XLSX.utils.book_new();
                  const headline = annualData.headline;
                  const summary = [
                    [`TIJORI AI — ANNUAL FINANCIAL REPORT FY ${annualData.year}`],
                    ['Generated', new Date().toLocaleString('en-IN')],
                    [''],
                    ['HEADLINE FIGURES'],
                    ['Total Actual Spend', headline.total_spend],
                    ['Prior Year Spend', headline.prev_year_spend],
                    ['YoY Change %', headline.yoy_change_pct + '%'],
                    ['Total Budget', headline.total_budget],
                    ['Budget Utilization %', headline.budget_utilization_pct + '%'],
                    ['Total Invoices', headline.total_invoices],
                    ['Rejected Invoices', headline.rejected_count],
                    ['High-Risk Flags', headline.flagged_high],
                    ['Estimated GST', headline.gst_total],
                    ['Estimated TDS', headline.tds_total],
                    ['Pending Payables', headline.pending_amount],
                    [''],
                    ['AI EXECUTIVE NARRATIVE'],
                    [annualData.ai_narrative || ''],
                  ];
                  window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.aoa_to_sheet(summary), 'Annual Summary');
                  const deptSheet = [['Department', 'Budget (₹)', 'Actual (₹)', 'Variance (₹)', 'Variance %', 'Utilization %', 'Status', 'FY Prev Actual', 'YoY %'], ...(annualData.department_performance || []).map(d => [d.department, d.budget, d.actual, d.variance, d.variance_pct + '%', d.utilization_pct + '%', d.status, d.prev_year_actual, d.yoy_change_pct + '%'])];
                  window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.aoa_to_sheet(deptSheet), 'Dept Performance');
                  const vendorSheet = [['Vendor', 'Type', 'Amount (₹)', 'Invoices'], ...(annualData.top_vendors || []).map(v => [v.name, v.type, v.amount, v.invoices])];
                  window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.aoa_to_sheet(vendorSheet), 'Top Vendors');
                  window.XLSX.writeFile(wb, `TijoriAI_Annual_Report_FY${annualData.year}.xlsx`);
                }}>Export XLSX</Btn>}
              </div>
            </div>

            {annualLoading && <div style={{ padding: '80px', textAlign: 'center', color: '#64748B', fontSize: '14px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              <div style={{ width: 40, height: 40, border: '3px solid #F1F0EE', borderTopColor: '#E8783B', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
              Generating annual financial report with AI narrative…
            </div>}

            {annualData && !annualLoading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                {/* Headline KPIs */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                  {[
                    { label: 'Total Spend', value: fmtCr(annualData.headline.total_spend), sub: `${annualData.headline.yoy_change_pct > 0 ? '+' : ''}${annualData.headline.yoy_change_pct}% vs FY${annualData.prev_year}`, color: '#E8783B' },
                    { label: 'Budget', value: fmtCr(annualData.headline.total_budget), sub: `${annualData.headline.budget_utilization_pct}% utilized`, color: '#3B82F6' },
                    { label: 'Total Invoices', value: annualData.headline.total_invoices.toLocaleString(), sub: `${annualData.headline.rejected_count} rejected`, color: '#10B981' },
                    { label: 'High-Risk Flags', value: annualData.headline.flagged_high, sub: `+ ${annualData.headline.flagged_medium} medium`, color: '#EF4444' },
                  ].map((k, i) => (
                    <div key={i} style={{ background: 'white', padding: '20px 24px', borderRadius: '20px', border: '1px solid #F1F0EE', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
                      <div style={{ fontSize: '10px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>{k.label}</div>
                      <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '26px', color: '#0F172A', letterSpacing: '-0.5px' }}>{k.value}</div>
                      <div style={{ fontSize: '11px', color: k.color, fontWeight: 600, marginTop: '4px' }}>{k.sub}</div>
                    </div>
                  ))}
                </div>

                {/* AI Narrative */}
                <ReportView title="Executive Summary — AI Generated" subtitle={`FY ${annualData.year} · Investor-grade narrative`}>
                  <div style={{ background: 'linear-gradient(135deg, #F5F3FF, #EFF6FF)', border: '1px solid #DDD6FE', borderRadius: '14px', padding: '24px', marginBottom: '16px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 800, color: '#5B21B6', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>✦</span> AI-Generated Board-Level Summary
                    </div>
                    <div style={{ fontSize: '14px', color: '#1E1B4B', lineHeight: 1.8, fontFamily: "'Plus Jakarta Sans', sans-serif", whiteSpace: 'pre-wrap' }}>
                      {annualData.ai_narrative}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    {[
                      { label: 'Pending Payables', value: fmtCr(annualData.headline.pending_amount), count: annualData.headline.pending_count + ' invoices', color: '#F59E0B', cta: 'Review & Approve →' },
                      { label: 'Estimated GST', value: fmtCr(annualData.headline.gst_total), count: 'Tax obligation', color: '#3B82F6', cta: 'GST Reconciliation →' },
                      { label: 'Estimated TDS', value: fmtCr(annualData.headline.tds_total), count: 'Withholding tax', color: '#8B5CF6', cta: 'TDS Compliance →' },
                    ].map((item, i) => (
                      <div key={i} style={{ background: 'white', borderRadius: '14px', border: '1px solid #F1F0EE', padding: '16px' }}>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: '4px' }}>{item.label}</div>
                        <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '22px', color: item.color }}>{item.value}</div>
                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>{item.count}</div>
                        <div style={{ marginTop: '10px', fontSize: '11px', fontWeight: 700, color: item.color, cursor: 'pointer' }}>{item.cta}</div>
                      </div>
                    ))}
                  </div>
                </ReportView>

                {/* Quarterly Breakdown */}
                <ReportView title="Quarterly Spend Breakdown" subtitle={`Q1–Q4 FY ${annualData.year} performance`}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                    {(annualData.quarterly_breakdown || []).map((q, i) => (
                      <div key={i} style={{ background: '#F8FAFC', borderRadius: '14px', padding: '20px', textAlign: 'center', border: '1px solid #E2E8F0' }}>
                        <div style={{ fontSize: '12px', fontWeight: 800, color: '#94A3B8', marginBottom: '8px' }}>{q.quarter}</div>
                        <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '20px', color: '#0F172A' }}>{fmtCr(q.spend)}</div>
                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>{q.invoices} invoices</div>
                        <div style={{ height: '4px', background: '#E2E8F0', borderRadius: '2px', marginTop: '12px' }}>
                          <div style={{ height: '100%', width: `${Math.min(100, (q.spend / (annualData.headline.total_spend || 1)) * 400)}%`, background: donutColors[i], borderRadius: '2px', maxWidth: '100%' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </ReportView>

                {/* Monthly Trend */}
                <ReportView title="Monthly Spend Trend" subtitle={`All 12 months — FY ${annualData.year}`}>
                  <AdvTrendChart
                    series={[{ label: 'Paid', data: (annualData.monthly_trend || []).map(m => m.paid), color: '#10B981' }]}
                    labels={(annualData.monthly_trend || []).map(m => m.month)}
                    height={240}
                  />
                </ReportView>

                {/* Dept Performance Table */}
                <ReportView title="Department Performance — Budget vs Actual" subtitle="Full-year budget utilization and YoY comparison">
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #F1F0EE' }}>
                          {['Department', 'Budget', 'Actual Spend', 'Variance', 'Utilization', 'Prior FY', 'YoY Δ', 'Status'].map(h => (
                            <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: '10px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(annualData.department_performance || []).map((d, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #F8F7F5' }}>
                            <td style={{ padding: '14px', fontWeight: 700, color: '#0F172A' }}>{d.department}</td>
                            <td style={{ padding: '14px', fontFamily: "'JetBrains Mono', monospace", color: '#64748B' }}>{fmtCr(d.budget)}</td>
                            <td style={{ padding: '14px', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#0F172A' }}>{fmtCr(d.actual)}</td>
                            <td style={{ padding: '14px', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: d.variance > 0 ? '#EF4444' : '#10B981' }}>
                              {d.variance > 0 ? '+' : ''}{fmtCr(Math.abs(d.variance))}
                            </td>
                            <td style={{ padding: '14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '60px', height: '6px', background: '#F1F5F9', borderRadius: '3px' }}>
                                  <div style={{ height: '100%', width: `${Math.min(100, d.utilization_pct)}%`, background: d.utilization_pct > 100 ? '#EF4444' : d.utilization_pct > 80 ? '#F59E0B' : '#10B981', borderRadius: '3px' }} />
                                </div>
                                <span style={{ fontSize: '11px', fontWeight: 700 }}>{d.utilization_pct}%</span>
                              </div>
                            </td>
                            <td style={{ padding: '14px', fontFamily: "'JetBrains Mono', monospace", color: '#64748B' }}>{fmtCr(d.prev_year_actual)}</td>
                            <td style={{ padding: '14px', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: d.yoy_change_pct >= 0 ? '#EF4444' : '#10B981' }}>
                              {d.yoy_change_pct > 0 ? '+' : ''}{d.yoy_change_pct}%
                            </td>
                            <td style={{ padding: '14px' }}>
                              <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: 800, background: d.status === 'OVER_BUDGET' ? '#FEE2E2' : d.status === 'ON_TRACK' ? '#D1FAE5' : '#E0F2FE', color: d.status === 'OVER_BUDGET' ? '#991B1B' : d.status === 'ON_TRACK' ? '#065F46' : '#0369A1' }}>
                                {d.status.replace('_', ' ')}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </ReportView>

                {/* Top Vendors + Risk Summary side by side */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                  <ReportView title="Top Vendors by Annual Spend" subtitle="Key supplier relationships">
                    <AdvBarChart data={(annualData.top_vendors || []).slice(0, 8).map(v => ({ label: v.name, value: v.amount, count: v.invoices }))} height={320} />
                  </ReportView>
                  <ReportView title="Annual Risk & Compliance Summary" subtitle="Fraud detection and policy adherence">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {[
                        { label: 'Total Invoices Processed', value: annualData.risk_summary.total_invoices, color: '#3B82F6', icon: '📋' },
                        { label: 'High-Risk Flags (AI)', value: annualData.risk_summary.high_risk, color: '#EF4444', icon: '🚨' },
                        { label: 'Medium-Risk Flags', value: annualData.risk_summary.medium_risk, color: '#F59E0B', icon: '⚠️' },
                        { label: 'Rejected Invoices', value: annualData.risk_summary.rejected, color: '#DC2626', icon: '❌' },
                        { label: 'Clean / Compliant', value: `${annualData.risk_summary.clean_pct}%`, color: '#10B981', icon: '✅' },
                      ].map((item, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '16px' }}>{item.icon}</span>
                            <span style={{ fontSize: '13px', color: '#475569', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{item.label}</span>
                          </div>
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, fontSize: '16px', color: item.color }}>{item.value}</span>
                        </div>
                      ))}
                    </div>
                    <InsightBlock insight={`FY ${annualData.year}: ${annualData.risk_summary.clean_pct}% of invoices processed cleanly. ${annualData.risk_summary.high_risk} high-risk flags were detected — review these for potential fraud or compliance violations.`} severity={annualData.risk_summary.high_risk > 5 ? 'warning' : 'info'} />
                  </ReportView>
                </div>
              </div>
            )}

            {!annualData && !annualLoading && (
              <div style={{ textAlign: 'center', padding: '80px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📅</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>Annual Financial Report</div>
                <div style={{ fontSize: '14px', marginBottom: '24px' }}>Select a year and click "Load Report" to generate the full investor-grade annual summary.</div>
                <Btn variant="primary" onClick={() => loadAnnualReport(annualYear)}>Generate FY {annualYear} Report</Btn>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

const ReportsScreen = LiveReportsScreen;
Object.assign(window, { ReportsScreen, LiveReportsScreen });
