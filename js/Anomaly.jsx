// Tijori AI — Anomaly Detection (AI Fraud Engine)

const AnomalyScreen = ({ role, onNavigate }) => {
  const [activePanel, setActivePanel] = React.useState(null);
  const [reviewQueue, setReviewQueue]     = React.useState([]);   // queue for "Review All"
  const [reviewQueueIdx, setReviewQueueIdx] = React.useState(0);  // current position
  const [scanLoading, setScanLoading] = React.useState(false);
  const [scanned, setScanned] = React.useState(false);
  const [anomalies, setAnomalies] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [escalateMsg, setEscalateMsg] = React.useState('');
  const [resolvedCount, setResolvedCount] = React.useState(0);
  const [resolvedItems, setResolvedItems] = React.useState([]);
  const [anomalyFilter, setAnomalyFilter] = React.useState('All');
  const [markSafeModal, setMarkSafeModal] = React.useState(null);
  const [markSafeNote, setMarkSafeNote] = React.useState('');
  const [markSafeLoading, setMarkSafeLoading] = React.useState(false);
  const [vendorHistory, setVendorHistory] = React.useState([]);
  const [vendorHistoryLoading, setVendorHistoryLoading] = React.useState(false);
  const [feedbackTarget, setFeedbackTarget] = React.useState(null);

  React.useEffect(() => {
    if (activePanel && activePanel._raw) {
      const vendorName = activePanel._raw.vendor_name || activePanel._raw.vendor;
      if (vendorName) {
        setVendorHistoryLoading(true);
        window.TijoriAPI.BillsAPI.listExpenses({ search: vendorName, status: 'REJECTED' })
          .then(data => setVendorHistory(data?.results || data || []))
          .catch(() => setVendorHistory([]))
          .finally(() => setVendorHistoryLoading(false));
      } else {
        setVendorHistory([]);
      }
    }
  }, [activePanel]);

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

  const openMarkSafeModal = (anomaly) => {
    setMarkSafeNote('');
    setMarkSafeModal(anomaly);
  };

  const handleMarkSafe = async () => {
    if (!markSafeModal) return;
    const { rawId, entity } = markSafeModal;
    if (!markSafeNote.trim()) { alert('Please enter a reason for marking this anomaly as safe.'); return; }
    setMarkSafeLoading(true);
    try {
      await window.TijoriAPI.BillsAPI.markSafe(rawId, markSafeNote.trim());
      setResolvedCount(c => c + 1);
      const resItem = { ...markSafeModal, status: 'RESOLVED', resolvedNote: markSafeNote.trim() };
      setResolvedItems(prev => [...prev, resItem]);
      setAnomalies(prev => prev.filter(a => a.rawId !== rawId));
      
      setMarkSafeModal(null);
      setEscalateMsg(`✓ Anomaly for ${entity} marked as safe and resolved.`);
      setTimeout(() => setEscalateMsg(''), 4000);

      // If in review queue, advance automatically
      if (reviewQueue.length > 0) {
        // Remove from local queue so it doesn't reappear
        const newQueue = reviewQueue.filter(a => a.rawId !== rawId);
        setReviewQueue(newQueue);
        if (newQueue.length > 0) {
          const nextIdx = Math.min(reviewQueueIdx, newQueue.length - 1);
          setReviewQueueIdx(nextIdx);
          setActivePanel(newQueue[nextIdx]);
        } else {
          setActivePanel(null);
          setReviewQueue([]);
        }
      } else {
        if (activePanel && activePanel.rawId === rawId) setActivePanel(null);
      }
    } catch (e) {
      alert("Failed to mark safe: " + (e.message || 'Server error'));
    } finally {
      setMarkSafeLoading(false);
    }
  };

  const handleEscalate = async (id) => {
    try {
      const res = await window.TijoriAPI.BillsAPI.escalate(id);
      setEscalateMsg(`Anomaly ${res?.ref_no || id} escalated to CFO/Upper Management as CRITICAL.`);
      setTimeout(() => setEscalateMsg(''), 5000);
      
      // Update anomalies list to reflect critical status (or remove if preferred, here we reload)
      loadAnomalies();

      // If in review queue, advance automatically
      if (reviewQueue.length > 0) {
        const newQueue = reviewQueue.filter(a => a.rawId !== id);
        setReviewQueue(newQueue);
        if (newQueue.length > 0) {
          const nextIdx = Math.min(reviewQueueIdx, newQueue.length - 1);
          setReviewQueueIdx(nextIdx);
          setActivePanel(newQueue[nextIdx]);
        } else {
          setActivePanel(null);
          setReviewQueue([]);
        }
      } else {
        if (activePanel && activePanel.rawId === id) setActivePanel(null);
      }
    } catch (e) {
      alert("Failed to escalate: " + e.message);
    }
  };

  const handleReviewAll = () => {
    const openAnomalies = anomalies.filter(a => a.status !== 'RESOLVED');
    if (openAnomalies.length === 0) { alert('No open anomalies to review.'); return; }
    setReviewQueue(openAnomalies);
    setReviewQueueIdx(0);
    setActivePanel(openAnomalies[0]);
  };

  const reviewNext = () => {
    const next = reviewQueueIdx + 1;
    if (next < reviewQueue.length) { setReviewQueueIdx(next); setActivePanel(reviewQueue[next]); }
    else { setReviewQueue([]); setActivePanel(null); }
  };

  const reviewPrev = () => {
    const prev = reviewQueueIdx - 1;
    if (prev >= 0) { setReviewQueueIdx(prev); setActivePanel(reviewQueue[prev]); }
  };

  const exitReviewQueue = () => { setReviewQueue([]); setActivePanel(null); };

  const scoreColor = (s) => s > 80 ? '#EF4444' : s > 50 ? '#F59E0B' : '#94A3B8';
  const scoreBg = (s) => s > 80 ? '#FEE2E2' : s > 50 ? '#FEF3C7' : '#F8F7F5';

  const open = anomalies.filter(a => a.status === 'OPEN');
  const highConf = anomalies.filter(a => a.score > 80);
  const totalResolved = resolvedCount; // tracked locally since backend excludes NONE severity

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

      {/* Escalate success banner */}
      {escalateMsg && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', fontWeight: 600, color: '#991B1B', fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>🔴</span> {escalateMsg}
        </div>
      )}

      {/* Alert banner — dynamic from loaded anomalies */}
      {!loading && anomalies.length > 0 && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '14px', padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ fontSize: '18px' }}>⚠</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '13px', color: '#991B1B', marginBottom: '2px' }}>High Probability Flags Detected</div>
            <div style={{ fontSize: '12px', color: '#B91C1C', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {highConf.length > 0 && `${highConf.length} high-confidence anomaly${highConf.length !== 1 ? 'ies' : 'y'} (>80%) require immediate attention. `}
              {anomalies.length} total flag{anomalies.length !== 1 ? 's' : ''} across {[...new Set(anomalies.map(a => a.type))].length} pattern type{[...new Set(anomalies.map(a => a.type))].length !== 1 ? 's' : ''} detected by AI engine.
            </div>
          </div>
          <Btn variant="destructive" small onClick={handleReviewAll}>Review All ({anomalies.length})</Btn>
        </div>
      )}

      {/* Stats */}
      <StatsRow cards={[
        { label: 'Total Flagged', value: loading ? '…' : String(anomalies.length), delta: 'from database', deltaType: 'negative', color: '#EF4444' },
        { label: 'High Confidence >80%', value: loading ? '…' : String(highConf.length), delta: 'Requires action', deltaType: 'negative', color: '#EF4444', pulse: highConf.length > 0 },
        { label: 'Pending Review', value: loading ? '…' : String(open.length), delta: 'Open cases', deltaType: 'neutral' },
        { label: 'Resolved', value: loading ? '…' : String(totalResolved), delta: 'This session', deltaType: 'positive', color: '#10B981' },
      ]} />

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
        {[
          { label: `All (${anomalies.length + resolvedItems.length})`, val: 'All' },
          { label: `Open (${anomalies.length})`, val: 'Open' },
          { label: `Resolved (${resolvedItems.length})`, val: 'Resolved' },
        ].map(f => (
          <button key={f.val} onClick={() => setAnomalyFilter(f.val)}
            style={{ padding: '6px 14px', borderRadius: '999px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", background: anomalyFilter === f.val ? (f.val === 'Resolved' ? '#10B981' : '#EF4444') : '#F8F7F5', color: anomalyFilter === f.val ? 'white' : '#64748B', transition: 'all 150ms' }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        {anomalyFilter === 'Resolved' ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F0FDF4' }}>
                {['Entity Ref', 'Anomaly Type', 'Details', 'Resolved Reason', 'Status'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '10px', fontWeight: 700, color: '#065F46', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {resolvedItems.length === 0 ? (
                <tr><td colSpan="5" style={{ padding: '32px', textAlign: 'center', color: '#10B981', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px' }}>No anomalies resolved this session.</td></tr>
              ) : null}
              {resolvedItems.map((a, idx) => (
                <tr key={idx} style={{ borderTop: '1px solid #F1F0EE', height: 60, background: 'white' }}>
                  <td style={{ padding: '0 16px' }}>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#10B981', fontWeight: 500 }}>{a.entity}</div>
                    <div style={{ fontSize: '10px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif", marginTop: '2px' }}>{a.date}</div>
                  </td>
                  <td style={{ padding: '0 16px', fontWeight: 700, fontSize: '13px', color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{a.type}</td>
                  <td style={{ padding: '0 16px', fontSize: '12px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif", maxWidth: 200 }}>{a.details}</td>
                  <td style={{ padding: '0 16px', fontSize: '12px', color: '#065F46', fontFamily: "'Plus Jakarta Sans', sans-serif", fontStyle: 'italic', maxWidth: 200 }}>"{a.resolvedNote}"</td>
                  <td style={{ padding: '0 16px' }}>
                    <span style={{ background: '#D1FAE5', color: '#065F46', padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>✓ Resolved</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
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
              <tr><td colSpan="6" style={{ padding: '32px', textAlign: 'center', color: '#10B981', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px' }}>No open anomalies detected. System is clean.</td></tr>
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
                      {a.status !== 'RESOLVED' && <Btn variant="green" small onClick={() => openMarkSafeModal(a)}>Mark Safe</Btn>}
                      {a.score > 80 && <Btn variant="destructive" small onClick={() => handleEscalate(a.rawId)}>Escalate</Btn>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        )}
      </div>

      {/* Mark Safe Modal with note */}
      {markSafeModal && (
        <TjModal open onClose={() => setMarkSafeModal(null)} title="Mark Anomaly as Safe" accentColor="#10B981" width={440}>
          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#10B981' }}>{markSafeModal.entity}</div>
            <div style={{ fontWeight: 700, fontSize: '14px', color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif", marginTop: '4px' }}>{markSafeModal.type}</div>
            <div style={{ fontSize: '12px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif", marginTop: '4px' }}>{markSafeModal.details}</div>
          </div>
          <div style={{ marginBottom: '4px', fontSize: '12px', fontWeight: 600, color: '#374151', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Reason for clearing this anomaly <span style={{ color: '#EF4444' }}>*</span>
          </div>
          <textarea
            value={markSafeNote}
            onChange={e => setMarkSafeNote(e.target.value)}
            placeholder="e.g. Verified with vendor — this is a legitimate duplicate submission due to system error. Reference: email-2026-04-29."
            rows={4}
            style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: '1.5px solid #E2E8F0', borderRadius: '10px', fontSize: '13px', fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#0F172A', background: '#FAFAFA', resize: 'vertical', outline: 'none', marginBottom: '16px' }}
          />
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <Btn variant="secondary" onClick={() => setMarkSafeModal(null)}>Cancel</Btn>
            <Btn variant="green" onClick={handleMarkSafe} disabled={markSafeLoading}>
              {markSafeLoading ? 'Clearing…' : 'Confirm — Mark as Safe'}
            </Btn>
          </div>
        </TjModal>
      )}

      {/* Investigate Panel */}
      <SidePanel open={!!activePanel} onClose={() => { setActivePanel(null); setReviewQueue([]); }} title={activePanel ? `Anomaly: ${activePanel.entity}` : ''} width={460}>
        {activePanel && (
          <>
            {/* Queue nav bar */}
            {reviewQueue.length > 0 && (
              <div style={{ background: '#FEF3C7', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <button onClick={reviewPrev} disabled={reviewQueueIdx === 0}
                  style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #F59E0B', background: reviewQueueIdx === 0 ? '#F8F7F5' : 'white', color: reviewQueueIdx === 0 ? '#CBD5E1' : '#92400E', fontSize: '11px', fontWeight: 700, cursor: reviewQueueIdx === 0 ? 'default' : 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  ← Prev
                </button>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#92400E', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {reviewQueueIdx + 1} of {reviewQueue.length} anomalies
                </span>
                <button onClick={reviewNext}
                  style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #F59E0B', background: 'white', color: '#92400E', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {reviewQueueIdx < reviewQueue.length - 1 ? 'Next →' : 'Done ✓'}
                </button>
              </div>
            )}

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

            {/* Vendor Risk History */}
            <div style={{ marginBottom: '20px', background: '#FFF8F5', borderRadius: '12px', padding: '14px 16px', border: '1px solid #FFEDD5' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#9A3412', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📜</span> Vendor Risk History (Past Rejections)
              </div>
              {vendorHistoryLoading ? (
                <div style={{ fontSize: '12px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Loading history...</div>
              ) : vendorHistory.length === 0 ? (
                <div style={{ fontSize: '12px', color: '#10B981', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>✓ No past rejected invoices for this vendor.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {vendorHistory.slice(0, 3).map((h, i) => (
                    <div key={i} style={{ background: 'white', padding: '10px', borderRadius: '8px', border: '1px solid #FFEDD5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', fontFamily: "'JetBrains Mono', monospace" }}>{h.invoice_number || h.ref_no || h.id.slice(0,8)}</div>
                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px', fontFamily: "'Plus Jakarta Sans', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{h.rejection_reason || 'Rejected by Compliance'}</div>
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#EF4444', fontFamily: "'Bricolage Grotesque', sans-serif" }}>₹{parseFloat(h.total_amount || 0).toLocaleString('en-IN')}</div>
                    </div>
                  ))}
                  {vendorHistory.length > 3 && <div style={{ fontSize: '11px', color: '#E8783B', textAlign: 'center', marginTop: '4px', cursor: 'pointer', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>+ {vendorHistory.length - 3} more rejections</div>}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <Btn variant="primary" style={{ flex: 1 }} onClick={() => handleEscalate(activePanel.rawId)}>Escalate to CFO</Btn>
              <Btn variant="green" style={{ flex: 1 }} onClick={() => openMarkSafeModal(activePanel)}>Mark as Safe</Btn>
            </div>
            <button onClick={() => setFeedbackTarget(activePanel)}
              style={{ width: '100%', marginTop: '10px', padding: '10px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', color: '#15803D', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              ↩ This is a false positive — give feedback
            </button>
            <button onClick={() => {
                setActivePanel(null);
                if (onNavigate) onNavigate('ai-hub');
                setTimeout(() => {
                  window.dispatchEvent(new CustomEvent('copilot:prefill', { detail: { query: `Explain anomaly for ${activePanel.entity}: ${activePanel.type} — ${activePanel.details}` } }));
                }, 300);
              }}
              style={{ width: '100%', marginTop: '10px', padding: '10px', background: '#F5F3FF', border: '1px solid #EDE9FE', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', color: '#5B21B6', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              ✦ Explain this anomaly in Copilot
            </button>
          </>
        )}
      </SidePanel>

      {feedbackTarget && (
        <FeedbackModal
          taskType="ANOMALY"
          expenseId={feedbackTarget.rawId}
          vendorName={feedbackTarget._raw?.vendor_name || ''}
          anomalyFlags={feedbackTarget._raw?.ocr_raw?.anomaly_flags || []}
          onClose={() => setFeedbackTarget(null)}
        />
      )}
    </div>
  );
};

Object.assign(window, { AnomalyScreen });
