// Tijori AI — AI Intelligence Hub (Screen 18)

const SUGGESTED_QUERIES = [
  'Top 5 vendors by spend this quarter',
  'How many invoices are pending approval?',
  'Show anomaly summary',
  'Total outstanding amount',
  'Which department is over budget?',
];

const CopilotWidget = () => {
  const [messages, setMessages] = React.useState([
    { role: 'ai', text: 'Hello! I\'m your CFO Copilot. Ask me anything about your financial data — vendors, invoices, anomalies, or cashflow.', time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) }
  ]);
  const [input, setInput] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const endRef = React.useRef(null);

  React.useEffect(() => {
    if (endRef.current) endRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    const q = text || input.trim();
    if (!q) return;
    setInput('');
    const time = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { role: 'user', text: q, time }]);
    setLoading(true);
    try {
      const { NLQueryAPI } = window.TijoriAPI;
      const res = await NLQueryAPI.ask(q);
      const answer = res.answer || res.error || 'No response.';
      const insight = res.insight || '';
      setMessages(prev => [...prev, {
        role: 'ai',
        text: answer,
        insight,
        model: res.model,
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', text: 'Sorry, I encountered an error. Please try again.', time, error: true }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card style={{ padding: '0', overflow: 'hidden', marginTop: '24px' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F0EE', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <AIBadge />
        <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '17px', color: '#0F172A' }}>CFO Copilot</div>
        <LiveDot />
        <span style={{ fontSize: '11px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif", marginLeft: 'auto' }}>Powered by OpenRouter · Real financial data</span>
      </div>

      {/* Suggested queries */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid #F8F7F5', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {SUGGESTED_QUERIES.map(q => (
          <button key={q} onClick={() => sendMessage(q)} disabled={loading}
            style={{ background: '#F5F3FF', border: '1px solid #EDE9FE', borderRadius: '999px', padding: '5px 12px', fontSize: '11px', color: '#5B21B6', fontWeight: 600, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", transition: 'all 150ms' }}>
            {q}
          </button>
        ))}
      </div>

      {/* Chat messages */}
      <div style={{ height: 320, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px', background: '#FAFAF8' }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', gap: '8px' }}>
            {m.role === 'ai' && (
              <div style={{ width: 28, height: 28, borderRadius: '8px', background: 'linear-gradient(135deg, #E8783B, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                <span style={{ fontSize: '12px', color: 'white', fontWeight: 700 }}>✦</span>
              </div>
            )}
            <div style={{ maxWidth: '75%' }}>
              <div style={{
                padding: '10px 14px', borderRadius: m.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                background: m.role === 'user' ? 'linear-gradient(135deg, #E8783B, #FF6B35)' : m.error ? '#FEE2E2' : 'white',
                color: m.role === 'user' ? 'white' : m.error ? '#991B1B' : '#0F172A',
                fontSize: '13px', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.6,
                boxShadow: m.role === 'ai' ? '0 1px 4px rgba(0,0,0,0.07)' : 'none',
                border: m.role === 'ai' && !m.error ? '1px solid #F1F0EE' : 'none',
              }}>{m.text}</div>
              {m.insight && (
                <div style={{ background: '#F5F3FF', border: '1px solid #EDE9FE', borderRadius: '8px', padding: '8px 12px', marginTop: '6px', fontSize: '12px', color: '#5B21B6', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  <span style={{ fontWeight: 700 }}>Insight: </span>{m.insight}
                </div>
              )}
              <div style={{ fontSize: '10px', color: '#CBD5E1', marginTop: '4px', fontFamily: "'Plus Jakarta Sans', sans-serif", textAlign: m.role === 'user' ? 'right' : 'left' }}>
                {m.time}{m.model ? ` · ${m.model.split('/').pop()}` : ''}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ width: 28, height: 28, borderRadius: '8px', background: 'linear-gradient(135deg, #E8783B, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '12px', color: 'white' }}>✦</span>
            </div>
            <div style={{ background: 'white', border: '1px solid #F1F0EE', borderRadius: '12px 12px 12px 2px', padding: '10px 16px', display: 'flex', gap: '4px' }}>
              {[0,1,2].map(n => (
                <div key={n} style={{ width: 6, height: 6, borderRadius: '50%', background: '#E8783B', animation: 'dotPulse 1.2s ease infinite', animationDelay: `${n * 0.2}s` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid #F1F0EE', display: 'flex', gap: '10px', alignItems: 'center', background: 'white' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder="Ask about vendors, invoices, cashflow, anomalies…"
          disabled={loading}
          style={{ flex: 1, padding: '10px 14px', border: '1.5px solid #E2E8F0', borderRadius: '10px', fontSize: '13px', fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none', background: '#FAFAF8' }}
        />
        <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
          style={{ background: !input.trim() || loading ? '#F1F5F9' : 'linear-gradient(135deg, #E8783B, #FF6B35)', color: !input.trim() || loading ? '#94A3B8' : 'white', border: 'none', borderRadius: '10px', padding: '10px 16px', cursor: !input.trim() || loading ? 'default' : 'pointer', fontSize: '13px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", transition: 'all 150ms' }}>
          Send ↑
        </button>
      </div>
    </Card>
  );
};

const AIHubScreen = ({ onNavigate }) => {
  const [scenario, setScenario] = React.useState('Base');
  const [summaryOpen, setSummaryOpen] = React.useState(false);
  const [selectedMonth, setSelectedMonth] = React.useState(null);
  const [runningAll, setRunningAll] = React.useState(false);
  const [cfData, setCfData] = React.useState(null);

  React.useEffect(() => {
    window.TijoriAPI.BudgetAPI.cashflow()
      .then(d => setCfData(d))
      .catch(() => {});
  }, []);

  const runAll = () => {
    setRunningAll(true);
    setTimeout(() => setRunningAll(false), 2400);
  };

  // ── Cash Flow Chart ───────────────────────────────────────────────────────
  const W = 760, H = 240;
  const chartPad = { l: 60, r: 30, t: 20, b: 30 };

  const pastData = [
    { label: 'Oct', val: 82 }, { label: 'Nov', val: 74 }, { label: 'Dec', val: 91 },
    { label: 'Jan', val: 68 }, { label: 'Feb', val: 85 }, { label: 'Mar', val: 96 },
  ];
  const forecastBase = [
    { label: 'Apr', val: 88 }, { label: 'May', val: 72 }, { label: 'Jun', val: 95 },
    { label: 'Jul', val: 58 }, { label: 'Aug', val: 103 }, { label: 'Sep', val: 118 },
  ];
  const forecastOpt = forecastBase.map(p => ({ ...p, val: p.val * 1.15 }));
  const forecastPess = forecastBase.map(p => ({ ...p, val: p.val * 0.8 }));
  const forecast = scenario === 'Base' ? forecastBase : scenario === 'Optimistic' ? forecastOpt : forecastPess;

  const allData = [...pastData, ...forecast];
  const allVals = allData.map(d => d.val);
  const minV = Math.min(...allVals) - 10, maxV = Math.max(...allVals) + 10;
  const totalPoints = allData.length;

  const toX = (i) => chartPad.l + (i / (totalPoints - 1)) * (W - chartPad.l - chartPad.r);
  const toY = (v) => H - chartPad.b - ((v - minV) / (maxV - minV)) * (H - chartPad.t - chartPad.b);

  const pastPts = pastData.map((d, i) => ({ x: toX(i), y: toY(d.val) }));
  const forecastPts = forecast.map((d, i) => ({ x: toX(pastData.length - 1 + i), y: toY(d.val) }));
  const bandHigh = forecast.map((d, i) => ({ x: toX(pastData.length - 1 + i), y: toY(d.val + 12) }));
  const bandLow = forecast.map((d, i) => ({ x: toX(pastData.length - 1 + i), y: toY(d.val - 12) }));

  const lp = (pts) => pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const bandPath = [
    lp(bandHigh),
    ...[...bandLow].reverse().map(p => `L ${p.x} ${p.y}`),
    'Z'
  ].join(' ');

  const pinEvents = [
    { x: toX(pastData.length + 1), y: toY(forecast[1]?.val || 72) - 20, label: 'AP due: ₹14L (Vendor XYZ)', color: '#E8783B', icon: '↓' },
    { x: toX(pastData.length + 2), y: toY(forecast[2]?.val || 95) - 20, label: 'AR receipt: ₹22L (Acme)', color: '#10B981', icon: '↑' },
    { x: toX(pastData.length + 3), y: toY(forecast[3]?.val || 58) - 24, label: 'Payroll: ₹45L', color: '#EF4444', icon: '⚠' },
  ];

  // ── Summary months ────────────────────────────────────────────────────────
  const summaryMonths = [
    { month: 'March 2026', status: 'REVIEWED', revenue: '₹62L', expenses: '₹50L', profit: '₹12L', cash: '₹18L', insight: 'Travel expenses up 34% vs February. AR collection rate improved to 82%.' },
    { month: 'February 2026', status: 'AUTO_GEN', revenue: '₹51L', expenses: '₹44L', profit: '₹7L', cash: '₹15L', insight: 'Engineering budget at 95% — recommend variance review before Q4.' },
    { month: 'January 2026', status: 'AUTO_GEN', revenue: '₹48L', expenses: '₹52L', profit: '-₹4L', cash: '₹11L', insight: 'Net loss driven by one-time infrastructure spend. Normalised margin 14%.' },
  ];

  // ── Optimisation recommendations ─────────────────────────────────────────
  const payRecs = [
    { vendor: 'NovaBridge Infra', invoices: 'BILL-2026-00042', amount: '₹8,40,000', due: 'May 10', suggested: 'May 3', type: 'discount', tip: 'Save ₹4,200 — 0.5% early payment discount available' },
    { vendor: 'Sigma Electrical', invoices: 'BILL-2026-00038', amount: '₹2,15,500', due: 'Apr 25', suggested: 'Apr 24', type: 'lateFee', tip: 'Pay by Apr 24 to avoid ₹1,080 late fee' },
    { vendor: 'GlobalSync Tech', invoices: 'BILL-2026-00035,036,037', amount: '₹3,67,500', due: 'Apr 28', suggested: 'Apr 28', type: 'batch', tip: 'Batch with 2 others — reduces transaction fees by ₹600' },
    { vendor: 'TechLogistics', invoices: 'BILL-2026-00042', amount: '₹3,40,000', due: 'Apr 20', suggested: 'Apr 26', type: 'shortfall', tip: 'Cash shortfall risk if paid before Apr 25 — delay by 6 days' },
  ];

  const tipColor = { discount: { bg: '#D1FAE5', color: '#065F46' }, lateFee: { bg: '#FEF3C7', color: '#92400E' }, batch: { bg: '#FFF7ED', color: '#C2410C' }, shortfall: { bg: '#FEE2E2', color: '#991B1B' } };

  const summaryStatusStyle = { REVIEWED: { bg: '#D1FAE5', color: '#065F46', label: 'Reviewed' }, AUTO_GEN: { bg: '#EDE9FE', color: '#5B21B6', label: 'Auto-Generated' }, DRAFT: { bg: '#FEF3C7', color: '#92400E', label: 'Draft' } };

  return (
    <div style={{ padding: '32px 32px 60px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '32px', color: '#0F172A', letterSpacing: '-1.5px' }}>AI Intelligence</h1>
            <AIBadge />
            <span style={{ background: 'linear-gradient(135deg, #E8783B22, #8B5CF622)', border: '1px solid #EDE9FE', color: '#5B21B6', padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Powered by FinanceAI</span>
          </div>
          <div style={{ fontSize: '13px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Predictive forecasting, automated summaries, and vendor payment optimisation.</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <LiveDot />
          <Btn variant="primary" icon={runningAll ? <span style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} /> : <span>✦</span>} onClick={runAll}>
            {runningAll ? 'Running Models…' : 'Run All Models'}
          </Btn>
        </div>
      </div>

      {/* ── Panel 1 — Cash Flow Forecasting ── */}
      <Card style={{ padding: '28px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '20px', color: '#0F172A', letterSpacing: '-0.5px', marginBottom: '2px' }}>Cash Flow Forecasting</div>
            <div style={{ fontSize: '12px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>90-day rolling · Last run: 2h ago</div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {['Base', 'Optimistic', 'Pessimistic'].map(s => (
              <button key={s} onClick={() => setScenario(s)}
                style={{ padding: '5px 12px', borderRadius: '999px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif", background: scenario === s ? '#E8783B' : '#F8F7F5', color: scenario === s ? 'white' : '#64748B', transition: 'all 150ms' }}>
                {s}
              </button>
            ))}
            <Btn variant="secondary" small>Rerun</Btn>
          </div>
        </div>

        {/* Chart */}
        <div style={{ position: 'relative' }}>
          <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
              const y = chartPad.t + t * (H - chartPad.t - chartPad.b);
              const val = Math.round(maxV - t * (maxV - minV));
              return (
                <g key={i}>
                  <line x1={chartPad.l} y1={y} x2={W - chartPad.r} y2={y} stroke="#F1F0EE" strokeWidth="1" />
                  <text x={chartPad.l - 6} y={y + 4} fontSize="10" fill="#94A3B8" textAnchor="end" fontFamily="Plus Jakarta Sans">₹{val}L</text>
                </g>
              );
            })}

            {/* Zero / shortfall line */}
            <line x1={chartPad.l} y1={toY(0)} x2={W - chartPad.r} y2={toY(0)} stroke="#EF4444" strokeWidth="1" strokeDasharray="4,4" opacity="0.5" />
            <text x={chartPad.l + 4} y={toY(0) - 4} fontSize="9" fill="#EF4444" fontFamily="Plus Jakarta Sans" opacity="0.7">Shortfall Zone</text>

            {/* X labels */}
            {allData.map((d, i) => (
              <text key={i} x={toX(i)} y={H - 4} fontSize="10" fill={i >= pastData.length ? '#94A3B8' : '#64748B'} textAnchor="middle" fontFamily="Plus Jakarta Sans" fontWeight={i === pastData.length - 1 ? '700' : '400'}>{d.label}</text>
            ))}

            {/* Divider: past / forecast */}
            <line x1={toX(pastData.length - 1)} y1={chartPad.t} x2={toX(pastData.length - 1)} y2={H - chartPad.b} stroke="#E2E8F0" strokeWidth="1.5" strokeDasharray="4,4" />
            <text x={toX(pastData.length - 1) + 4} y={chartPad.t + 12} fontSize="9" fill="#94A3B8" fontFamily="Plus Jakarta Sans">Forecast →</text>

            {/* Confidence band */}
            <path d={bandPath} fill="rgba(232,120,59,0.1)" />

            {/* Past line */}
            <path d={lp(pastPts)} fill="none" stroke="#E8783B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {pastPts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="4" fill="white" stroke="#E8783B" strokeWidth="2" />)}

            {/* Forecast line */}
            <path d={`M ${pastPts[pastPts.length - 1].x} ${pastPts[pastPts.length - 1].y} ${forecastPts.map(p => `L ${p.x} ${p.y}`).join(' ')}`} fill="none" stroke="#E8783B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6,4" />
            {forecastPts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="4" fill="white" stroke="#E8783B" strokeWidth="2" opacity="0.6" />)}

            {/* Event pins */}
            {pinEvents.map((pin, i) => (
              <g key={i}>
                <circle cx={pin.x} cy={pin.y + 20} r="6" fill={pin.color} />
                <text x={pin.x} y={pin.y + 24} textAnchor="middle" fontSize="8" fill="white" fontWeight="700">{pin.icon}</text>
              </g>
            ))}
          </svg>

          {/* Legend */}
          <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '11px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: 12, height: 3, background: '#E8783B', display: 'inline-block', borderRadius: 2 }} />Actual</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: 12, height: 2, background: '#E8783B', display: 'inline-block', borderRadius: 2, opacity: 0.5 }} />Forecast ({scenario})</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: 12, height: 10, background: 'rgba(232,120,59,0.15)', display: 'inline-block', borderRadius: 2 }} />80% Confidence Band</span>
            {[['#E8783B','AP Due'],['#10B981','AR Receipt'],['#EF4444','Payroll']].map(([c, l]) => <span key={l} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: c, display: 'inline-block' }} />{l}</span>)}
          </div>
        </div>

        {/* Insight cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginTop: '20px' }}>
          {[
            { label: 'Surplus Peak', value: '₹1.18M', date: 'Sep 2026', color: '#10B981', bg: '#F0FDF4', border: '#BBF7D0', icon: '↑' },
            { label: 'Shortfall Risk', value: '₹34L deficit', date: 'Jul 2026 if delayed', color: '#EF4444', bg: '#FEF2F2', border: '#FECACA', icon: '⚠' },
            { label: 'Recommended Action', value: 'Accelerate ₹8L AR', date: '3 customers flagged', color: '#E8783B', bg: '#FFF7ED', border: '#FED7AA', icon: '✦' },
          ].map((c, i) => (
            <div key={i} style={{ padding: '16px', background: c.bg, border: `1px solid ${c.border}`, borderRadius: '12px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ width: 24, height: 24, borderRadius: '50%', background: c.color + '22', color: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>{c.icon}</span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{c.label}</span>
              </div>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '20px', color: c.color, letterSpacing: '-0.5px', marginBottom: '3px' }}>{c.value}</div>
              <div style={{ fontSize: '11px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{c.date}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Live Forecast Narrative from API ── */}
      {cfData && cfData.narrative && (
        <div style={{ background: 'linear-gradient(135deg, #FFF8F5, #FFF3E6)', border: '1px solid #FED7AA', borderRadius: '14px', padding: '18px 22px', marginBottom: '24px', display: 'flex', gap: '14px' }}>
          <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'linear-gradient(135deg, #E8783B, #FF6B35)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ color: 'white', fontSize: '16px', fontWeight: 700 }}>✦</span>
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#E8783B', fontFamily: "'Plus Jakarta Sans', sans-serif", textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>AI Forecast Narrative — Live Data</div>
            <div style={{ fontSize: '13px', color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.7 }}>{cfData.narrative}</div>
            <div style={{ marginTop: '10px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              {[
                { label: 'Opening Balance', val: '₹' + Number(cfData.opening_balance || 0).toLocaleString('en-IN') },
                { label: 'Projected Closing', val: '₹' + Number(cfData.projected_closing_balance || 0).toLocaleString('en-IN') },
                { label: 'Known Payments', val: cfData.known_upcoming_payments || 0 },
              ].map((item, i) => (
                <div key={i} style={{ fontSize: '12px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  <span style={{ color: '#94A3B8', marginRight: '4px' }}>{item.label}:</span>
                  <span style={{ fontWeight: 700, color: '#0F172A' }}>{item.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Panel 2 — Monthly Summaries ── */}
      <Card style={{ padding: '28px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '20px', color: '#0F172A', letterSpacing: '-0.5px' }}>Monthly Financial Summaries</div>
            <div style={{ fontSize: '12px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif", marginTop: '2px' }}>Auto-generated on 1st of each month</div>
          </div>
          <Btn variant="secondary" small icon={<AIBadge small />}>Generate Now</Btn>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          {summaryMonths.map((s, i) => {
            const [hov, setHov] = React.useState(false);
            const ss = summaryStatusStyle[s.status];
            return (
              <div key={i}
                onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
                style={{ background: 'white', border: `2px solid ${hov ? '#E8783B' : '#F1F0EE'}`, borderRadius: '16px', padding: '20px', cursor: 'pointer', transition: 'all 200ms', transform: hov ? 'translateY(-2px)' : 'none', boxShadow: hov ? '0 8px 24px rgba(0,0,0,0.10)' : '0 2px 8px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                  <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '18px', color: '#0F172A', letterSpacing: '-0.5px' }}>{s.month}</div>
                  <span style={{ background: ss.bg, color: ss.color, padding: '3px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", whiteSpace: 'nowrap' }}>
                    {s.status === 'AUTO_GEN' && <AIBadge small />} {ss.label}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                  {[['Revenue', s.revenue, '#10B981'], ['Expenses', s.expenses, '#E8783B'], ['Net Profit', s.profit, s.profit.startsWith('-') ? '#EF4444' : '#10B981'], ['Cash', s.cash, '#E8783B']].map(([l, v, c]) => (
                    <div key={l}>
                      <div style={{ fontSize: '10px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{l}</div>
                      <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '18px', color: c, letterSpacing: '-0.5px' }}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: '12px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.5, marginBottom: '14px', borderTop: '1px solid #F8F7F5', paddingTop: '12px' }}>
                  <AIBadge small /> {s.insight}
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <Btn variant="primary" small onClick={() => { setSelectedMonth(s); setSummaryOpen(true); }}>View Full →</Btn>
                  <Btn variant="secondary" small>PDF</Btn>
                </div>
              </div>
            );
          })}
        </div>

        {/* Schedule settings */}
        <div style={{ marginTop: '20px', padding: '16px', background: '#F8F7F5', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Auto-generate on 1st of each month</div>
            <div style={{ fontSize: '11px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif", marginTop: '2px' }}>Sends to: finance@acmecorp.in, cfo@acmecorp.in</div>
          </div>
          <div style={{ width: 44, height: 24, borderRadius: 12, background: '#E8783B', cursor: 'pointer', position: 'relative' }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'white', position: 'absolute', top: 3, left: 23, boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }} />
          </div>
        </div>
      </Card>

      {/* ── Panel 3 — Vendor Payment Optimisation ── */}
      <Card style={{ padding: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '20px', color: '#0F172A', letterSpacing: '-0.5px' }}>Vendor Payment Optimisation</div>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#E8783B', display: 'block', animation: 'dotPulse 1.5s ease infinite' }} />
          </div>
          <AIBadge />
        </div>
        <div style={{ fontSize: '12px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '20px' }}>AI analyses payment terms and cash flow to suggest optimal payment timing.</div>

        {/* How it works */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
          {[
            { icon: '📊', title: 'Analyses cash flow', desc: 'Reads 90-day forecast data' },
            { icon: '📋', title: 'Checks payment terms', desc: 'Discounts, fees, vendor relationships' },
            { icon: '✦', title: 'Recommends timing', desc: 'Batch payments to optimise cash' },
          ].map((h, i) => (
            <div key={i} style={{ display: 'flex', gap: '10px', padding: '14px', background: '#F8F7F5', borderRadius: '10px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '18px' }}>{h.icon}</span>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{h.title}</div>
                <div style={{ fontSize: '11px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{h.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary card */}
        <div style={{ background: 'linear-gradient(135deg, rgba(232,120,59,0.06), rgba(16,185,129,0.06))', border: '1px solid #FED7AA', borderRadius: '14px', padding: '20px', marginBottom: '20px', display: 'flex', gap: '32px', alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '4px' }}>Total Savings</div>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '28px', color: '#10B981', letterSpacing: '-1px' }}>₹14,200</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '4px' }}>Avoided Late Fees</div>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '28px', color: '#E8783B', letterSpacing: '-1px' }}>₹3,800</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '4px' }}>Optimised DPO</div>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '28px', color: '#F59E0B', letterSpacing: '-1px' }}>+4.2d</div>
          </div>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
            <Btn variant="primary">Apply All Recommendations</Btn>
          </div>
        </div>

        {/* Recommendations table */}
        <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', border: '1px solid #F1F0EE' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8F7F5' }}>
                {['Vendor', 'Amount Due', 'Due Date', 'Suggested Pay', 'AI Insight', 'Action'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '10px', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payRecs.map((r, i) => {
                const tc = tipColor[r.type];
                return (
                  <tr key={i} style={{ borderTop: '1px solid #F1F0EE', height: 60, transition: 'background 150ms' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#FFF8F5'}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                    <td style={{ padding: '0 14px', fontSize: '13px', fontWeight: 600, color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{r.vendor}</td>
                    <td style={{ padding: '0 14px', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '14px', color: '#E8783B', letterSpacing: '-0.5px' }}>{r.amount}</td>
                    <td style={{ padding: '0 14px', fontSize: '12px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{r.due}</td>
                    <td style={{ padding: '0 14px', fontSize: '12px', fontWeight: 700, color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{r.suggested}</td>
                    <td style={{ padding: '0 14px', maxWidth: 200 }}>
                      <span style={{ background: tc.bg, color: tc.color, padding: '4px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'inline-block' }}>{r.tip}</span>
                    </td>
                    <td style={{ padding: '0 14px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <Btn variant="primary" small>Pay Now</Btn>
                        <Btn variant="secondary" small>Schedule</Btn>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* CFO Copilot — NL Query */}
      <CopilotWidget />

      {/* Summary detail panel */}
      <SidePanel open={summaryOpen} onClose={() => setSummaryOpen(false)} title={selectedMonth?.month || ''} width={500}>
        {selectedMonth && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <AIBadge />
              <LiveDot color="#8B5CF6" />
              <span style={{ fontSize: '11px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>AI-generated summary</span>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '8px' }}>Executive Summary</div>
              {['Revenue grew 12% MoM driven by 2 large AR collections from Acme Corp and Global Tech.', 'Engineering budget hit 100% — booking suspension triggered.', `Travel expenses up 34% vs prior month — ${selectedMonth.month === 'March 2026' ? 'conference season impact.' : 'investigate root cause.'}`, 'Net profit margin improved to 19% — ahead of Q4 target.'].map((b, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ color: '#E8783B', fontWeight: 700, flexShrink: 0, fontSize: '13px' }}>·</span>
                  <span style={{ fontSize: '13px', color: '#475569', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.5 }}>{b}</span>
                </div>
              ))}
            </div>
            <div style={{ background: '#F5F3FF', border: '1px solid #EDE9FE', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}><AIBadge small /><span style={{ fontSize: '11px', fontWeight: 700, color: '#5B21B6', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Next Month Outlook</span></div>
              <div style={{ fontSize: '13px', color: '#4C1D95', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.5 }}>Based on current pipeline, next month revenue is forecast at ₹68L (±12%). Watch Engineering budget — 3 large invoices pending CFO approval.</div>
            </div>
            <TjTextarea label="Finance Manager Notes" placeholder="Add notes to this summary…" rows={3} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <Btn variant="primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setSummaryOpen(false)}>Save Notes</Btn>
              <Btn variant="secondary" small>Export PDF</Btn>
            </div>
          </>
        )}
      </SidePanel>
    </div>
  );
};

Object.assign(window, { AIHubScreen });
