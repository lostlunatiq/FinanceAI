// Tijori AI — New Finance Automation Screens
// All screens fetch real data from backend analytics APIs

// ─── Shared helpers ────────────────────────────────────────────────────────────

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
const fmtPct = (n) => `${n >= 0 ? '+' : ''}${Number(n || 0).toFixed(1)}%`;
const fmtNum = (n) => Number(n || 0).toLocaleString('en-IN');

const SEVERITY_COLOR = {
  CRITICAL: { bg: '#FEE2E2', text: '#991B1B', dot: '#EF4444' },
  HIGH:     { bg: '#FEF3C7', text: '#92400E', dot: '#F59E0B' },
  MEDIUM:   { bg: '#FFF7ED', text: '#9A3412', dot: '#F97316' },
  LOW:      { bg: '#ECFDF5', text: '#065F46', dot: '#10B981' },
  OK:       { bg: '#ECFDF5', text: '#065F46', dot: '#10B981' },
  WARNING:  { bg: '#FEF3C7', text: '#92400E', dot: '#F59E0B' },
};

const StatusChip = ({ level, label }) => {
  const c = SEVERITY_COLOR[level] || SEVERITY_COLOR.LOW;
  return (
    <span style={{ background: c.bg, color: c.text, border: `1px solid ${c.dot}33`, borderRadius: '999px', fontSize: '10px', fontWeight: 700, padding: '2px 10px', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '0.04em', textTransform: 'uppercase' }}>
      {label || level}
    </span>
  );
};

