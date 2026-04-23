// Tijori AI — Anomaly Detection (AI Fraud Engine)

const AnomalyScreen = ({ onNavigate }) => {
  const [activePanel, setActivePanel] = React.useState(null);
  const [scanLoading, setScanLoading] = React.useState(false);
  const [scanned, setScanned] = React.useState(false);
  const [anomalies, setAnomalies] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  const loadAnomalies = () => {
    const { AnomalyAPI, expenseToAnomaly } = window.TijoriAPI;
    setLoading(true);
    AnomalyAPI.list()
      .then(data => {
        const items = (data || []).map((exp, i) => expenseToAnomaly(exp, i));
        setAnomalies(items);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  React.useEffect(() => { loadAnomalies(); }, []);

  const runScan = async () => {
    setScanLoading(true);
    setScanned(false);
    try {
      await window.TijoriAPI.AnomalyAPI.scanAll();
    } catch (e) {}
    loadAnomalies();
    setTimeout(() => { setScanLoading(false); setScanned(true); }, 800);
  };

  const handleMarkSafe = async (id) => {
    try {
      await window.TijoriAPI.BillsAPI.markSafe(id);
      loadAnomalies();
      if (activePanel && activePanel.rawId === id) setActivePanel(null);
    } catch (e) {
      alert("Failed to mark safe: " + e.message);
    }
  };

  const handleEscalate = async (id) => {
    try {
      await window.TijoriAPI.BillsAPI.escalate(id);
      loadAnomalies();
      if (activePanel && activePanel.rawId === id) setActivePanel(null);
    } catch (e) {
      alert("Failed to escalate: " + e.message);
    }
  };

  const scoreColor = (s) => s > 80 ? '#EF4444' : s > 50 ? '#F59E0B' : '#94A3B8';
  const scoreBg = (s) => s > 80 ? '#FEE2E2' : s > 50 ? '#FEF3C7' : '#F8F7F5';

  const open = anomalies.filter(a => a.status === 'OPEN');
  const highConf = anomalies.filter(a => a.score > 80);

  return (
    <div style={{ padding: '32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '32px', color: '#0F172A', letterSpacing: '-1.5px' }}>AI Fraud & Anomaly Engine</h1>
            <AIBadge />
          </div>
          <div style={{ fontSize: '13px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Continuous monitoring for duplicate invoices, inflated values, and abnormal velocity.
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <LiveDot />
          <Btn variant="primary" icon={scanLoading ? <span style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} /> : <span>⬡</span>} onClick={runScan} disabled={scanLoading}>
            {scanLoading ? 'Scanning…' : scanned ? 'Scan Complete ✓' : 'Run Full Scan'}
          </Btn>
        </div>
      </div>

      {/* Alert banner */}
      <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '14px', padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '14px' }}>
        <span style={{ fontSize: '18px' }}>⚠</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '13px', color: '#991B1B', marginBottom: '2px' }}>High Probability Flags Detected</div>
          <div style={{ fontSize: '12px', color: '#B91C1C', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>3 invoices match known structural signatures of double-billing logic. 1 expense matches off-shift pattern.</div>
        </div>
        <Btn variant="destructive" small>Review All</Btn>
      </div>

      {/* Stats */}
      <StatsRow cards={[
        { label: 'Total Flagged', value: loading ? '…' : String(anomalies.length), delta: 'from database', deltaType: 'negative', color: '#EF4444' },
        { label: 'High Confidence >80%', value: loading ? '…' : String(highConf.length), delta: 'Requires action', deltaType: 'negative', color: '#EF4444', pulse: highConf.length > 0 },
        { label: 'Pending Review', value: loading ? '…' : String(open.length), delta: 'Open cases', deltaType: 'neutral' },
        { label: 'Resolved', value: loading ? '…' : String(anomalies.filter(a => a.status === 'RESOLVED').length), delta: 'Historical', deltaType: 'positive', color: '#10B981' },
      ]} />

      {/* Table */}
      <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8F7F5' }}>
              {['Confidence', 'Entity Ref', 'Anomaly Type', 'AI Logic', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '10px', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ padding: '32px', textAlign: 'center', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px' }}>Loading anomalies…</td></tr>
            ) : anomalies.length === 0 ? (
              <tr><td colSpan="6" style={{ padding: '32px', textAlign: 'center', color: '#10B981', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px' }}>No anomalies detected. System is clean.</td></tr>
            ) : null}
            {anomalies.map(a => {
              const hi = a.score > 80;
              return (
                <tr key={a.id} style={{ borderTop: '1px solid #F1F0EE', background: hi ? 'rgba(239,68,68,0.025)' : 'white', height: 60, transition: 'background 150ms', borderLeft: hi ? `3px solid ${scoreColor(a.score)}` : '3px solid transparent', animation: hi ? 'borderPulse 2s ease infinite' : 'none' }}
                  onMouseEnter={e => e.currentTarget.style.background = hi ? 'rgba(239,68,68,0.05)' : '#FFF8F5'}
                  onMouseLeave={e => e.currentTarget.style.background = hi ? 'rgba(239,68,68,0.025)' : 'white'}>
                  <td style={{ padding: '0 16px' }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: scoreBg(a.score), display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                      <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '14px', color: scoreColor(a.score), letterSpacing: '-0.5px' }}>{a.score}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '0 16px' }}>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#E8783B', fontWeight: 500 }}>{a.entity}</div>
                    <div style={{ fontSize: '10px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif", marginTop: '2px' }}>{a.date}</div>
                  </td>
                  <td style={{ padding: '0 16px' }}>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '2px' }}>{a.type}</div>
                    <div style={{ fontSize: '11px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif", maxWidth: 220, lineHeight: 1.4 }}>{a.details}</div>
                  </td>
                  <td style={{ padding: '0 16px', maxWidth: 220 }}>
                    <div style={{ background: '#F5F3FF', borderRadius: '8px', padding: '8px 10px', display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                      <AIBadge small />
                      <span style={{ fontSize: '11px', color: '#5B21B6', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.4 }}>{a.logic}</span>
                    </div>
                  </td>
                  <td style={{ padding: '0 16px' }}>
                    <StatusBadge status={a.status === 'OPEN' ? 'ANOMALY' : a.status === 'UNDER_REVIEW' ? 'PROCESSING' : 'APPROVED'} />
                  </td>
                  <td style={{ padding: '0 16px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <Btn variant="primary" small onClick={() => setActivePanel(a)}>Investigate</Btn>
                      {a.status !== 'RESOLVED' && <Btn variant="green" small onClick={() => handleMarkSafe(a.rawId)}>Mark Safe</Btn>}
                      {a.score > 80 && <Btn variant="destructive" small onClick={() => handleEscalate(a.rawId)}>Escalate</Btn>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Investigate Panel */}
      <SidePanel open={!!activePanel} onClose={() => setActivePanel(null)} title={activePanel ? `Anomaly: ${activePanel.entity}` : ''} width={460}>
        {activePanel && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: scoreBg(activePanel.score), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '18px', color: scoreColor(activePanel.score) }}>{activePanel.score}%</span>
              </div>
              <div>
                <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '16px', color: '#0F172A' }}>{activePanel.type}</div>
                <div style={{ fontSize: '12px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{activePanel.date}</div>
              </div>
            </div>

            <div style={{ background: '#F8F7F5', borderRadius: '12px', padding: '14px 16px', marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '8px' }}>Detection Details</div>
              <div style={{ fontSize: '13px', color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.6 }}>{activePanel.details}</div>
            </div>

            <div style={{ background: '#F5F3FF', borderRadius: '12px', padding: '14px 16px', marginBottom: '20px', border: '1px solid #EDE9FE' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <AIBadge />
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#5B21B6', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>AI Reasoning</span>
              </div>
              <div style={{ fontSize: '13px', color: '#4C1D95', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.6 }}>{activePanel.logic}</div>
            </div>

            {/* Signal breakdown */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '12px' }}>Confidence Signal Breakdown</div>
              {[
                { label: 'Pattern Match', val: 92 },
                { label: 'Historical Baseline', val: activePanel.score - 4 },
                { label: 'Vendor Risk Score', val: activePanel.score - 12 },
                { label: 'Temporal Factor', val: activePanel.score - 20 },
              ].map(s => (
                <div key={s.label} style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', color: '#475569', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{s.label}</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: scoreColor(s.val), fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{s.val}%</span>
                  </div>
                  <div style={{ height: 6, background: '#F1F5F9', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${s.val}%`, background: `linear-gradient(90deg, ${scoreColor(s.val)}, ${scoreColor(s.val)}88)`, borderRadius: 3, transition: 'width 600ms ease' }} />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <Btn variant="primary" style={{ flex: 1 }} onClick={() => handleEscalate(activePanel.rawId)}>Escalate to CFO</Btn>
              <Btn variant="green" style={{ flex: 1 }} onClick={() => handleMarkSafe(activePanel.rawId)}>Mark as Safe</Btn>
            </div>
            <button style={{ width: '100%', marginTop: '10px', padding: '10px', background: '#F5F3FF', border: '1px solid #EDE9FE', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', color: '#5B21B6', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              ✦ Explain this anomaly in Copilot
            </button>
          </>
        )}
      </SidePanel>
    </div>
  );
};

Object.assign(window, { AnomalyScreen });
