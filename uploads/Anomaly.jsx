// Tijori AI — Anomaly Detection (AI Fraud Engine)

const ANOMALIES = [
  { id: 'ANO-001', score: 94, entity: 'INV-2024-082', type: 'Duplicate Invoice', details: 'Exact amount match with INV-2024-071. Same vendor, 8-day gap. Structural signature detected.', logic: 'Hash-matched line items, identical amounts ₹3,40,000, flagged by deduplication model v2.4', status: 'OPEN', date: 'Apr 19, 09:14' },
  { id: 'ANO-002', score: 87, entity: 'INV-2024-088', type: 'Inflated Line Item', details: 'Unit price for "Server Rack Units" is 3.2× the 90-day vendor average. No PO match found.', logic: 'Price deviation model: Z-score 4.7σ above historical baseline for this vendor-category pair', status: 'OPEN', date: 'Apr 19, 08:52' },
  { id: 'ANO-003', score: 81, entity: 'EXP-2024-441', type: 'Off-shift Submission', details: 'Expense filed at 11:43 PM Saturday by employee with no prior weekend activity.', logic: 'Temporal anomaly model: 0.3% probability based on employee\'s 180-day submission pattern', status: 'UNDER_REVIEW', date: 'Apr 18, 23:43' },
  { id: 'ANO-004', score: 72, entity: 'VND-GlobalSync', type: 'Velocity Spike', details: 'GlobalSync submitted 6 invoices in 3 days — 4× their 60-day rolling average.', logic: 'Vendor velocity model: burst threshold exceeded, cross-referenced against contract terms', status: 'OPEN', date: 'Apr 18, 16:20' },
  { id: 'ANO-005', score: 55, entity: 'INV-2024-085', type: 'Missing GRN Match', details: 'No goods receipt note found for this invoice. 3-way match failed at receiving stage.', logic: 'AP match engine: GRN lookup returned null for PO-2024-031 across all warehouse systems', status: 'OPEN', date: 'Apr 17, 11:30' },
  { id: 'ANO-006', score: 38, entity: 'INV-2024-083', type: 'Round Number Pattern', details: 'Invoice amount ₹5,00,000 exactly. Round numbers appear in 12% of flagged fraud cases.', logic: 'Statistical pattern: exact round-number amounts correlate with manual entry risk', status: 'RESOLVED', date: 'Apr 16, 09:00' },
];

const AnomalyScreen = () => {
  const [activePanel, setActivePanel] = React.useState(null);
  const [scanLoading, setScanLoading] = React.useState(false);
  const [scanned, setScanned] = React.useState(false);

  const runScan = () => {
    setScanLoading(true);
    setTimeout(() => { setScanLoading(false); setScanned(true); }, 2200);
  };

  const scoreColor = (s) => s > 80 ? '#EF4444' : s > 50 ? '#F59E0B' : '#94A3B8';
  const scoreBg = (s) => s > 80 ? '#FEE2E2' : s > 50 ? '#FEF3C7' : '#F8F7F5';

  const open = ANOMALIES.filter(a => a.status === 'OPEN');
  const highConf = ANOMALIES.filter(a => a.score > 80);

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
        { label: 'Total Flagged', value: String(ANOMALIES.length), delta: '↑ 2 today', deltaType: 'negative', color: '#EF4444' },
        { label: 'High Confidence >80%', value: String(highConf.length), delta: 'Requires action', deltaType: 'negative', color: '#EF4444', pulse: true },
        { label: 'Pending Review', value: String(open.length), delta: 'Open cases', deltaType: 'neutral' },
        { label: 'Resolved Today', value: '1', delta: 'Within SLA', deltaType: 'positive', color: '#10B981' },
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
            {ANOMALIES.map(a => {
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
                      {a.status !== 'RESOLVED' && <Btn variant="green" small>Mark Safe</Btn>}
                      {a.score > 80 && <Btn variant="destructive" small>Escalate</Btn>}
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
              <Btn variant="primary" style={{ flex: 1 }} onClick={() => setActivePanel(null)}>Escalate to CFO</Btn>
              <Btn variant="green" style={{ flex: 1 }} onClick={() => setActivePanel(null)}>Mark as Safe</Btn>
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