const AnalyticCard = ({ title, value, sub, trend, color = '#E8783B', icon }) => (
  <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #F1F0EE', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
    <div style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif", textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '6px' }}>
      {icon && <span>{icon}</span>}{title}
    </div>
    <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '26px', color: '#0F172A', letterSpacing: '-1px' }}>{value}</div>
    {sub && <div style={{ fontSize: '12px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{sub}</div>}
    {trend !== undefined && (
      <div style={{ fontSize: '12px', fontWeight: 700, color: trend >= 0 ? '#10B981' : '#EF4444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}% vs prior period
      </div>
    )}
  </div>
);

const SectionTitle = ({ title, sub }) => (
  <div style={{ marginBottom: '12px' }}>
    <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '18px', color: '#0F172A', letterSpacing: '-0.5px' }}>{title}</div>
    {sub && <div style={{ fontSize: '12px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif", marginTop: '2px' }}>{sub}</div>}
  </div>
);

const Table = ({ headers, rows, emptyMsg = 'No data' }) => (
  <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #F1F0EE', overflow: 'hidden' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ background: '#F8FAFC' }}>
          {headers.map((h, i) => (
            <th key={i} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '10px', fontWeight: 700, color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif", textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #F1F0EE' }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr><td colSpan={headers.length} style={{ padding: '24px', textAlign: 'center', color: '#CBD5E1', fontSize: '13px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{emptyMsg}</td></tr>
        ) : rows.map((row, ri) => (
          <tr key={ri} style={{ borderBottom: ri < rows.length - 1 ? '1px solid #F8FAFC' : 'none' }}
            onMouseEnter={e => e.currentTarget.style.background = '#FAFAF8'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            {row.map((cell, ci) => (
              <td key={ci} style={{ padding: '11px 16px', fontSize: '13px', color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const ScreenLoader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, flexDirection: 'column', gap: 12 }}>
    <div style={{ width: 28, height: 28, border: '2.5px solid #E2E8F0', borderTopColor: '#E8783B', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    <div style={{ fontSize: '13px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Loading data…</div>
  </div>
);

const ErrorBanner = ({ msg }) => (
  <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: '10px', padding: '12px 16px', fontSize: '13px', color: '#991B1B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
    {msg || 'Failed to load data. Please refresh.'}
  </div>
);

const useAnalytics = (fetcher) => {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    setLoading(true);
    fetcher()
      .then(d => { setData(d); setError(null); })
      .catch(e => setError(e.message || 'Error loading data'))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
};

const PageWrap = ({ children }) => (
  <div style={{ padding: '28px 32px', maxWidth: 1200, margin: '0 auto' }}>{children}</div>
);

// ─── 1. Spend Analytics Screen ────────────────────────────────────────────────

const SpendAnalyticsScreen = ({ onNavigate }) => {
  const { data, loading, error } = useAnalytics(() => window.TijoriAPI.AnalyticsAPI.spendIntelligence());

  if (loading) return <PageWrap><ScreenLoader /></PageWrap>;
  if (error) return <PageWrap><ErrorBanner msg={error} /></PageWrap>;

  const d = data || {};
  const cats = d.categories || [];
  const monthly = d.monthly_trend || [];
  const maxMonth = Math.max(...monthly.map(m => m.amount), 1);

  return (
    <PageWrap>
      <SectionTitle title="Spend Intelligence" sub="AI-powered spend analysis and categorization" />

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <AnalyticCard title="YTD Total Spend" value={fmt(d.ytd_total)} trend={d.yoy_change_pct} />
        <AnalyticCard title="Avg Invoice Size" value={fmt(d.avg_invoice_size)} sub="Per transaction" />
        <AnalyticCard title="Spend Categories" value={cats.length} sub="Active vendor types" />
        <AnalyticCard title="YoY Change" value={fmtPct(d.yoy_change_pct)} sub={d.yoy_change_pct >= 0 ? 'Spend increased' : 'Spend reduced'} color={d.yoy_change_pct >= 0 ? '#EF4444' : '#10B981'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>

        {/* Category Breakdown */}
        <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #F1F0EE', padding: '20px' }}>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '15px', color: '#0F172A', marginBottom: '16px' }}>Spend by Category</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {cats.slice(0, 6).map((cat, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{cat.category}</span>
                  <span style={{ fontSize: '12px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{fmt(cat.amount)} ({cat.pct}%)</span>
                </div>
                <div style={{ background: '#F1F5F9', borderRadius: '999px', height: 6, overflow: 'hidden' }}>
                  <div style={{ background: `hsl(${20 + i * 40}, 80%, 55%)`, width: `${cat.pct}%`, height: '100%', borderRadius: '999px', transition: 'width 600ms ease' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Trend */}
        <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #F1F0EE', padding: '20px' }}>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '15px', color: '#0F172A', marginBottom: '16px' }}>Monthly Trend (6 months)</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: 140, paddingBottom: '20px' }}>
            {monthly.map((m, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%', justifyContent: 'flex-end' }}>
                <div style={{ width: '100%', background: i === monthly.length - 1 ? '#E8783B' : '#CBD5E1', borderRadius: '4px 4px 0 0', height: `${(m.amount / maxMonth) * 110}px`, transition: 'height 400ms ease' }} />
                <span style={{ fontSize: '10px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{m.month?.slice(5)}</span>
              </div>
            ))}
            {monthly.length === 0 && <div style={{ flex: 1, textAlign: 'center', color: '#CBD5E1', fontSize: '12px', fontFamily: "'Plus Jakarta Sans', sans-serif", paddingTop: '40px' }}>No trend data yet</div>}
          </div>
        </div>
      </div>

      {/* AI Insight */}
      {d.ai_insight && (
        <div style={{ background: 'linear-gradient(135deg, #FFF8F5, #FFF3E6)', border: '1px solid #FED7AA', borderRadius: '14px', padding: '16px 20px', marginBottom: '24px', display: 'flex', gap: '12px' }}>
          <div style={{ width: 32, height: 32, borderRadius: '10px', background: 'linear-gradient(135deg, #E8783B, #FF6B35)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ color: 'white', fontSize: '14px', fontWeight: 700 }}>✦</span>
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#E8783B', fontFamily: "'Plus Jakarta Sans', sans-serif", textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>AI Insight</div>
            <div style={{ fontSize: '13px', color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.6 }}>{d.ai_insight}</div>
          </div>
        </div>
      )}

      {/* Top Vendors */}
      <SectionTitle title="Top Vendors by YTD Spend" />
      <Table
        headers={['Vendor', 'Type', 'Total Spend', 'Invoices']}
        rows={(d.top_vendors || []).map(v => [
          <span style={{ fontWeight: 600 }}>{v.name}</span>,
          <span style={{ background: '#F1F5F9', borderRadius: '6px', padding: '2px 8px', fontSize: '11px', color: '#475569' }}>{v.type}</span>,
          <span style={{ fontWeight: 700, color: '#0F172A' }}>{fmt(v.amount)}</span>,
          v.invoices,
        ])}
        emptyMsg="No spend data available yet"
      />
    </PageWrap>
  );
};

// ─── 2. Working Capital Screen ────────────────────────────────────────────────

const WorkingCapitalScreen = ({ onNavigate }) => {
  const { data, loading, error } = useAnalytics(() => window.TijoriAPI.AnalyticsAPI.workingCapital());

  if (loading) return <PageWrap><ScreenLoader /></PageWrap>;
  if (error) return <PageWrap><ErrorBanner msg={error} /></PageWrap>;

  const d = data || {};
  const aging = d.aging || {};
  const overdue = d.overdue_vendors || [];

  const agingBuckets = [
    { label: '0–30 days', ...aging['0_30_days'], color: '#10B981' },
    { label: '31–60 days', ...aging['31_60_days'], color: '#F59E0B' },
    { label: '61–90 days', ...aging['61_90_days'], color: '#F97316' },
    { label: '>90 days', ...aging['over_90_days'], color: '#EF4444' },
  ];

  return (
    <PageWrap>
      <SectionTitle title="Working Capital Dashboard" sub="Payables aging, DPO analysis, and cash health" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <AnalyticCard title="Days Payable Outstanding" value={`${d.dpo_days || 0} days`} sub="Avg time invoice → payment" />
        <AnalyticCard title="Total Outstanding" value={fmt(d.total_outstanding)} sub="Pending payables" />
        <AnalyticCard title="MSME Breach Risk" value={d.msme_breach_risk_count || 0} sub="45-day rule violations" color={d.msme_breach_risk_count > 0 ? '#EF4444' : '#10B981'} />
        <AnalyticCard title="Working Capital Score" value={`${d.health_score || 0}/100`} sub={d.health_score >= 75 ? 'Healthy' : d.health_score >= 50 ? 'Moderate risk' : 'Action needed'} />
      </div>

      {/* MSME Alert */}
      {(d.msme_breach_risk_count || 0) > 0 && (
        <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: '12px', padding: '14px 18px', marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span style={{ fontSize: '18px' }}>⚠️</span>
          <div style={{ fontSize: '13px', color: '#991B1B', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600 }}>
            {d.msme_breach_risk_count} MSME vendor invoice(s) exceed 45-day payment deadline — regulatory breach risk!
          </div>
        </div>
      )}

      {/* Aging Buckets */}
      <SectionTitle title="Payables Aging Analysis" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {agingBuckets.map((b, i) => (
          <div key={i} style={{ background: 'white', borderRadius: '14px', border: `2px solid ${b.color}22`, padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: b.color }} />
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '22px', color: '#0F172A' }}>{fmt(b.amount)}</div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{b.label}</div>
            <div style={{ fontSize: '11px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{fmtNum(b.count)} invoices</div>
          </div>
        ))}
      </div>

      {/* Overdue Vendors */}
      {overdue.length > 0 && (
        <>
          <SectionTitle title="Overdue Payables (>90 days)" sub="Vendors awaiting payment beyond normal terms" />
          <Table
            headers={['Vendor', 'Reference', 'Days Outstanding', 'Amount']}
            rows={overdue.map(v => [
              <span style={{ fontWeight: 600, color: '#991B1B' }}>{v.vendor}</span>,
              v.ref_no,
              <span style={{ color: '#EF4444', fontWeight: 700 }}>{v.days} days</span>,
              fmt(v.amount),
            ])}
          />
        </>
      )}
    </PageWrap>
  );
};

// ─── 3. Vendor Risk Screen ────────────────────────────────────────────────────

const VendorRiskScreen = ({ onNavigate }) => {
  const { data, loading, error } = useAnalytics(() => window.TijoriAPI.AnalyticsAPI.vendorRisk());

  if (loading) return <PageWrap><ScreenLoader /></PageWrap>;
  if (error) return <PageWrap><ErrorBanner msg={error} /></PageWrap>;

  const d = data || {};
  const vendors = d.vendors || [];

  const GRADE_COLOR = { CRITICAL: '#EF4444', HIGH: '#F59E0B', MEDIUM: '#F97316', LOW: '#10B981' };

  return (
    <PageWrap>
      <SectionTitle title="Vendor Risk Score" sub="AI-based risk assessment across your supplier base" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <AnalyticCard title="Active Vendors Assessed" value={d.total_active_vendors || 0} />
        <AnalyticCard title="High Risk Vendors" value={d.high_risk_count || 0} sub="Need immediate review" color="#EF4444" />
        <AnalyticCard title="Low Risk Vendors" value={(d.total_active_vendors || 0) - (d.high_risk_count || 0)} sub="Within acceptable range" color="#10B981" />
      </div>

      <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #F1F0EE', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #F8FAFC', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '15px', color: '#0F172A' }}>
          Vendor Risk Rankings
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC' }}>
              {['Vendor', 'GSTIN', 'Risk Level', 'Risk Score', 'Anomalies', 'Rejections', 'Factors'].map((h, i) => (
                <th key={i} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '10px', fontWeight: 700, color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif", textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #F1F0EE' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vendors.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#CBD5E1', fontSize: '13px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>No vendor data available</td></tr>
            ) : vendors.map((v, i) => (
              <tr key={i} onMouseEnter={e => e.currentTarget.style.background = '#FAFAF8'} onMouseLeave={e => e.currentTarget.style.background = ''}>
                <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {v.vendor_name}
                  {v.is_msme && <span style={{ marginLeft: '6px', fontSize: '9px', background: '#EDE9FE', color: '#5B21B6', borderRadius: '999px', padding: '1px 6px', fontWeight: 700 }}>MSME</span>}
                </td>
                <td style={{ padding: '12px 16px', fontSize: '12px', color: '#64748B', fontFamily: "'JetBrains Mono', monospace" }}>{v.gstin || '—'}</td>
                <td style={{ padding: '12px 16px' }}>
                  <StatusChip level={v.risk_level} />
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ background: '#F1F5F9', borderRadius: '999px', height: 6, width: 60, overflow: 'hidden' }}>
                      <div style={{ background: GRADE_COLOR[v.risk_level] || '#10B981', width: `${v.risk_score}%`, height: '100%', borderRadius: '999px' }} />
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: GRADE_COLOR[v.risk_level], fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{v.risk_score}</span>
                  </div>
                </td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: v.anomaly_count > 0 ? '#EF4444' : '#64748B', fontWeight: v.anomaly_count > 0 ? 700 : 400, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{v.anomaly_count}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: v.rejection_count > 0 ? '#F59E0B' : '#64748B', fontWeight: v.rejection_count > 0 ? 700 : 400, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{v.rejection_count}</td>
                <td style={{ padding: '12px 16px', fontSize: '11px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif", maxWidth: 200 }}>
                  {(v.risk_factors || []).join(' · ') || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageWrap>
  );
};

// ─── 4. GST Reconciliation Screen ─────────────────────────────────────────────

const GSTReconScreen = ({ onNavigate }) => {
  const { data, loading, error } = useAnalytics(() => window.TijoriAPI.AnalyticsAPI.gstRecon());

  if (loading) return <PageWrap><ScreenLoader /></PageWrap>;
  if (error) return <PageWrap><ErrorBanner msg={error} /></PageWrap>;

  const d = data || {};
  const s = d.summary || {};
  const flags = d.flags || [];

  return (
    <PageWrap>
      <SectionTitle title="GST Reconciliation" sub={`Period: ${d.period?.from || ''} to ${d.period?.to || ''}`} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <AnalyticCard title="Total Pre-GST" value={fmt(s.total_pre_gst)} />
        <AnalyticCard title="Total CGST" value={fmt(s.total_cgst)} sub="Intra-state component" />
        <AnalyticCard title="Total IGST" value={fmt(s.total_igst)} sub="Inter-state component" />
        <AnalyticCard title="Effective GST Rate" value={`${s.effective_gst_rate_pct || 0}%`} sub="Blended rate" />
      </div>

      {/* Tax Summary Card */}
      <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #F1F0EE', padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
          {[
            { label: 'Total Invoice Value', val: fmt(s.total_invoice_value) },
            { label: 'Total GST Paid', val: fmt((s.total_cgst || 0) + (s.total_sgst || 0) + (s.total_igst || 0)) },
            { label: 'Mismatches Found', val: s.mismatch_count || 0, color: s.mismatch_count > 0 ? '#EF4444' : '#10B981' },
          ].map((item, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '28px', color: item.color || '#0F172A' }}>{item.val}</div>
              <div style={{ fontSize: '12px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif", marginTop: '4px' }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Flags */}
      {flags.length > 0 ? (
        <>
          <SectionTitle title="GST Flags & Mismatches" sub="Invoices requiring review" />
          <Table
            headers={['Reference', 'Vendor', 'Date', 'Declared Total', 'Calculated Total', 'Variance', 'Issue']}
            rows={flags.map(f => [
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>{f.ref_no}</span>,
              f.vendor,
              f.invoice_date,
              fmt(f.declared_total),
              fmt(f.calculated_total),
              <span style={{ color: Math.abs(f.variance) > 0 ? '#EF4444' : '#10B981', fontWeight: 700 }}>{fmt(f.variance)}</span>,
              <StatusChip level="HIGH" label={f.issue} />,
            ])}
          />
        </>
      ) : (
        <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '12px', padding: '16px 20px', fontSize: '13px', color: '#065F46', fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span style={{ fontSize: '18px' }}>✅</span>
          <span>All invoices in this period pass GST validation checks. No mismatches found.</span>
        </div>
      )}
    </PageWrap>
  );
};

// ─── 5. TDS Compliance Screen ─────────────────────────────────────────────────

const TDSComplianceScreen = ({ onNavigate }) => {
  const { data, loading, error } = useAnalytics(() => window.TijoriAPI.AnalyticsAPI.tdsCompliance());

  if (loading) return <PageWrap><ScreenLoader /></PageWrap>;
  if (error) return <PageWrap><ErrorBanner msg={error} /></PageWrap>;

  const d = data || {};
  const sections = d.by_section || [];
  const isCompliant = d.compliance_status === 'COMPLIANT';

  return (
    <PageWrap>
      <SectionTitle title="TDS Compliance Tracker" sub="Tax Deducted at Source deduction analysis" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <AnalyticCard title="Total TDS Deducted" value={fmt(d.total_tds_deducted)} sub="Across all invoices" />
        <AnalyticCard title="Missed Deductions" value={d.potentially_missed_deductions || 0} sub="Invoices with section but ₹0 TDS" color={d.potentially_missed_deductions > 0 ? '#EF4444' : '#10B981'} />
        <AnalyticCard title="Compliance Status" value={isCompliant ? 'COMPLIANT' : 'ACTION NEEDED'} color={isCompliant ? '#10B981' : '#EF4444'} />
      </div>

      {(d.action_items || []).length > 0 && (
        <div style={{ background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: '12px', padding: '14px 18px', marginBottom: '20px' }}>
          {d.action_items.map((item, i) => (
            <div key={i} style={{ fontSize: '13px', color: '#92400E', fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span>⚠️</span> {item}
            </div>
          ))}
        </div>
      )}

      <SectionTitle title="TDS by Section" sub="Breakdown by Income Tax section" />
      <Table
        headers={['Section', 'Invoice Count', 'Total TDS Deducted', 'Total Base Amount', 'Effective Rate']}
        rows={sections.map(s => [
          <span style={{ background: '#F5F3FF', color: '#5B21B6', fontWeight: 700, fontSize: '12px', padding: '2px 8px', borderRadius: '6px', fontFamily: "'JetBrains Mono', monospace" }}>{s.section}</span>,
          s.count,
          fmt(s.total_tds),
          fmt(s.total_base),
          <span style={{ fontWeight: 700 }}>{s.effective_rate}%</span>,
        ])}
        emptyMsg="No TDS data found. Invoices may not have TDS sections set."
      />
    </PageWrap>
  );
};

// ─── 6. Policy Compliance Screen ──────────────────────────────────────────────

const PolicyComplianceScreen = ({ onNavigate }) => {
  const { data, loading, error } = useAnalytics(() => window.TijoriAPI.AnalyticsAPI.policyCompliance());

  if (loading) return <PageWrap><ScreenLoader /></PageWrap>;
  if (error) return <PageWrap><ErrorBanner msg={error} /></PageWrap>;

  const d = data || {};
  const violations = d.violations || [];

  const RULE_LABEL = {
    BUSINESS_PURPOSE_REQUIRED: 'Missing Justification',
    WEEKEND_SUBMISSION: 'Off-Hours Submission',
    POSSIBLE_DUPLICATE: 'Possible Duplicate',
  };

  return (
    <PageWrap>
      <SectionTitle title="Policy Compliance Check" sub="AI-driven policy rule validation — last 30 days" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <AnalyticCard title="Invoices Checked" value={d.total_checked || 0} />
        <AnalyticCard title="Compliant" value={d.compliant_count || 0} color="#10B981" />
        <AnalyticCard title="Violations Found" value={d.violation_count || 0} color={d.violation_count > 0 ? '#EF4444' : '#10B981'} />
        <AnalyticCard title="Compliance Rate" value={`${d.compliance_rate_pct || 100}%`} color={d.compliance_rate_pct >= 90 ? '#10B981' : '#F59E0B'} />
      </div>

      <SectionTitle title="Policy Violations" sub="Invoices with policy breaches requiring review" />
      <Table
        headers={['Reference', 'Vendor', 'Rule', 'Severity', 'Detail']}
        rows={violations.map(v => [
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>{v.ref_no}</span>,
          v.vendor,
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#5B21B6' }}>{RULE_LABEL[v.rule] || v.rule}</span>,
          <StatusChip level={v.severity} />,
          <span style={{ fontSize: '12px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{v.message}</span>,
        ])}
        emptyMsg="✅ No policy violations found in the last 30 days"
      />
    </PageWrap>
  );
};

// ─── 7. Department Variance Screen ────────────────────────────────────────────

const DeptVarianceScreen = ({ onNavigate }) => {
  const { data, loading, error } = useAnalytics(() => window.TijoriAPI.AnalyticsAPI.deptVariance());

  if (loading) return <PageWrap><ScreenLoader /></PageWrap>;
  if (error) return <PageWrap><ErrorBanner msg={error} /></PageWrap>;

  const d = data || {};
  const depts = d.departments || [];

  return (
    <PageWrap>
      <SectionTitle title="Department Variance Analysis" sub={`FY ${d.fiscal_year || new Date().getFullYear()} — Budget vs Actuals`} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <AnalyticCard title="Departments Tracked" value={depts.length} />
        <AnalyticCard title="Over Budget" value={d.over_budget_depts || 0} color={d.over_budget_depts > 0 ? '#EF4444' : '#10B981'} />
        <AnalyticCard title="Under Budget" value={depts.length - (d.over_budget_depts || 0)} color="#10B981" />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {depts.map((dept, i) => (
          <div key={i} style={{ background: 'white', borderRadius: '14px', border: '1px solid #F1F0EE', padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{dept.department}</div>
                <div style={{ fontSize: '12px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{dept.txn_count} transactions</div>
              </div>
              <StatusChip level={dept.status === 'OVER_BUDGET' ? 'HIGH' : dept.status === 'UNDER_BUDGET' ? 'OK' : 'LOW'} label={dept.status === 'OVER_BUDGET' ? 'Over Budget' : dept.status === 'UNDER_BUDGET' ? 'Under Budget' : 'On Track'} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '10px' }}>
              {[
                { label: 'Budget', val: fmt(dept.budget) },
                { label: 'Actual', val: fmt(dept.actual) },
                { label: 'Variance', val: `${dept.variance >= 0 ? '+' : ''}${fmt(Math.abs(dept.variance))}`, color: dept.variance > 0 ? '#EF4444' : '#10B981' },
              ].map((item, j) => (
                <div key={j}>
                  <div style={{ fontSize: '10px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif", textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.label}</div>
                  <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '16px', color: item.color || '#0F172A' }}>{item.val}</div>
                </div>
              ))}
            </div>
            {dept.budget > 0 && (
              <div style={{ background: '#F1F5F9', borderRadius: '999px', height: 6, overflow: 'hidden' }}>
                <div style={{ background: dept.status === 'OVER_BUDGET' ? '#EF4444' : dept.variance < 0 ? '#10B981' : '#F59E0B', width: `${Math.min(100, (dept.actual / dept.budget) * 100)}%`, height: '100%', borderRadius: '999px', transition: 'width 500ms ease' }} />
              </div>
            )}
          </div>
        ))}
        {depts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8', fontSize: '13px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            No department budget data available. Create budgets and assign departments to see variance analysis.
          </div>
        )}
      </div>
    </PageWrap>
  );
};

// ─── 8. PO Match Screen ───────────────────────────────────────────────────────

const POMatchScreen = ({ onNavigate }) => {
  const { data, loading, error } = useAnalytics(() => window.TijoriAPI.AnalyticsAPI.poMatch());

  if (loading) return <PageWrap><ScreenLoader /></PageWrap>;
  if (error) return <PageWrap><ErrorBanner msg={error} /></PageWrap>;

  const d = data || {};
  const items = d.items || [];

  const STATUS_STYLE = {
    MATCHED:     { bg: '#ECFDF5', text: '#065F46' },
    VARIANCE:    { bg: '#FEF3C7', text: '#92400E' },
    MISSING_PO:  { bg: '#FEE2E2', text: '#991B1B' },
    MISSING_GRN: { bg: '#FFF7ED', text: '#9A3412' },
  };

  return (
    <PageWrap>
      <SectionTitle title="Three-Way PO Match" sub="Invoice vs Purchase Order vs Goods Receipt Note" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <AnalyticCard title="Pending PO Match" value={d.total_pending_po_match || 0} />
        <AnalyticCard title="Matched" value={d.matched || 0} color="#10B981" />
        <AnalyticCard title="Exceptions" value={d.exceptions || 0} color={d.exceptions > 0 ? '#EF4444' : '#10B981'} />
        <AnalyticCard title="Match Rate" value={`${d.match_rate_pct || 0}%`} color={d.match_rate_pct >= 80 ? '#10B981' : '#F59E0B'} />
      </div>

      <Table
        headers={['Reference', 'Vendor', 'Invoice Amt', 'PO Number', 'PO Amount', 'GRN', 'Variance', 'Status']}
        rows={items.map(item => {
          const sc = STATUS_STYLE[item.match_status] || STATUS_STYLE.MISSING_PO;
          return [
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>{item.ref_no}</span>,
            item.vendor,
            fmt(item.amount),
            item.po_number ? <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#5B21B6' }}>{item.po_number}</span> : <span style={{ color: '#EF4444', fontSize: '11px' }}>No PO</span>,
            item.po_amount ? fmt(item.po_amount) : '—',
            item.grn_received ? '✅' : '❌',
            <span style={{ color: item.variance > 0 ? '#F59E0B' : '#10B981', fontWeight: 700 }}>{item.variance > 0 ? fmt(item.variance) : '—'}</span>,
            <span style={{ background: sc.bg, color: sc.text, borderRadius: '6px', padding: '2px 8px', fontSize: '10px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{item.match_status.replace('_', ' ')}</span>,
          ];
        })}
        emptyMsg="No invoices pending PO match"
      />
    </PageWrap>
  );
};
