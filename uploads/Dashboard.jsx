// Tijori AI — CFO Command Center Dashboard

const DashboardScreen = () => {
  const [copilotOpen, setCopilotOpen] = React.useState(false);
  const [copilotMsg, setCopilotMsg] = React.useState('');
  const [chat, setChat] = React.useState([
    { role: 'ai', text: 'Good morning, Rohan. Outstanding payables are up 8% WoW. 3 anomaly flags require your review. Shall I draft a summary report?' }
  ]);
  const [dismissed, setDismissed] = React.useState([]);

  const sendMsg = () => {
    if (!copilotMsg.trim()) return;
    const q = copilotMsg;
    setChat(c => [...c, { role: 'user', text: q }]);
    setCopilotMsg('');
    setTimeout(() => {
      const responses = {
        default: 'Based on current AP data, your 90-day cash position looks stable. Projected outflow of ₹4.2Cr next month, with ₹1.1Cr in pending approvals that may accelerate.',
      };
      setChat(c => [...c, { role: 'ai', text: responses.default }]);
    }, 900);
  };

  const riskItems = [
    { id: 1, score: 94, color: '#EF4444', title: 'Duplicate Invoice Detected', desc: 'INV-2024-082 matches INV-2024-071 from TechLogistics — identical amount ₹3,40,000 within 8 days.', time: '4m ago' },
    { id: 2, score: 78, color: '#F59E0B', title: 'Unusual Vendor Velocity', desc: 'GlobalSync submitted 6 invoices in 3 days — 4× their historical average.', time: '22m ago' },
    { id: 3, score: 61, color: '#F59E0B', title: 'Budget Cap Approaching', desc: 'Engineering at 98% utilisation. Any new invoice will trigger automatic suspension.', time: '1h ago' },
    { id: 4, score: 34, color: '#94A3B8', title: 'Weekend Submission', desc: 'INV-2024-089 submitted Saturday 11:43 PM by an unverified vendor contact.', time: '2h ago' },
  ];

  // Cash flow chart data
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const projected = [320, 280, 410, 380, 520, 460];
  const bandHigh = projected.map(v => v + 60);
  const bandLow = projected.map(v => v - 50);
  const cw = 520, ch = 200;
  const maxV = Math.max(...bandHigh), minV = Math.min(...bandLow);
  const px = (i) => 48 + (i / (projected.length - 1)) * (cw - 72);
  const py = (v) => ch - 20 - ((v - minV) / (maxV - minV)) * (ch - 40);
  const linePath = projected.map((v, i) => `${i === 0 ? 'M' : 'L'} ${px(i)} ${py(v)}`).join(' ');
  const bandPath = [
    ...bandHigh.map((v, i) => `${i === 0 ? 'M' : 'L'} ${px(i)} ${py(v)}`),
    ...[...bandLow].reverse().map((v, i) => `L ${px(bandLow.length - 1 - i)} ${py(v)}`),
    'Z'
  ].join(' ');

  const approvalQueue = [
    { id: 'INV-2024-091', vendor: 'NovaBridge Infra', amount: '₹8,40,000', date: 'Apr 18, 2026' },
    { id: 'INV-2024-089', vendor: 'Sigma Electrical', amount: '₹2,15,500', date: 'Apr 17, 2026' },
  ];

  return (
    <div style={{ padding: '32px 32px 100px', position: 'relative' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', animation: 'fadeUp 300ms ease both' }}>
        <div>
          <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '32px', color: '#0F172A', letterSpacing: '-1.5px', marginBottom: '4px' }}>Intelligence Command</h1>
          <div style={{ fontSize: '13px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>April 19, 2026 — Operational Overview</div>
        </div>
        <Btn variant="primary" pill icon={<span>✦</span>}>Ask Your Data</Btn>
      </div>

      {/* CFO Approval Queue */}
      <div style={{ marginBottom: '24px', animation: 'fadeUp 300ms 80ms ease both', opacity: 0, animationFillMode: 'forwards' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <span style={{ fontSize: '16px' }}>⚖</span>
          <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '16px', color: '#0F172A' }}>Pending CFO Approvals</span>
          <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#E8783B', cursor: 'pointer', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>View All →</span>
        </div>
        <div style={{ display: 'flex', gap: '14px' }}>
          {approvalQueue.map(inv => (
            <div key={inv.id} style={{ background: 'white', borderRadius: '14px', padding: '18px 20px', border: '1px solid #F1F0EE', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', flex: 1, display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#E8783B', fontWeight: 500, marginBottom: '4px' }}>{inv.id}</div>
                <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '16px', color: '#0F172A' }}>{inv.vendor}</div>
                <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{inv.date}</div>
              </div>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '22px', color: '#E8783B', letterSpacing: '-1px' }}>{inv.amount}</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Btn variant="primary" small>Approve</Btn>
                <Btn variant="destructive" small>Reject</Btn>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', animation: 'fadeUp 300ms 160ms ease both', opacity: 0, animationFillMode: 'forwards' }}>
        <KPICard label="Total Outstanding" value="₹2.84Cr" delta="↑ 8.2% WoW" deltaType="negative" sublabel="vs ₹2.62Cr" />
        <KPICard label="Pending Approvals" value="7" delta="↑ 3 new" deltaType="neutral" sublabel="across all levels" pulse />
        <KPICard label="Anomalies Detected" value="3" delta="High confidence" deltaType="negative" sublabel="require review" pulse />
      </div>

      {/* Main bento */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '20px', marginBottom: '20px', animation: 'fadeUp 300ms 240ms ease both', opacity: 0, animationFillMode: 'forwards' }}>
        {/* Cash flow chart */}
        <Card style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
            <div>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '17px', color: '#0F172A' }}>90-Day Cash Flow Projection</div>
              <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>With 85% confidence bands · Updated 12m ago</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '11px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 500 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: 10, height: 3, background: '#E8783B', borderRadius: 2, display: 'inline-block' }} />Projected</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: 10, height: 10, background: 'rgba(232,120,59,0.2)', borderRadius: 2, display: 'inline-block' }} />Confidence Band</span>
            </div>
          </div>
          <div style={{ position: 'relative' }}>
            <svg width="100%" viewBox={`0 0 ${cw} ${ch}`} style={{ overflow: 'visible' }}>
              {/* Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
                const yy = 20 + t * (ch - 40);
                const val = Math.round(maxV - t * (maxV - minV));
                return (
                  <g key={i}>
                    <line x1={48} y1={yy} x2={cw - 24} y2={yy} stroke="#F1F0EE" strokeWidth="1" />
                    <text x={40} y={yy + 4} fontSize="9" fill="#94A3B8" textAnchor="end" fontFamily="Plus Jakarta Sans">{val}</text>
                  </g>
                );
              })}
              {/* X labels */}
              {months.map((m, i) => (
                <text key={i} x={px(i)} y={ch - 4} fontSize="10" fill="#94A3B8" textAnchor="middle" fontFamily="Plus Jakarta Sans">{m}</text>
              ))}
              {/* Confidence band */}
              <path d={bandPath} fill="rgba(232,120,59,0.12)" />
              {/* Projected line */}
              <path d={linePath} fill="none" stroke="#E8783B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)" />
              {/* Data points */}
              {projected.map((v, i) => (
                <circle key={i} cx={px(i)} cy={py(v)} r="4" fill="white" stroke="#E8783B" strokeWidth="2" />
              ))}
              <defs>
                <filter id="glow"><feGaussianBlur stdDeviation="2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
              </defs>
            </svg>
            {/* Floating insight */}
            <div style={{ position: 'absolute', top: '20%', right: '22%', background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)', border: '1px solid #F1F0EE', borderRadius: '12px', padding: '10px 14px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '13px', color: '#E8783B' }}>⚡ Critical Peak</div>
              <div style={{ fontSize: '11px', color: '#475569', fontFamily: "'Plus Jakarta Sans', sans-serif", marginTop: '2px' }}>May 2026: ₹5.2Cr projected</div>
            </div>
          </div>
        </Card>

        {/* Risk Watch */}
        <Card style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid #F1F0EE', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '17px', color: '#0F172A' }}>Risk Watch</div>
            <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', color: '#94A3B8', background: '#F8F7F5', padding: '3px 8px', borderRadius: '6px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>PRIORITISED FEED</span>
          </div>
          <div style={{ overflow: 'auto', maxHeight: 340 }}>
            {riskItems.filter(r => !dismissed.includes(r.id)).map(r => (
              <div key={r.id} style={{ padding: '14px 18px', borderLeft: `4px solid ${r.color}`, borderBottom: '1px solid #F8F7F5', animation: r.score > 80 ? 'borderPulse 2s ease infinite' : 'none', background: r.score > 80 ? 'rgba(239,68,68,0.02)' : 'white', transition: 'background 150ms' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                  <span style={{ background: r.color, color: 'white', padding: '2px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{r.score}% Risk</span>
                  <span style={{ fontSize: '10px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{r.time}</span>
                </div>
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '13px', color: '#0F172A', marginBottom: '4px' }}>{r.title}</div>
                <div style={{ fontSize: '12px', color: '#64748B', lineHeight: 1.5, fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '10px' }}>{r.desc}</div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button style={{ fontSize: '12px', color: '#E8783B', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif", padding: 0 }}>Explain →</button>
                  <button onClick={() => setDismissed(d => [...d, r.id])} style={{ fontSize: '12px', color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", padding: 0 }}>Dismiss</button>
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: '14px 18px' }}>
            <button style={{ width: '100%', padding: '9px', border: '1.5px dashed #E2E8F0', borderRadius: '10px', background: 'none', cursor: 'pointer', fontSize: '12px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600 }}>View Full Audit Log →</button>
          </div>
        </Card>
      </div>

      {/* Bottom bento */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 180px 180px', gap: '16px', animation: 'fadeUp 300ms 320ms ease both', opacity: 0, animationFillMode: 'forwards' }}>
        {/* Treasury ring */}
        <Card style={{ padding: '24px', display: 'flex', gap: '20px', alignItems: 'center', gridColumn: 'span 2' }}>
          <div style={{ position: 'relative', width: 130, height: 130, flexShrink: 0 }}>
            <svg width="130" height="130" viewBox="0 0 130 130">
              <circle cx="65" cy="65" r="52" fill="none" stroke="#F1F5F9" strokeWidth="12"/>
              <circle cx="65" cy="65" r="52" fill="none" stroke="url(#ringGrad)" strokeWidth="12" strokeDasharray={`${0.85 * 2 * Math.PI * 52} ${2 * Math.PI * 52}`} strokeLinecap="round" transform="rotate(-90 65 65)"/>
              <defs><linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#E8783B"/><stop offset="100%" stopColor="#FF6B35"/></linearGradient></defs>
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '26px', color: '#0F172A', letterSpacing: '-1px' }}>85%</div>
              <div style={{ fontSize: '8px', color: '#94A3B8', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Health</div>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '17px', color: '#0F172A', marginBottom: '12px' }}>Treasury Health Index</div>
            {[{ label: 'Global Health', val: '85%', status: 'GOOD', color: '#10B981' }, { label: 'Liquidity', val: 'Excellent', status: 'EXCELLENT', color: '#10B981' }, { label: 'Solvency', val: 'Stable', status: 'STABLE', color: '#F59E0B' }].map(r => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #F8F7F5' }}>
                <span style={{ fontSize: '13px', color: '#475569', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{r.label}</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: r.color, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{r.val}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* AI Action Cards */}
        {[
          { icon: '✦', title: 'Generate 10-Q', sub: 'AI-compiled regulatory filing draft' },
          { icon: '⬡', title: 'Audit Sweep', sub: 'Full-spectrum transaction scan' },
        ].map((ac, i) => {
          const [hov, setHov] = React.useState(false);
          return (
            <div key={i} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
              style={{ background: hov ? 'linear-gradient(135deg, #E8783B, #FF6B35)' : 'white', borderRadius: '16px', padding: '22px 20px', boxShadow: hov ? '0 8px 32px rgba(232,120,59,0.3)' : '0 2px 12px rgba(0,0,0,0.06)', transition: 'all 250ms ease', transform: hov ? 'translateY(-3px)' : 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 140 }}>
              <div>
                <div style={{ fontSize: '22px', color: hov ? 'rgba(255,255,255,0.9)' : '#E8783B', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {ac.icon}
                  <AIBadge />
                </div>
                <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '16px', color: hov ? 'white' : '#0F172A', letterSpacing: '-0.5px' }}>{ac.title}</div>
                <div style={{ fontSize: '11px', color: hov ? 'rgba(255,255,255,0.7)' : '#94A3B8', marginTop: '4px', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.4 }}>{ac.sub}</div>
              </div>
              <div style={{ fontSize: '12px', color: hov ? 'rgba(255,255,255,0.8)' : '#E8783B', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif", marginTop: '12px' }}>Run now →</div>
            </div>
          );
        })}
      </div>

      {/* Floating Copilot FAB */}
      <button onClick={() => setCopilotOpen(true)}
        style={{ position: 'fixed', bottom: 28, right: 28, width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg, #E8783B, #FF6B35)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: 'white', animation: 'glowPulse 3s ease infinite', zIndex: 100, boxShadow: '0 4px 20px rgba(232,120,59,0.5)' }}>
        ✦
      </button>

      {/* Copilot Panel */}
      <SidePanel open={copilotOpen} onClose={() => setCopilotOpen(false)} title="CFO Copilot" width={400}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <AIBadge /><LiveDot color="#E8783B" /><span style={{ fontSize: '11px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Powered by Tijori Intelligence</span>
        </div>
        <div style={{ height: 360, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
          {chat.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{ maxWidth: '85%', padding: '10px 14px', borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: m.role === 'user' ? 'linear-gradient(135deg, #E8783B, #FF6B35)' : '#F8F7F5', color: m.role === 'user' ? 'white' : '#0F172A', fontSize: '13px', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.55 }}>
                {m.text}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input value={copilotMsg} onChange={e => setCopilotMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMsg()} placeholder="Ask about your finances…"
            style={{ flex: 1, padding: '10px 14px', border: '1.5px solid #E2E8F0', borderRadius: '10px', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', outline: 'none', background: '#FAFAF8' }} />
          <Btn variant="primary" onClick={sendMsg} small>Send</Btn>
        </div>
        <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {['Cash flow this month', 'Anomaly summary', 'Top vendors by spend'].map(s => (
            <button key={s} onClick={() => { setCopilotMsg(s); }} style={{ padding: '5px 10px', background: '#F8F7F5', border: '1px solid #E2E8F0', borderRadius: '999px', fontSize: '11px', color: '#475569', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 500 }}>{s}</button>
          ))}
        </div>
      </SidePanel>
    </div>
  );
};

Object.assign(window, { DashboardScreen });
