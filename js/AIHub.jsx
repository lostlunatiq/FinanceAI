// Tijori AI — AI Intelligence Hub (Screen 18)

const SUGGESTED_QUERIES = {
  'CFO': ['Top 5 vendors by spend this quarter', 'Which department is over budget?', 'Show anomaly summary', 'Cash flow projection for next month'],
  'Finance Admin': ['Audit log for last 24h', 'System health status', 'Pending vendor approvals', 'Anomaly summary'],
  'Finance Manager': ['My department budget status', 'Pending team approvals', 'Variance analysis for this month', 'Top spenders in my team'],
  'Dept Head': ['My department pending approvals', 'Department budget status', 'Anomalies in my department', 'Team expense summary this month'],
  'AP Clerk': ['My pending queue summary', 'Which invoices have anomalies?', 'Average processing time this week', 'Invoices near SLA limit'],
  'Employee': ['Status of my last reimbursement', 'How much travel budget do I have left?', 'My expense summary for this year', 'Help me file a new expense'],
  'Vendor': ['When will my last invoice be paid?', 'Total outstanding payments to me', 'Status of INV-2026-001', 'How to submit a new invoice?'],
};

function mdToJsx(text) {
  if (!text) return null;
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const lines = escaped.split('\n');
  const elements = []; let listItems = []; let listType = null;

  const flushList = () => {
    if (!listItems.length) return;
    const Tag = listType === 'ol' ? 'ol' : 'ul';
    elements.push(
      React.createElement(Tag, { key: elements.length, style: { margin: '4px 0 4px 16px', padding: 0 } },
        listItems.map((li, i) => React.createElement('li', { key: i, style: { margin: '2px 0' }, dangerouslySetInnerHTML: { __html: li } }))
      )
    );
    listItems = []; listType = null;
  };

  const inlineFormat = (s) => s
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code style="background:#f1f0ee;padding:1px 4px;border-radius:3px;font-size:11px">$1</code>');

  lines.forEach((raw, idx) => {
    const ul = raw.match(/^[-•*]\s+(.*)/);
    const ol = raw.match(/^\d+\.\s+(.*)/);
    if (ul) {
      if (listType !== 'ul') { flushList(); listType = 'ul'; }
      listItems.push(inlineFormat(ul[1]));
    } else if (ol) {
      if (listType !== 'ol') { flushList(); listType = 'ol'; }
      listItems.push(inlineFormat(ol[1]));
    } else {
      flushList();
      if (raw === '') {
        elements.push(React.createElement('br', { key: elements.length }));
      } else {
        elements.push(React.createElement('span', { key: elements.length, dangerouslySetInnerHTML: { __html: inlineFormat(raw) + (idx < lines.length - 1 ? '<br>' : '') } }));
      }
    }
  });
  flushList();
  return elements;
}

const CopilotWidget = ({ role, onNavigate }) => {
  const roleKey = role || 'CFO';
  const queries = SUGGESTED_QUERIES[roleKey] || SUGGESTED_QUERIES['Employee'];

  const getGreeting = () => {
    if (roleKey === 'Vendor')    return "Hello! I'm your Vendor Assistant. Ask me about your invoices, payment status, or how to use the portal.";
    if (roleKey === 'Employee')  return "Hi! I'm your Expense Assistant. I can help you track your reimbursements and check your budget.";
    if (roleKey === 'Dept Head') return "Hello! I'm your Department Copilot. Ask me about your department's invoices, budget, or approval queue.";
    return `Hello! I'm your ${getCopilotLabel(roleKey)}. Ask me anything about financial data, vendors, invoices, or anomalies.`;
  };

  const [messages, setMessages] = React.useState([
    { role: 'ai', text: getGreeting(), time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) }
  ]);
  const [input, setInput] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [currentSessionId, setCurrentSessionId] = React.useState(null);
  const [showHistory, setShowHistory] = React.useState(false);
  const [sessions, setSessions] = React.useState([]);
  const [histLoading, setHistLoading] = React.useState(false);
  const [sessionTitle, setSessionTitle] = React.useState('');
  const endRef = React.useRef(null);

  React.useEffect(() => {
    if (endRef.current) endRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  React.useEffect(() => {
    const handler = (e) => { if (e.detail?.query) sendMessage(e.detail.query); };
    window.addEventListener('copilot:prefill', handler);
    return () => window.removeEventListener('copilot:prefill', handler);
  }, []);

  const fmtTime = (iso) => {
    const d = new Date(iso);
    const now = new Date();
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    const t = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    if (d.toDateString() === now.toDateString()) return `Today ${t}`;
    if (d.toDateString() === yesterday.toDateString()) return `Yesterday ${t}`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' + t;
  };

  const groupSessions = (list) => {
    const groups = {};
    const now = new Date(); const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    list.forEach(s => {
      const d = new Date(s.updated_at);
      let label = d.toDateString() === now.toDateString() ? 'Today'
        : d.toDateString() === yesterday.toDateString() ? 'Yesterday'
        : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
      (groups[label] = groups[label] || []).push(s);
    });
    return groups;
  };

  const loadHistory = async () => {
    setHistLoading(true);
    try {
      const list = await window.TijoriAPI.ChatSessionAPI.list();
      setSessions(Array.isArray(list) ? list : []);
    } catch (e) { setSessions([]); }
    finally { setHistLoading(false); }
  };

  const openSession = async (sid, title) => {
    setShowHistory(false);
    setMessages([{ role: 'ai', text: 'Loading conversation…', time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }), loading: true }]);
    try {
      const data = await window.TijoriAPI.ChatSessionAPI.get(sid);
      setCurrentSessionId(sid);
      setSessionTitle(title || 'Past session');
      if (!data.messages || data.messages.length === 0) {
        setMessages([{ role: 'ai', text: 'No messages in this session yet. Continue below.', time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) }]);
      } else {
        const rebuilt = [];
        data.messages.forEach(m => {
          rebuilt.push({ role: 'user', text: m.prompt, time: new Date(m.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) });
          rebuilt.push({ role: 'ai', text: m.response, insight: m.insight, time: new Date(m.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) });
        });
        setMessages(rebuilt);
      }
    } catch (e) {
      setMessages([{ role: 'ai', text: '⚠ Could not load session.', time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }), error: true }]);
    }
  };

  const startNewChat = () => {
    setCurrentSessionId(null);
    setSessionTitle('');
    setShowHistory(false);
    setMessages([{ role: 'ai', text: getGreeting(), time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) }]);
  };

  const deleteSession = async (sid, e) => {
    e.stopPropagation();
    if (!confirm('Delete this chat?')) return;
    await window.TijoriAPI.ChatSessionAPI.del(sid);
    if (currentSessionId === sid) startNewChat();
    setSessions(prev => prev.filter(s => s.id !== sid));
  };

  const sendMessage = async (text) => {
    const q = text || input.trim();
    if (!q) return;
    setInput('');
    const time = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { role: 'user', text: q, time }]);
    setLoading(true);
    try {
      const res = await window.TijoriAPI.NLQueryAPI.ask(q, currentSessionId);
      if (res.session_id && !currentSessionId) {
        setCurrentSessionId(res.session_id);
        setSessionTitle(q.slice(0, 40) + (q.length > 40 ? '…' : ''));
      }
      const answer = res.answer || res.error || 'No response.';
      const insight = res.insight || '';
      const actions = res.actions || [];
      setMessages(prev => [...prev, {
        role: 'ai', text: answer, insight, actions, model: res.model,
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', text: 'Sorry, I encountered an error. Please try again.', time, error: true }]);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (a) => {
    if (a.type === 'nav_to') {
      if (typeof onNavigate === 'function') onNavigate(a.payload.screen);
    } else if (a.type === 'remind') {
      window.TijoriAPI.BillsAPI.remind(a.payload.ref_no)
        .then(() => alert(`Reminder sent for ${a.payload.ref_no}`))
        .catch(e => alert(e.message));
    } else if (a.type === 'export_report') {
      const csv = `"Report Data"\n"${a.payload.report_type || 'Custom Report'}"\n"${new Date().toISOString()}"`;
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = `ai_report_${new Date().toISOString().slice(0,10)}.csv`;
      link.click(); URL.revokeObjectURL(url);
    } else {
      if (a.payload?.ref_no && typeof onNavigate === 'function') onNavigate('ap-hub');
    }
  };

  const grouped = groupSessions(sessions);

  return (
    <Card style={{ padding: '0', overflow: 'hidden', marginTop: '24px' }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #F1F0EE', display: 'flex', alignItems: 'center', gap: '10px' }}>
        {showHistory ? (
          <button onClick={() => setShowHistory(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E8783B', fontSize: '18px', lineHeight: 1, padding: '0 4px' }}>←</button>
        ) : null}
        <AIBadge />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '17px', color: '#0F172A' }}>
            {showHistory ? 'Chat History' : getCopilotLabel(roleKey)}
          </div>
          {!showHistory && sessionTitle && (
            <div style={{ fontSize: '11px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif", overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{sessionTitle}</div>
          )}
        </div>
        <LiveDot />
        <button onClick={startNewChat}
          title="New Chat"
          style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: '8px', padding: '5px 10px', fontSize: '11px', color: '#E8783B', fontWeight: 700, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'flex', alignItems: 'center', gap: '4px' }}>
          ✏ New
        </button>
        {!showHistory && (
          <button onClick={() => { setShowHistory(true); loadHistory(); }}
            title="Chat History"
            style={{ background: '#F5F3FF', border: '1px solid #EDE9FE', borderRadius: '8px', padding: '5px 10px', fontSize: '11px', color: '#5B21B6', fontWeight: 700, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'flex', alignItems: 'center', gap: '4px' }}>
            📋 History
          </button>
        )}
      </div>

      {/* ── History Panel ── */}
      {showHistory ? (
        <div style={{ height: 400, overflowY: 'auto', background: '#FAFAF8' }}>
          {histLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8', fontSize: '13px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Loading history…</div>
          ) : sessions.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>💬</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '6px' }}>No past chats yet</div>
              <div style={{ fontSize: '12px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Start a conversation and it will appear here.</div>
            </div>
          ) : (
            Object.entries(grouped).map(([label, items]) => (
              <div key={label}>
                <div style={{ padding: '10px 20px 4px', fontSize: '10px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{label}</div>
                {items.map(s => (
                  <div key={s.id} onClick={() => openSession(s.id, s.title)}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 20px', cursor: 'pointer', background: s.id === currentSessionId ? '#FFF3E6' : 'transparent', borderLeft: s.id === currentSessionId ? '3px solid #E8783B' : '3px solid transparent', transition: 'background 150ms' }}
                    onMouseEnter={e => { if (s.id !== currentSessionId) e.currentTarget.style.background = '#F8F7F5'; }}
                    onMouseLeave={e => { if (s.id !== currentSessionId) e.currentTarget.style.background = 'transparent'; }}>
                    <div style={{ width: 32, height: 32, borderRadius: '8px', background: s.id === currentSessionId ? '#E8783B' : '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '14px' }}>
                      {s.id === currentSessionId ? '✦' : '💬'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif", overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{s.title || 'Untitled Chat'}</div>
                      <div style={{ fontSize: '11px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif", marginTop: '2px' }}>{fmtTime(s.updated_at)}</div>
                    </div>
                    <button onClick={(e) => deleteSession(s.id, e)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#CBD5E1', fontSize: '14px', padding: '4px', borderRadius: '4px', flexShrink: 0 }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.background = '#FEF2F2'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = '#CBD5E1'; e.currentTarget.style.background = 'none'; }}
                      title="Delete">🗑</button>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      ) : (
        <>
          {/* Suggested queries */}
          <div style={{ padding: '12px 20px', borderBottom: '1px solid #F8F7F5', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {queries.map(q => (
              <button key={q} onClick={() => sendMessage(q)} disabled={loading}
                style={{ background: '#F5F3FF', border: '1px solid #EDE9FE', borderRadius: '999px', padding: '5px 12px', fontSize: '11px', color: '#5B21B6', fontWeight: 600, cursor: loading ? 'default' : 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", transition: 'all 150ms', opacity: loading ? 0.5 : 1 }}>
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
                    wordBreak: 'break-word'
                  }}>{m.role === 'ai' ? mdToJsx(m.text) : m.text}</div>
                  {m.actions && m.actions.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                      {m.actions.map((a, idx) => (
                        <button key={idx} onClick={() => handleAction(a)}
                          style={{ background: 'white', border: '1px solid #E8783B', borderRadius: '8px', padding: '6px 12px', fontSize: '11px', color: '#E8783B', fontWeight: 700, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", boxShadow: '0 2px 4px rgba(232,120,59,0.1)', transition: 'all 150ms' }}>
                          {a.label}
                        </button>
                      ))}
                    </div>
                  )}
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
        </>
      )}
    </Card>
  );
};

const AIHubScreen = ({ role, onNavigate }) => {
  const [scenario, setScenario] = React.useState('Base');
  const [summaryOpen, setSummaryOpen] = React.useState(false);
  const [selectedMonth, setSelectedMonth] = React.useState(null);
  const [runningAll, setRunningAll] = React.useState(false);
  const [cfData, setCfData] = React.useState(null);
  const [rerunLoading, setRerunLoading] = React.useState(false);
  const [rerunMsg, setRerunMsg] = React.useState(null);
  const [monthlySummaries, setMonthlySummaries] = React.useState(null);
  const [payNowLoading, setPayNowLoading] = React.useState(null);
  const [payNowMsg, setPayNowMsg] = React.useState(null);
  const [payModal, setPayModal] = React.useState(null); // { rec } — Pay Now modal
  const [schedModal, setSchedModal] = React.useState(null); // { rec } — Schedule modal
  const [payForm, setPayForm] = React.useState({ method: 'NEFT', utr: '', notes: '' });
  const [schedForm, setSchedForm] = React.useState({ date: '', note: '' });
  const [payProcessing, setPayProcessing] = React.useState(false);
  const [schedProcessing, setSchedProcessing] = React.useState(false);
  const [autoGenEnabled, setAutoGenEnabled] = React.useState(true);
  const [summaryLoading, setSummaryLoading] = React.useState(false);
  const [histUploadOpen, setHistUploadOpen] = React.useState(false);
  const [histFile, setHistFile] = React.useState(null);
  const [histUploading, setHistUploading] = React.useState(false);
  const [histMsg, setHistMsg] = React.useState(null);

  const loadMonthlySummaries = async ({ regenerate = false, openLatest = false } = {}) => {
    try {
      const q = regenerate ? '?regenerate=1&with_ai=1' : '';
      const r = await fetch('/api/v1/invoices/analytics/monthly-summary/' + q, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + (window.TijoriAPI.Auth.getAccess() || ''),
        },
      });
      const d = await r.json();
      const rawSummaries = Array.isArray(d?.summaries) ? d.summaries : Array.isArray(d) ? d : [];

      // Skip placeholder entries (not yet generated)
      const validSummaries = rawSummaries.filter(s => s.is_generated || s.from_cache);
      // Transform backend data to match SummaryMonthCard expectations
      const summaries = validSummaries.map(s => {
        const paid = Number(s.paid_amount || 0);
        const pending = Number(s.pending_amount || s.totals?.total_pending || 0);
        const approved = Number(s.approved_amount || 0);
        const expenses = pending + approved;
        const profit = paid - expenses;
        const fmt = v => v >= 10000000 ? '₹' + (v / 10000000).toFixed(1) + 'Cr'
                       : v >= 100000 ? '₹' + (v / 100000).toFixed(1) + 'L'
                       : '₹' + Math.round(v).toLocaleString('en-IN');
        return {
          month: s.month || '',
          status: s.is_generated ? 'AUTO_GEN' : 'REVIEWED',
          revenue: fmt(paid),
          expenses: fmt(expenses),
          profit: profit < 0 ? '-' + fmt(Math.abs(profit)) : fmt(profit),
          cash: fmt(paid),
          insight: s.ai_narrative || `${s.total_invoices || 0} invoices processed. ${s.mom_change_pct != null ? (s.mom_change_pct >= 0 ? '+' : '') + s.mom_change_pct + '% MoM.' : ''}`,
        };
      });
      setMonthlySummaries(summaries);
      if (openLatest && summaries.length > 0) {
        setSelectedMonth(summaries[0]);
        setSummaryOpen(true);
      }
      return summaries;
    } catch (e) {
      console.error('Error loading summaries:', e);
      setMonthlySummaries([]);
      return [];
    }
  };

  React.useEffect(() => {
    window.TijoriAPI.BudgetAPI.cashflow()
      .then(d => setCfData(d))
      .catch(() => {});
    loadMonthlySummaries({ regenerate: false, openLatest: false });
  }, []);

  const handleRerun = async () => {
    setRerunLoading(true); setRerunMsg(null);
    try {
      await runAll();
      setRerunMsg({ type: 'success', text: 'Forecast and models refreshed with latest data.' });
    } catch(e) {
      setRerunMsg({ type: 'error', text: 'Rerun failed: ' + (e.message || 'Server error') });
    } finally {
      setRerunLoading(false);
      setTimeout(() => setRerunMsg(null), 4000);
    }
  };

  const runAll = async () => {
    setRunningAll(true);
    try {
      const { AnalyticsAPI, BudgetAPI } = window.TijoriAPI;
      // Run all analytics models in parallel
      await Promise.allSettled([
        AnalyticsAPI.spendIntelligence().then(d => {
          if (d && d.monthly_trends && d.monthly_trends.length > 0) {
            const trend = d.monthly_trends;
            const built = trend.slice(-3).reverse().map((m, i) => ({
              month: m.month_label || m.month || `Month ${i + 1}`,
              status: i === 0 ? 'REVIEWED' : 'AUTO_GEN',
              revenue: '₹' + Number(m.revenue || 0).toLocaleString('en-IN'),
              expenses: '₹' + Number(m.total || m.expenses || 0).toLocaleString('en-IN'),
              profit: (() => { const p = (m.revenue || 0) - (m.total || m.expenses || 0); return (p < 0 ? '-₹' : '₹') + Math.abs(p).toLocaleString('en-IN'); })(),
              cash: m.cash_position ? '₹' + Number(m.cash_position).toLocaleString('en-IN') : '—',
              insight: m.insight || (i === 0 ? 'Latest month — live data from system.' : 'Auto-generated from expense buckets.'),
            }));
            if (built.length > 0) setMonthlySummaries(built);
          }
        }),
        AnalyticsAPI.workingCapital(),
        AnalyticsAPI.vendorRisk(),
        BudgetAPI.cashflow().then(d => setCfData(d)),
      ]);
    } catch (e) {}
    setRunningAll(false);
  };

  // ── Cash Flow Chart — built from real API data (cfData.daily_forecast) ────
  const W = 760, H = 260;
  const chartPad = { l: 72, r: 30, t: 24, b: 36 };

  // Format rupee values with smart unit selection
  // For values in L range, show as ₹XXL (not ₹X.XCr) for better differentiation
  const fmtCompactINR = (v) => {
    const n = Number(v || 0);
    const abs = Math.abs(n);
    if (abs >= 500 * 100000) return `₹${(n / 10000000).toFixed(1)}Cr`;  // ≥500L → Cr
    if (abs >= 100000)       return `₹${(n / 100000).toFixed(1)}L`;      // ≥1L → L
    if (abs >= 1000)         return `₹${(n / 1000).toFixed(1)}K`;
    return `₹${Math.round(n).toLocaleString('en-IN')}`;
  };

  // Smart Y-axis label: auto-pick precision to show visible differences
  const fmtYAxis = (valLakhs) => {
    // valLakhs is already in Lakhs (from chart data), convert to rupees for fmtCompactINR
    const rupees = valLakhs * 100000;
    const abs = Math.abs(rupees);
    if (abs >= 500 * 100000) {
      // Show 2 decimal Cr for tight Cr range
      return `₹${(rupees / 10000000).toFixed(2)}Cr`;
    }
    return fmtCompactINR(rupees);
  };

  // Build monthly chart points from daily_forecast — uses net_cashflow for visible variation
  // Returns arrays of { label, inflow, outflow, net, balance, isFuture }
  const _buildMonthlyPoints = (dailyForecast) => {
    if (!dailyForecast || dailyForecast.length === 0) return [];
    const today = new Date(); today.setHours(0,0,0,0);
    const monthMap = {};
    const monthOrder = [];
    dailyForecast.forEach(d => {
      const dt = new Date(d.date);
      const key = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`;
      if (!monthMap[key]) {
        monthMap[key] = {
          label: dt.toLocaleString('en-IN', { month: 'short' }),
          shortLabel: dt.toLocaleString('en-IN', { month: 'short' }) + " '" + String(dt.getFullYear()).slice(2),
          inflows: [], outflows: [], nets: [], balances: [],
          isFuture: dt >= today,
        };
        monthOrder.push(key);
      }
      monthMap[key].inflows.push(d.projected_inflow / 100000);
      monthMap[key].outflows.push(d.projected_outflow / 100000);
      monthMap[key].nets.push(d.net_cashflow / 100000);
      monthMap[key].balances.push(d.running_balance / 100000);
    });
    return monthOrder.map(key => {
      const m = monthMap[key];
      const sum = arr => arr.reduce((a,b) => a+b, 0);
      const last = arr => arr[arr.length-1] || 0;
      return {
        label: m.label,
        shortLabel: m.shortLabel,
        inflow: sum(m.inflows),
        outflow: sum(m.outflows),
        net: sum(m.nets),
        balance: last(m.balances),
        isFuture: m.isFuture,
      };
    });
  };

  const cfMonths = _buildMonthlyPoints(cfData?.daily_forecast);
  const pastMonths = cfMonths.filter(m => !m.isFuture);
  const forecastMonths = cfMonths.filter(m => m.isFuture);

  // Build 3 scenario lines based on net cashflow variation
  // Base = actual API data; Optimistic = +25% inflow; Pessimistic = -20% inflow / +10% outflow
  const baseNet   = forecastMonths.map(m => m.net);
  const optNet    = forecastMonths.map(m => m.inflow * 1.25 - m.outflow);
  const pessNet   = forecastMonths.map(m => m.inflow * 0.80 - m.outflow * 1.10);
  const baseInflow  = forecastMonths.map(m => m.inflow);
  const baseOutflow = forecastMonths.map(m => m.outflow);
  const pastInflow  = pastMonths.map(m => m.inflow);
  const pastOutflow = pastMonths.map(m => m.outflow);
  const pastNet     = pastMonths.map(m => m.net);

  // All data for x-axis (months)
  const allMonths = cfMonths.length > 0 ? cfMonths : [];
  const totalPoints = Math.max(allMonths.length, 2);
  const forecastStartIdx = pastMonths.length > 0 ? pastMonths.length - 1 : 0;

  // Collect all values to determine Y range
  const allNetVals = [
    ...pastNet,
    ...baseNet,
    ...optNet,
    ...pessNet,
  ];
  const allInflowVals = [...pastInflow, ...baseInflow];
  const allOutflowVals = [...pastOutflow, ...baseOutflow];

  // Show mode: 'net' shows net cashflow lines, 'inout' shows inflow/outflow bars
  // We'll show all three scenario net lines simultaneously
  const chartVals = allNetVals.length > 0 ? allNetVals : allInflowVals;
  const rawMin = chartVals.length ? Math.min(...chartVals) : -50;
  const rawMax = chartVals.length ? Math.max(...chartVals) : 50;
  const spread = Math.max(rawMax - rawMin, Math.abs(rawMax) * 0.2 + Math.abs(rawMin) * 0.2, 5);
  const minV = rawMin - spread * 0.15;
  const maxV = rawMax + spread * 0.20;

  const toX = (i) => chartPad.l + (Math.max(0, i) / (totalPoints - 1)) * (W - chartPad.l - chartPad.r);
  const toY = (v) => H - chartPad.b - ((v - minV) / (maxV - minV || 1)) * (H - chartPad.t - chartPad.b);
  const zeroY = toY(0);

  const lp = (pts) => pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  // Build SVG point arrays for each line
  const mkPts = (vals, startIdx) => vals.map((v, i) => ({ x: toX(startIdx + i), y: toY(v), val: v }));

  const pastNetPts    = mkPts(pastNet, 0);
  const baseNetPts    = mkPts(baseNet, forecastStartIdx);
  const optNetPts     = mkPts(optNet, forecastStartIdx);
  const pessNetPts    = mkPts(pessNet, forecastStartIdx);

  // Connect past→forecast at the seam
  const baseFullPts   = pastNetPts.length > 0 ? [...pastNetPts.slice(-1), ...baseNetPts] : baseNetPts;
  const optFullPts    = pastNetPts.length > 0 ? [...pastNetPts.slice(-1), ...optNetPts] : optNetPts;
  const pessFullPts   = pastNetPts.length > 0 ? [...pastNetPts.slice(-1), ...pessNetPts] : pessNetPts;

  // Hover tooltip state
  const [cfHover, setCfHover] = React.useState(null);
  const [chartHov, setChartHov] = React.useState(null);

  // Pin events from real risk_highlights
  const pinEvents = (cfData?.risk_highlights || []).slice(0, 3).map((rh, i) => {
    const pinIdx = Math.min(forecastStartIdx + i + 1, allMonths.length - 1);
    const pinVal = allMonths[pinIdx]?.net || 0;
    const colors = ['#E8783B', '#10B981', '#EF4444'];
    const icons = ['⚠', '↑', '↓'];
    return {
      x: toX(pinIdx),
      y: toY(pinVal) - 18,
      label: rh.message ? rh.message.slice(0, 30) : rh.severity,
      color: colors[i] || '#E8783B',
      icon: icons[i] || '⚠',
    };
  });

  // ── Summary months — real data only, empty state if none ─────────────────
  const summaryMonths = (monthlySummaries && monthlySummaries.length > 0) ? monthlySummaries : [];

  // ── Optimisation recommendations ─────────────────────────────────────────
  const [payRecs, setPayRecs] = React.useState([]);

  React.useEffect(() => {
    // Load approved vendor bills for payment optimization
    window.TijoriAPI.BillsAPI.listVendorBills({ status: 'APPROVED', limit: 30 })
      .then(d => {
        const bills = Array.isArray(d) ? d : (d?.results || []);
        if (bills.length === 0) {
          // Fallback: fetch all bills and filter client-side
          return window.TijoriAPI.BillsAPI.listVendorBills({ limit: 50 })
            .then(d2 => {
              const all = Array.isArray(d2) ? d2 : (d2?.results || []);
              return all.filter(b => !['PAID', 'REJECTED', 'WITHDRAWN', 'AUTO_REJECT'].includes(b.status || ''));
            });
        }
        return bills;
      })
      .then(bills => {
        if (bills.length > 0) {
          const now = Date.now();
          const mapped = bills
            .filter(b => !['PAID', 'REJECTED', 'WITHDRAWN', 'AUTO_REJECT'].includes(b.status || ''))
            .slice(0, 10)
            .map((b, i) => {
              const amt = Number(b.total_amount || 0);
              // No due_date field — use invoice_date + 30 days (net-30 standard) or fallback
              const invoiceDt = b.invoice_date ? new Date(b.invoice_date) : new Date(now - 86400000 * 15);
              const due = new Date(invoiceDt.getTime() + 86400000 * 30);
              const daysUntilDue = Math.floor((due.getTime() - now) / 86400000);
              const isEarly = daysUntilDue > 5;
              const suggested = new Date(due.getTime() - 86400000 * (isEarly ? 5 : 1));
              const type = isEarly ? 'discount' : daysUntilDue < 0 ? 'lateFee' : 'batch';
              const tip = type === 'discount'
                ? `Pay ${daysUntilDue}d early — save ₹${Math.round(amt * 0.015).toLocaleString('en-IN')} (1.5% discount)`
                : type === 'lateFee'
                ? `OVERDUE by ${Math.abs(daysUntilDue)}d — avoid ₹${Math.round(amt * 0.02).toLocaleString('en-IN')} penalty`
                : `Pay by ${due.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })} to stay on time`;
              return {
                vendor: b.vendor_name || b.vendor?.name || 'Unknown Vendor',
                invoices: b.ref_no || `INV-${String(b.id).slice(0,6).toUpperCase()}`,
                amount: '₹' + amt.toLocaleString('en-IN'),
                due: due.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
                suggested: suggested.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
                suggestedDate: suggested.toISOString().slice(0,10),
                type,
                tip,
                rawId: b.id,
                rawAmount: amt,
                daysUntilDue,
              };
            });
          setPayRecs(mapped);
        }
      })
      .catch(() => {});
  }, []);

  const tipColor = { discount: { bg: '#D1FAE5', color: '#065F46' }, lateFee: { bg: '#FEF3C7', color: '#92400E' }, batch: { bg: '#FFF7ED', color: '#C2410C' }, shortfall: { bg: '#FEE2E2', color: '#991B1B' } };

  const summaryStatusStyle = { REVIEWED: { bg: '#D1FAE5', color: '#065F46', label: 'Reviewed' }, AUTO_GEN: { bg: '#EDE9FE', color: '#5B21B6', label: 'Auto-Generated' }, DRAFT: { bg: '#FEF3C7', color: '#92400E', label: 'Draft' } };

  // --- EXTRACTED COMPONENT FOR MONTHLY SUMMARY CARD ---
  const SummaryMonthCard = ({ s, i, setSelectedMonth, setSummaryOpen }) => {
    const [hov, setHov] = React.useState(false);
    const ss = summaryStatusStyle[s.status];

    // Safety check: If status mapping fails, use a safe default state
    const safeStatus = ss || { bg: '#F1F0EE', color: '#64748B', label: 'Unknown' };

    return (
        <div key={i}
          onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
          style={{ background: 'white', border: `2px solid ${hov ? '#E8783B' : '#F1F0EE'}`, borderRadius: '12px', padding: '14px', cursor: 'pointer', transition: 'all 200ms', transform: hov ? 'translateY(-2px)' : 'none', boxShadow: hov ? '0 8px 24px rgba(0,0,0,0.10)' : '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '15px', color: '#0F172A', letterSpacing: '-0.5px' }}>{s.month}</div>
            <span style={{ background: safeStatus.bg, color: safeStatus.color, padding: '2px 6px', borderRadius: '999px', fontSize: '9px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", whiteSpace: 'nowrap' }}>
              {s.status === 'AUTO_GEN' && <AIBadge small />} {safeStatus.label}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
            {[['Revenue', s.revenue, '#10B981'], ['Expenses', s.expenses, '#E8783B'], ['Net Profit', s.profit, (s.profit || '').startsWith('-') ? '#EF4444' : '#10B981'], ['Cash', s.cash, '#E8783B']].map(([l, v, c]) => (
              <div key={l}>
                <div style={{ fontSize: '9px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{l}</div>
                <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '14px', color: c, letterSpacing: '-0.5px' }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: '11px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.4, marginBottom: '10px', borderTop: '1px solid #F8F7F5', paddingTop: '8px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            <AIBadge small /> {s.insight}
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <Btn variant="primary" small onClick={() => { setSelectedMonth(s); setSummaryOpen(true); }}>View Full →</Btn>
            <Btn variant="secondary" small onClick={() => {
              const w = window.open('', '_blank');
              w.document.write(`<!DOCTYPE html><html><head><title>${s.month} Summary</title><style>body{font-family:sans-serif;padding:32px;}</style></head><body><h1>Tijori AI — ${s.month}</h1><p>Revenue: ${s.revenue} | Expenses: ${s.expenses} | Profit: ${s.profit}</p><p>${s.insight}</p><script>window.print()<\/script></body></html>`);
              w.document.close();
            }}>PDF</Btn>
          </div>
        </div>
    );
  };
  // --- END EXTRACTED COMPONENT ---

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
          <div style={{ fontSize: '13px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {(role === 'CFO' || role === 'Finance Admin') ? 'Predictive forecasting, automated summaries, and vendor payment optimisation.' : 'Ask your department copilot anything about budgets, approvals, or expenses.'}
          </div>
        </div>
        {(role === 'CFO' || role === 'Finance Admin') && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <LiveDot />
            <Btn variant="primary" icon={runningAll ? <span style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} /> : <span>✦</span>} onClick={runAll}>
              {runningAll ? 'Running Models…' : 'Run All Models'}
            </Btn>
          </div>
        )}
      </div>

      {/* Panels 1-3 only for CFO and Finance Admin */}
      {(role === 'CFO' || role === 'Finance Admin') && (<>

      {/* ── Panel 1 — Cash Flow Forecasting ── */}
      <Card style={{ padding: '28px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '20px', color: '#0F172A', letterSpacing: '-0.5px', marginBottom: '2px' }}>Cash Flow Forecasting</div>
            <div style={{ fontSize: '12px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>90-day rolling · Net cash flow · 3 scenarios simultaneously</div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Btn variant="secondary" small onClick={handleRerun} disabled={rerunLoading}>
              {rerunLoading ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, border: '2px solid #CBD5E1', borderTopColor: '#E8783B', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />Running…</span> : 'Rerun'}
            </Btn>
          </div>
        </div>
        {rerunMsg && (
          <div style={{ marginBottom: 12, padding: '8px 14px', borderRadius: 8, background: rerunMsg.type === 'success' ? '#D1FAE5' : '#FEE2E2', border: `1px solid ${rerunMsg.type === 'success' ? '#6EE7B7' : '#FCA5A5'}`, fontSize: 12, fontWeight: 600, color: rerunMsg.type === 'success' ? '#065F46' : '#991B1B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {rerunMsg.type === 'success' ? '✓ ' : '✕ '}{rerunMsg.text}
          </div>
        )}

        {/* Chart */}
        <div style={{ position: 'relative' }}>
          {allMonths.length < 2 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: `${H}px`, background: '#F8F7F5', borderRadius: '12px', border: '1px dashed #E2E8F0', fontSize: '13px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif", gap: '8px' }}>
              <span>📈</span> Click <b style={{ color: '#E8783B' }}>Run All Models</b> to load real cash flow data
            </div>
          )}
          {allMonths.length >= 2 && (() => {
            const baseline = Math.min(zeroY, H - chartPad.b);
            // Area fill under past net line (above zero)
            const pastAreaAbove = pastNetPts.length > 1
              ? `M ${pastNetPts[0].x} ${Math.min(baseline, zeroY)} ${pastNetPts.map(p => `L ${p.x} ${Math.min(p.y, zeroY)}`).join(' ')} L ${pastNetPts[pastNetPts.length-1].x} ${Math.min(baseline, zeroY)} Z`
              : null;
            // Area between opt and pess (scenario spread band)
            const bandTopPts  = optFullPts;
            const bandBotPts  = [...pessFullPts].reverse();
            const scenarioBandPath = bandTopPts.length > 1
              ? `M ${bandTopPts[0].x} ${bandTopPts[0].y} ${bandTopPts.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')} ${bandBotPts.map(p => `L ${p.x} ${p.y}`).join(' ')} Z`
              : '';
            return (
              <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}
                onMouseLeave={() => setCfHover(null)}
              >
                <defs>
                  <linearGradient id="pastNetGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#E8783B" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#E8783B" stopOpacity="0.02" />
                  </linearGradient>
                  <linearGradient id="scenarioBandGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.10" />
                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.02" />
                  </linearGradient>
                  <filter id="glow2">
                    <feGaussianBlur stdDeviation="2.5" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                  <clipPath id="chartClip">
                    <rect x={chartPad.l} y={chartPad.t} width={W - chartPad.l - chartPad.r} height={H - chartPad.t - chartPad.b} />
                  </clipPath>
                </defs>

                {/* Chart area background */}
                <rect x={chartPad.l} y={chartPad.t} width={W - chartPad.l - chartPad.r} height={H - chartPad.t - chartPad.b} fill="#FAFAF9" rx="6" />

                {/* Grid lines + Y labels */}
                {[0, 0.25, 0.5, 0.75, 1].map((t, gi) => {
                  const y = chartPad.t + t * (H - chartPad.t - chartPad.b);
                  const valL = maxV - t * (maxV - minV);
                  return (
                    <g key={gi}>
                      <line x1={chartPad.l} y1={y} x2={W - chartPad.r} y2={y}
                        stroke={gi === 0 ? '#E2E8F0' : '#EBEBEB'} strokeWidth={gi === 0 ? 1 : 0.75}
                        strokeDasharray={gi === 0 ? 'none' : '3,4'} />
                      <text x={chartPad.l - 6} y={y + 4} fontSize="9.5" fill="#94A3B8" textAnchor="end"
                        fontFamily="Plus Jakarta Sans">{fmtYAxis(valL)}</text>
                    </g>
                  );
                })}

                {/* Zero line — shows breakeven */}
                {zeroY >= chartPad.t && zeroY <= H - chartPad.b && (
                  <line x1={chartPad.l} y1={zeroY} x2={W - chartPad.r} y2={zeroY}
                    stroke="#94A3B8" strokeWidth="1" strokeDasharray="4,3" opacity="0.6" />
                )}

                {/* X labels */}
                {allMonths.map((d, i) => (
                  <text key={i} x={toX(i)} y={H - 6} fontSize="10"
                    fill={i >= pastMonths.length ? '#94A3B8' : '#475569'}
                    textAnchor="middle" fontFamily="Plus Jakarta Sans"
                    fontWeight={i === pastMonths.length - 1 ? '700' : '400'}>{d.label}</text>
                ))}

                {/* Scenario spread band (between optimistic and pessimistic) */}
                {scenarioBandPath && (
                  <path d={scenarioBandPath} fill="url(#scenarioBandGrad)"
                    clipPath="url(#chartClip)" />
                )}

                {/* Past area fill */}
                {pastAreaAbove && (
                  <path d={pastAreaAbove} fill="url(#pastNetGrad)" clipPath="url(#chartClip)" />
                )}

                {/* Divider: past / forecast */}
                {pastMonths.length > 0 && forecastMonths.length > 0 && (
                  <>
                    <line x1={toX(pastMonths.length - 1)} y1={chartPad.t} x2={toX(pastMonths.length - 1)} y2={H - chartPad.b}
                      stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="4,3" />
                    <rect x={toX(pastMonths.length - 1) + 3} y={chartPad.t + 2} width={68} height={14} rx="3" fill="#F1F5F9" />
                    <text x={toX(pastMonths.length - 1) + 8} y={chartPad.t + 12} fontSize="8.5" fill="#64748B"
                      fontFamily="Plus Jakarta Sans" fontWeight="600">Forecast →</text>
                  </>
                )}

                {/* Pessimistic line (red dashed) */}
                {pessFullPts.length > 1 && (
                  <path d={lp(pessFullPts)} fill="none" stroke="#EF4444" strokeWidth="1.5"
                    strokeDasharray="5,4" strokeLinecap="round" strokeLinejoin="round" opacity="0.7"
                    clipPath="url(#chartClip)" />
                )}

                {/* Optimistic line (green dashed) */}
                {optFullPts.length > 1 && (
                  <path d={lp(optFullPts)} fill="none" stroke="#10B981" strokeWidth="1.5"
                    strokeDasharray="5,4" strokeLinecap="round" strokeLinejoin="round" opacity="0.7"
                    clipPath="url(#chartClip)" />
                )}

                {/* Base forecast line (blue solid) */}
                {baseFullPts.length > 1 && (
                  <path d={lp(baseFullPts)} fill="none" stroke="#3B82F6" strokeWidth="2.5"
                    strokeDasharray="7,4" strokeLinecap="round" strokeLinejoin="round"
                    clipPath="url(#chartClip)" />
                )}

                {/* Past actual net line (orange solid) */}
                {pastNetPts.length > 0 && (
                  <path d={lp(pastNetPts)} fill="none" stroke="#E8783B" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round" filter="url(#glow2)"
                    clipPath="url(#chartClip)" />
                )}

                {/* Past dots with hover zones */}
                {pastNetPts.map((p, i) => {
                  const m = pastMonths[i];
                  const isHov = cfHover?.type === 'past' && cfHover?.i === i;
                  return (
                    <g key={`pp${i}`}
                      onMouseEnter={() => setCfHover({ type: 'past', i, x: p.x, y: p.y, val: p.val, label: m.label, inflow: m.inflow, outflow: m.outflow, net: m.net })}
                      style={{ cursor: 'crosshair' }}>
                      <circle cx={p.x} cy={p.y} r="10" fill="transparent" />
                      <circle cx={p.x} cy={p.y} r={isHov ? 6 : 4} fill="white" stroke="#E8783B" strokeWidth="2.5" />
                    </g>
                  );
                })}

                {/* Forecast dots (base) with hover zones */}
                {baseNetPts.map((p, i) => {
                  const m = forecastMonths[i];
                  if (!m) return null;
                  const isHov = cfHover?.type === 'fc' && cfHover?.i === i;
                  return (
                    <g key={`fp${i}`}
                      onMouseEnter={() => setCfHover({ type: 'fc', i, x: p.x, y: p.y, val: p.val, label: m.label, inflow: m.inflow, outflow: m.outflow, net: m.net, opt: optNet[i], pess: pessNet[i] })}
                      style={{ cursor: 'crosshair' }}>
                      <circle cx={p.x} cy={p.y} r="10" fill="transparent" />
                      <circle cx={p.x} cy={p.y} r={isHov ? 5 : 3} fill="#EFF6FF" stroke="#3B82F6" strokeWidth="2" />
                    </g>
                  );
                })}

                {/* Hover tooltip */}
                {cfHover && (() => {
                  const tx = Math.min(cfHover.x + 10, W - 155);
                  const ty = Math.max(cfHover.y - 80, chartPad.t + 4);
                  const isFc = cfHover.type === 'fc';
                  const netDir = cfHover.net >= 0 ? '↑' : '↓';
                  const netCol = cfHover.net >= 0 ? '#10B981' : '#EF4444';
                  return (
                    <g>
                      <rect x={tx} y={ty} width={148} height={isFc ? 90 : 72} rx="6"
                        fill="white" stroke="#E2E8F0" strokeWidth="1"
                        style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.12))' }} />
                      <text x={tx+8} y={ty+14} fontSize="10" fontWeight="700" fill="#0F172A" fontFamily="Plus Jakarta Sans">{cfHover.label} {isFc ? '(Forecast)' : '(Actual)'}</text>
                      <text x={tx+8} y={ty+28} fontSize="9" fill="#64748B" fontFamily="Plus Jakarta Sans">Inflow: <tspan fill="#10B981" fontWeight="600">{fmtYAxis(cfHover.inflow)}</tspan></text>
                      <text x={tx+8} y={ty+42} fontSize="9" fill="#64748B" fontFamily="Plus Jakarta Sans">Outflow: <tspan fill="#EF4444" fontWeight="600">{fmtYAxis(cfHover.outflow)}</tspan></text>
                      <text x={tx+8} y={ty+56} fontSize="9" fill="#64748B" fontFamily="Plus Jakarta Sans">Net: <tspan fill={netCol} fontWeight="700">{netDir} {fmtYAxis(Math.abs(cfHover.net))}</tspan></text>
                      {isFc && <text x={tx+8} y={ty+70} fontSize="8.5" fill="#94A3B8" fontFamily="Plus Jakarta Sans">Opt {fmtYAxis(cfHover.opt ?? 0)} · Pess {fmtYAxis(cfHover.pess ?? 0)}</text>}
                      {isFc && <text x={tx+8} y={ty+83} fontSize="8" fill="#94A3B8" fontFamily="Plus Jakarta Sans">Predictive · AI model</text>}
                    </g>
                  );
                })()}

                {/* Event pins */}
                {pinEvents.map((pin, i) => (
                  <g key={i}>
                    <circle cx={pin.x} cy={pin.y + 20} r="7" fill={pin.color} opacity="0.9" />
                    <text x={pin.x} y={pin.y + 25} textAnchor="middle" fontSize="8" fill="white" fontWeight="700">{pin.icon}</text>
                  </g>
                ))}
              </svg>
            );
          })()}

          {/* Legend */}
          <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '11px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif", flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: 14, height: 3, background: '#E8783B', display: 'inline-block', borderRadius: 2 }} />Actual Net Cash Flow
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: 14, height: 2, background: '#3B82F6', display: 'inline-block', borderRadius: 2, borderTop: '1px dashed #3B82F6' }} />Base Forecast
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: 14, height: 2, background: '#10B981', display: 'inline-block', borderRadius: 2 }} />Optimistic (+25% inflow)
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: 14, height: 2, background: '#EF4444', display: 'inline-block', borderRadius: 2 }} />Pessimistic (−20% inflow)
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: 14, height: 10, background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)', display: 'inline-block', borderRadius: 2 }} />Scenario Spread
            </span>
          </div>
          <div style={{ marginTop: '4px', fontSize: '10px', color: '#B0B8C4', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Y-axis = Monthly net cash flow (inflow − outflow) in ₹L · Hover dots for detail
          </div>
        </div>

        {/* Insight cards — derived from same cfMonths data as chart, so values match */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginTop: '20px' }}>
          {(() => {
            if (!cfData || cfMonths.length === 0) return [
              { label: 'Surplus Peak', value: '—', date: 'Run models to load', color: '#10B981', bg: '#F0FDF4', border: '#BBF7D0', icon: '↑' },
              { label: 'Shortfall Risk', value: '—', date: 'Run models to load', color: '#EF4444', bg: '#FEF2F2', border: '#FECACA', icon: '⚠' },
              { label: 'Action Needed', value: '—', date: 'Run models to load', color: '#E8783B', bg: '#FFF7ED', border: '#FED7AA', icon: '✦' },
            ];
            // Use net cashflow from cfMonths (same data as chart) for consistency
            const netMax = cfMonths.reduce((best, m) => m.net > best.net ? m : best, cfMonths[0]);
            const netMin = cfMonths.reduce((best, m) => m.net < best.net ? m : best, cfMonths[0]);
            return [
              { label: 'Surplus Peak (Net)', value: fmtYAxis(netMax.net), date: netMax.label + (netMax.isFuture ? ' (forecast)' : ' (actual)'), color: '#10B981', bg: '#F0FDF4', border: '#BBF7D0', icon: '↑' },
              { label: 'Shortfall Risk (Net)', value: fmtYAxis(netMin.net), date: netMin.label + (netMin.isFuture ? ' (forecast)' : ' (actual)'), color: '#EF4444', bg: '#FEF2F2', border: '#FECACA', icon: '⚠' },
              { label: 'Action Needed', value: cfData.risk_highlights?.[0]?.message?.slice(0, 28) || 'Monitor Cash Position', date: cfData.risk_highlights?.[0]?.date ? new Date(cfData.risk_highlights[0].date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Ongoing', color: '#E8783B', bg: '#FFF7ED', border: '#FED7AA', icon: '✦' },
            ];
          })().map((c, i) => (
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

        {/* ── Historical Data Upload ── */}
        <div style={{ marginTop: '20px', borderTop: '1px solid #F1F0EE', paddingTop: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: histUploadOpen ? '14px' : '0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>📊 Upload Historical Data</span>
              <span style={{ fontSize: '11px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Excel or CSV · improves forecast accuracy</span>
            </div>
            <button onClick={() => setHistUploadOpen(o => !o)}
              style={{ padding: '5px 14px', borderRadius: '8px', border: '1.5px solid #E2E8F0', background: histUploadOpen ? '#F1F5F9' : 'white', color: '#64748B', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {histUploadOpen ? '✕ Close' : '+ Upload'}
            </button>
          </div>
          {histUploadOpen && (
            <div style={{ background: '#F8FAFC', borderRadius: '10px', border: '1.5px dashed #CBD5E1', padding: '18px' }}>
              <div style={{ fontSize: '12px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '12px' }}>
                Upload past cash flow / invoice data. Columns expected: <code style={{ background: '#E2E8F0', padding: '1px 5px', borderRadius: '4px', fontSize: '11px' }}>date, amount, type (inflow/outflow), description</code>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: 'white', border: '1.5px solid #E2E8F0', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  📎 {histFile ? histFile.name : 'Choose File (.xlsx / .csv)'}
                  <input type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={e => { setHistFile(e.target.files[0]); setHistMsg(null); }} />
                </label>
                <button
                  disabled={!histFile || histUploading}
                  onClick={async () => {
                    if (!histFile) return;
                    setHistUploading(true); setHistMsg(null);
                    try {
                      const fd = new FormData();
                      fd.append('file', histFile);
                      const token = localStorage.getItem('tj_access');
                      const res = await fetch('/api/v1/invoices/finance/upload-historical/', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
                      const d = await res.json();
                      if (res.ok) {
                        setHistMsg({ ok: true, text: `✓ ${d.rows_imported || 'Data'} rows imported. Re-run models to refresh forecast.` });
                        setHistFile(null);
                      } else {
                        setHistMsg({ ok: false, text: d.error || 'Upload failed.' });
                      }
                    } catch(e) {
                      setHistMsg({ ok: false, text: 'Upload failed. Check file format.' });
                    } finally { setHistUploading(false); }
                  }}
                  style={{ padding: '10px 20px', background: histUploading ? '#94A3B8' : '#E8783B', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: histFile && !histUploading ? 'pointer' : 'not-allowed', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {histUploading ? 'Uploading…' : 'Upload & Process'}
                </button>
              </div>
              {histMsg && (
                <div style={{ marginTop: '10px', padding: '8px 14px', background: histMsg.ok ? '#F0FDF4' : '#FEF2F2', border: `1px solid ${histMsg.ok ? '#BBF7D0' : '#FECACA'}`, borderRadius: '8px', fontSize: '12px', fontWeight: 600, color: histMsg.ok ? '#166534' : '#991B1B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {histMsg.text}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* ── Panel 1b — 4-Chart Analytics Grid ── */}
      {cfData && cfMonths.length >= 2 && (() => {
        // ── Chart 2: Cash on Hand (running_balance monthly) ──
        const balanceMonths = cfMonths;
        const balVals = balanceMonths.map(m => m.balance);
        const balMin = Math.min(...balVals) * 0.95;
        const balMax = Math.max(...balVals) * 1.05;
        const BW = 340, BH = 160, BP = { l: 56, r: 12, t: 16, b: 28 };
        const bX = (i) => BP.l + (i / (balanceMonths.length - 1)) * (BW - BP.l - BP.r);
        const bY = (v) => BH - BP.b - ((v - balMin) / (balMax - balMin || 1)) * (BH - BP.t - BP.b);
        const bPts = balanceMonths.map((m, i) => ({ x: bX(i), y: bY(m.balance), m }));
        const bPath = bPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
        const bAreaPath = `M ${bPts[0].x} ${BH - BP.b} ${bPts.map(p => `L ${p.x} ${p.y}`).join(' ')} L ${bPts[bPts.length-1].x} ${BH - BP.b} Z`;

        // ── Chart 3: Monthly Inflow vs Outflow bars ──
        const IW = 340, IH = 160, IP = { l: 56, r: 12, t: 16, b: 28 };
        const allIvals = [...cfMonths.map(m => m.inflow), ...cfMonths.map(m => m.outflow)];
        const iMax = Math.max(...allIvals) * 1.1 || 1;
        const iX = (i, offset = 0) => IP.l + (i / cfMonths.length) * (IW - IP.l - IP.r) + offset;
        const barW = Math.max(4, ((IW - IP.l - IP.r) / cfMonths.length) * 0.38);
        const iY = (v) => IH - IP.b - (v / iMax) * (IH - IP.t - IP.b);
        const iBase = IH - IP.b;

        // ── Chart 4: Net Cash Movement bars ──
        const NW = 340, NH = 160, NP = { l: 56, r: 12, t: 16, b: 28 };
        const netVals = cfMonths.map(m => m.net);
        const nAbsMax = Math.max(...netVals.map(Math.abs)) * 1.15 || 1;
        const nZero = NH - NP.b - (0 / (nAbsMax * 2)) * (NH - NP.t - NP.b);
        const nMid = NP.t + (NH - NP.t - NP.b) / 2;
        const nX = (i) => NP.l + (i / cfMonths.length) * (NW - NP.l - NP.r);
        const nBarW = Math.max(4, ((NW - NP.l - NP.r) / cfMonths.length) * 0.7);
        const nY = (v) => nMid - (v / nAbsMax) * ((NH - NP.t - NP.b) / 2);

        // ── Chart 5: Expense Breakdown donut ──
        const breakdown = cfData.expense_breakdown || [];
        const brkTotal = breakdown.reduce((s, b) => s + b.amount, 0) || 1;
        const donutColors = ['#E8783B','#3B82F6','#10B981','#8B5CF6','#F59E0B','#EF4444','#06B6D4'];
        let brkAngle = -Math.PI / 2;
        const donutSlices = breakdown.slice(0, 7).map((b, i) => {
          const frac = b.amount / brkTotal;
          const startA = brkAngle;
          brkAngle += frac * 2 * Math.PI;
          const endA = brkAngle;
          const R = 58, r = 32, cx = 85, cy = 80;
          const x1 = cx + R * Math.cos(startA), y1 = cy + R * Math.sin(startA);
          const x2 = cx + R * Math.cos(endA),   y2 = cy + R * Math.sin(endA);
          const ix1 = cx + r * Math.cos(endA),   iy1 = cy + r * Math.sin(endA);
          const ix2 = cx + r * Math.cos(startA), iy2 = cy + r * Math.sin(startA);
          const large = frac > 0.5 ? 1 : 0;
          return { path: `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${r} ${r} 0 ${large} 0 ${ix2} ${iy2} Z`, color: donutColors[i], label: b.category, frac, amount: b.amount };
        });

        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>

            {/* Chart A: Cash on Hand */}
            <div style={{ background: 'white', border: '1px solid #F1F0EE', borderRadius: '14px', padding: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '2px' }}>Cash on Hand</div>
              <div style={{ fontSize: '11px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '10px' }}>Running balance · 90-day window</div>
              <svg width="100%" viewBox={`0 0 ${BW} ${BH}`} style={{ overflow: 'visible' }} onMouseLeave={() => setChartHov(null)}>
                <defs>
                  <linearGradient id="cohGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                <rect x={BP.l} y={BP.t} width={BW - BP.l - BP.r} height={BH - BP.t - BP.b} fill="#FAFAF9" rx="4" />
                {[0, 0.5, 1].map((t, i) => {
                  const y = BP.t + t * (BH - BP.t - BP.b);
                  const v = balMax - t * (balMax - balMin);
                  return <g key={i}>
                    <line x1={BP.l} y1={y} x2={BW - BP.r} y2={y} stroke="#EBEBEB" strokeWidth="0.75" strokeDasharray="3,4" />
                    <text x={BP.l - 4} y={y + 3} fontSize="8.5" fill="#94A3B8" textAnchor="end" fontFamily="Plus Jakarta Sans">{fmtYAxis(v)}</text>
                  </g>;
                })}
                {balanceMonths.map((m, i) => i % 2 === 0 && <text key={i} x={bX(i)} y={BH - 4} fontSize="8" fill="#94A3B8" textAnchor="middle" fontFamily="Plus Jakarta Sans">{m.label}</text>)}
                <path d={bAreaPath} fill="url(#cohGrad)" />
                <path d={bPath} fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                {bPts.map((p, i) => (
                  <g key={i} onMouseEnter={() => setChartHov({ type: 'coh', i, x: p.x, y: p.y, val: p.m.balance, label: p.m.label, isFuture: p.m.isFuture })} style={{ cursor: 'crosshair' }}>
                    <circle cx={p.x} cy={p.y} r="8" fill="transparent" />
                    {(chartHov?.type === 'coh' && chartHov?.i === i) && <circle cx={p.x} cy={p.y} r="4" fill="white" stroke="#3B82F6" strokeWidth="2" />}
                  </g>
                ))}
                {chartHov?.type === 'coh' && (() => {
                  const tx = Math.min(chartHov.x + 6, BW - 100);
                  const ty = Math.max(chartHov.y - 40, BP.t);
                  return <g>
                    <rect x={tx} y={ty} width={98} height={30} rx="5" fill="white" stroke="#E2E8F0" strokeWidth="1" style={{ filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.10))' }} />
                    <text x={tx+6} y={ty+11} fontSize="9" fontWeight="700" fill="#0F172A" fontFamily="Plus Jakarta Sans">{chartHov.label} {chartHov.isFuture ? '↗' : ''}</text>
                    <text x={tx+6} y={ty+23} fontSize="9" fill="#3B82F6" fontWeight="600" fontFamily="Plus Jakarta Sans">{fmtYAxis(chartHov.val)}</text>
                  </g>;
                })()}
              </svg>
            </div>

            {/* Chart B: Monthly Inflow vs Outflow */}
            <div style={{ background: 'white', border: '1px solid #F1F0EE', borderRadius: '14px', padding: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '2px' }}>Inflow vs Outflow</div>
              <div style={{ fontSize: '11px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '10px' }}>Monthly comparison · ₹L</div>
              <svg width="100%" viewBox={`0 0 ${IW} ${IH}`} style={{ overflow: 'visible' }} onMouseLeave={() => setChartHov(null)}>
                <rect x={IP.l} y={IP.t} width={IW - IP.l - IP.r} height={IH - IP.t - IP.b} fill="#FAFAF9" rx="4" />
                {[0, 0.5, 1].map((t, i) => {
                  const y = IP.t + t * (IH - IP.t - IP.b);
                  const v = iMax * (1 - t);
                  return <g key={i}>
                    <line x1={IP.l} y1={y} x2={IW - IP.r} y2={y} stroke="#EBEBEB" strokeWidth="0.75" strokeDasharray="3,4" />
                    <text x={IP.l - 4} y={y + 3} fontSize="8.5" fill="#94A3B8" textAnchor="end" fontFamily="Plus Jakarta Sans">{fmtYAxis(v)}</text>
                  </g>;
                })}
                {cfMonths.map((m, i) => {
                  const cx = iX(i) + (IW - IP.l - IP.r) / cfMonths.length / 2;
                  const inH = Math.max(1, (m.inflow / iMax) * (IH - IP.t - IP.b));
                  const outH = Math.max(1, (m.outflow / iMax) * (IH - IP.t - IP.b));
                  const isHov = chartHov?.type === 'io' && chartHov?.i === i;
                  return <g key={i} onMouseEnter={() => setChartHov({ type: 'io', i, x: cx, y: iY(m.inflow), label: m.label, inflow: m.inflow, outflow: m.outflow })} style={{ cursor: 'crosshair' }}>
                    {i % 2 === 0 && <text x={cx} y={IH - 4} fontSize="8" fill="#94A3B8" textAnchor="middle" fontFamily="Plus Jakarta Sans">{m.label}</text>}
                    <rect x={cx - barW - 1} y={iBase - inH} width={barW} height={inH} fill={isHov ? '#22C55E' : '#10B981'} rx="2" opacity="0.85" />
                    <rect x={cx + 1} y={iBase - outH} width={barW} height={outH} fill={isHov ? '#F87171' : '#EF4444'} rx="2" opacity="0.75" />
                  </g>;
                })}
                {chartHov?.type === 'io' && (() => {
                  const tx = Math.min(chartHov.x - 50, IW - 108);
                  const ty = Math.max(chartHov.y - 50, IP.t);
                  return <g>
                    <rect x={tx} y={ty} width={106} height={42} rx="5" fill="white" stroke="#E2E8F0" strokeWidth="1" style={{ filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.10))' }} />
                    <text x={tx+6} y={ty+12} fontSize="9" fontWeight="700" fill="#0F172A" fontFamily="Plus Jakarta Sans">{chartHov.label}</text>
                    <text x={tx+6} y={ty+25} fontSize="8.5" fill="#64748B" fontFamily="Plus Jakarta Sans">In: <tspan fill="#10B981" fontWeight="600">{fmtYAxis(chartHov.inflow)}</tspan></text>
                    <text x={tx+6} y={ty+37} fontSize="8.5" fill="#64748B" fontFamily="Plus Jakarta Sans">Out: <tspan fill="#EF4444" fontWeight="600">{fmtYAxis(chartHov.outflow)}</tspan></text>
                  </g>;
                })()}
              </svg>
              <div style={{ display: 'flex', gap: '12px', marginTop: '4px', fontSize: '10px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: 10, height: 10, background: '#10B981', borderRadius: '2px', display: 'inline-block' }} />Inflow</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: 10, height: 10, background: '#EF4444', borderRadius: '2px', display: 'inline-block' }} />Outflow</span>
              </div>
            </div>

            {/* Chart C: Net Cash Movement */}
            <div style={{ background: 'white', border: '1px solid #F1F0EE', borderRadius: '14px', padding: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '2px' }}>Net Cash Movement</div>
              <div style={{ fontSize: '11px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '10px' }}>Monthly surplus / deficit · ₹L</div>
              <svg width="100%" viewBox={`0 0 ${NW} ${NH}`} style={{ overflow: 'visible' }} onMouseLeave={() => setChartHov(null)}>
                <rect x={NP.l} y={NP.t} width={NW - NP.l - NP.r} height={NH - NP.t - NP.b} fill="#FAFAF9" rx="4" />
                {[-1, 0, 1].map((t, i) => {
                  const y = nMid - t * ((NH - NP.t - NP.b) / 2);
                  const v = t * nAbsMax;
                  return <g key={i}>
                    <line x1={NP.l} y1={y} x2={NW - NP.r} y2={y} stroke={t === 0 ? '#CBD5E1' : '#EBEBEB'} strokeWidth={t === 0 ? 1 : 0.75} strokeDasharray={t === 0 ? 'none' : '3,4'} />
                    <text x={NP.l - 4} y={y + 3} fontSize="8.5" fill="#94A3B8" textAnchor="end" fontFamily="Plus Jakarta Sans">{fmtYAxis(v)}</text>
                  </g>;
                })}
                {cfMonths.map((m, i) => {
                  const cx = nX(i) + (NW - NP.l - NP.r) / cfMonths.length / 2;
                  const barH = Math.max(2, Math.abs(m.net) / nAbsMax * ((NH - NP.t - NP.b) / 2));
                  const positive = m.net >= 0;
                  const isHov = chartHov?.type === 'net' && chartHov?.i === i;
                  return <g key={i} onMouseEnter={() => setChartHov({ type: 'net', i, x: cx, y: positive ? nMid - barH : nMid, label: m.label, net: m.net, isFuture: m.isFuture })} style={{ cursor: 'crosshair' }}>
                    {i % 2 === 0 && <text x={cx} y={NH - 4} fontSize="8" fill="#94A3B8" textAnchor="middle" fontFamily="Plus Jakarta Sans">{m.label}</text>}
                    <rect x={cx - nBarW / 2} y={positive ? nMid - barH : nMid} width={nBarW} height={barH}
                      fill={positive ? (isHov ? '#22C55E' : '#10B981') : (isHov ? '#F87171' : '#EF4444')} rx="2" opacity={m.isFuture ? 0.65 : 0.9} />
                  </g>;
                })}
                {chartHov?.type === 'net' && (() => {
                  const tx = Math.min(chartHov.x - 45, NW - 100);
                  const ty = Math.max(chartHov.y - 36, NP.t);
                  const pos = chartHov.net >= 0;
                  return <g>
                    <rect x={tx} y={ty} width={98} height={30} rx="5" fill="white" stroke="#E2E8F0" strokeWidth="1" style={{ filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.10))' }} />
                    <text x={tx+6} y={ty+12} fontSize="9" fontWeight="700" fill="#0F172A" fontFamily="Plus Jakarta Sans">{chartHov.label} {chartHov.isFuture ? '(fcst)' : ''}</text>
                    <text x={tx+6} y={ty+24} fontSize="9" fill={pos ? '#10B981' : '#EF4444'} fontWeight="700" fontFamily="Plus Jakarta Sans">{pos ? '↑ Surplus ' : '↓ Deficit '}{fmtYAxis(Math.abs(chartHov.net))}</text>
                  </g>;
                })()}
              </svg>
              <div style={{ display: 'flex', gap: '12px', marginTop: '4px', fontSize: '10px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: 10, height: 10, background: '#10B981', borderRadius: '2px', display: 'inline-block' }} />Surplus</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: 10, height: 10, background: '#EF4444', borderRadius: '2px', display: 'inline-block' }} />Deficit</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: 12, height: 10, background: 'repeating-linear-gradient(45deg, #CBD5E1 0 2px, transparent 2px 5px)', borderRadius: '2px', display: 'inline-block' }} />Forecast</span>
              </div>
            </div>

            {/* Chart D: Expense Breakdown Donut */}
            <div style={{ background: 'white', border: '1px solid #F1F0EE', borderRadius: '14px', padding: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '2px' }}>Expense Breakdown</div>
              <div style={{ fontSize: '11px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '10px' }}>By category · outflow distribution</div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <svg width="170" height="160" viewBox="0 0 170 160">
                  {donutSlices.map((s, i) => (
                    <path key={i} d={s.path} fill={s.color} opacity="0.88"
                      onMouseEnter={() => setChartHov({ type: 'donut', i, label: s.label, frac: s.frac, amount: s.amount })}
                      onMouseLeave={() => setChartHov(null)}
                      style={{ cursor: 'pointer', transform: chartHov?.type === 'donut' && chartHov?.i === i ? 'scale(1.05)' : 'scale(1)', transformOrigin: '85px 80px', transition: 'transform 150ms' }} />
                  ))}
                  {chartHov?.type === 'donut' ? <>
                    <text x="85" y="75" textAnchor="middle" fontSize="10" fontWeight="700" fill="#0F172A" fontFamily="Plus Jakarta Sans">{(chartHov.frac * 100).toFixed(1)}%</text>
                    <text x="85" y="90" textAnchor="middle" fontSize="8" fill="#64748B" fontFamily="Plus Jakarta Sans">{chartHov.label.slice(0, 14)}</text>
                  </> : <>
                    <text x="85" y="75" textAnchor="middle" fontSize="10" fontWeight="700" fill="#0F172A" fontFamily="Plus Jakarta Sans">{fmtCompactINR(brkTotal)}</text>
                    <text x="85" y="89" textAnchor="middle" fontSize="8" fill="#94A3B8" fontFamily="Plus Jakarta Sans">Total Out</text>
                  </>}
                </svg>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {donutSlices.map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10.5px', fontFamily: "'Plus Jakarta Sans', sans-serif", cursor: 'pointer' }}
                      onMouseEnter={() => setChartHov({ type: 'donut', i, label: s.label, frac: s.frac, amount: s.amount })}
                      onMouseLeave={() => setChartHov(null)}>
                      <span style={{ width: 8, height: 8, borderRadius: '2px', background: s.color, flexShrink: 0, display: 'inline-block' }} />
                      <span style={{ flex: 1, color: '#334155', fontWeight: chartHov?.type === 'donut' && chartHov?.i === i ? 700 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</span>
                      <span style={{ color: '#94A3B8', fontWeight: 600, fontSize: '10px' }}>{(s.frac * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        );
      })()}

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
                { label: 'Opening Balance', val: fmtCompactINR(cfData.opening_balance || 0) },
                { label: 'Projected Closing', val: fmtCompactINR(cfData.projected_closing_balance || 0) },
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
          </div>
          <Btn variant="secondary" small icon={summaryLoading ? <span style={{ width: 10, height: 10, border: '2px solid #CBD5E1', borderTopColor: '#E8783B', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} /> : <AIBadge small />} onClick={async () => {
            setSummaryLoading(true);
            try {
              await loadMonthlySummaries({ regenerate: true, openLatest: false });
            } catch (e) {
              alert('Generation failed: ' + (e.message || 'Error'));
            } finally {
              setSummaryLoading(false);
            }
          }} disabled={summaryLoading}>{summaryLoading ? 'Generating…' : 'Generate Now'}</Btn>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          {summaryMonths.length > 0 ? summaryMonths.map((s, i) => (
            <SummaryMonthCard
              key={i}
              s={s}
              i={i}
              setSelectedMonth={setSelectedMonth}
              setSummaryOpen={setSummaryOpen}
            />
          )) : (
            <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', background: '#F8F7F5', borderRadius: '16px', border: '1px dashed #E2E8F0' }}>
              <div style={{ fontSize: '28px', marginBottom: '10px' }}>📊</div>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '16px', color: '#0F172A', marginBottom: '6px' }}>No summaries yet</div>
              <div style={{ fontSize: '13px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Click "Generate Now" to create monthly financial summaries from your live data.</div>
            </div>
          )}
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

        {/* Summary card */}
        <div style={{ background: 'linear-gradient(135deg, rgba(232,120,59,0.06), rgba(16,185,129,0.06))', border: '1px solid #FED7AA', borderRadius: '14px', padding: '20px', marginBottom: '20px', display: 'flex', gap: '32px', alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '4px' }}>Total Savings</div>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '28px', color: '#10B981', letterSpacing: '-1px' }}>₹{Math.round(payRecs.filter(r => r.type === 'discount').reduce((a, b) => a + b.rawAmount * 0.015, 0)).toLocaleString('en-IN') || '0'}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '4px' }}>Avoided Late Fees</div>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '28px', color: '#E8783B', letterSpacing: '-1px' }}>₹{Math.round(payRecs.filter(r => r.type === 'lateFee').reduce((a, b) => a + b.rawAmount * 0.02, 0)).toLocaleString('en-IN') || '0'}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '4px' }}>Optimised DPO</div>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '28px', color: '#F59E0B', letterSpacing: '-1px' }}>{payRecs.length > 0 ? '+' + (payRecs.filter(r => r.type === 'discount').length * 2.5 + payRecs.filter(r => r.type === 'batch').length * 1.2).toFixed(1) + 'd' : '—'}</div>
          </div>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
            <Btn variant="primary" disabled={payRecs.length === 0} onClick={async () => {
              if (!window.confirm(`Apply ${payRecs.length} payment recommendations?`)) return;
              setPayNowMsg({ type: 'info', text: 'Applying recommendations and scheduling payments...' });
              try {
                const today = new Date().toISOString().slice(0,10);
                await Promise.all(payRecs.map(r => window.TijoriAPI.BillsAPI.schedulePayment(r.rawId, r.suggestedDate || today, `AI Optimization — optimal payment timing`)));
                setPayNowMsg({ type: 'success', text: `✓ ${payRecs.length} payments scheduled for optimal dates.` });
                setPayRecs([]);
              } catch(e) {
                setPayNowMsg({ type: 'error', text: 'Failed to apply some recommendations.' });
              }
              setTimeout(() => setPayNowMsg(null), 6000);
            }}>Apply All Recommendations</Btn>
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
              {payRecs.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px' }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>✓</div>
                    No approved vendor bills pending payment optimisation.
                  </td>
                </tr>
              )}
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
                        <Btn variant="primary" small onClick={() => {
                          setPayForm({ method: 'NEFT', utr: '', notes: '' });
                          setPayModal({ rec: r });
                        }}>Pay Now</Btn>
                        <Btn variant="secondary" small onClick={() => {
                          setSchedForm({ date: r.suggestedDate || '', note: '' });
                          setSchedModal({ rec: r });
                        }}>Schedule</Btn>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* Payment feedback toast */}
        {payNowMsg && (
          <div style={{ marginTop: 12, padding: '10px 16px', borderRadius: 10, background: payNowMsg.type === 'success' ? '#D1FAE5' : payNowMsg.type === 'error' ? '#FEE2E2' : '#EDE9FE', border: `1px solid ${payNowMsg.type === 'success' ? '#6EE7B7' : payNowMsg.type === 'error' ? '#FCA5A5' : '#C4B5FD'}`, fontSize: 13, fontWeight: 600, color: payNowMsg.type === 'success' ? '#065F46' : payNowMsg.type === 'error' ? '#991B1B' : '#5B21B6', fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{payNowMsg.type === 'success' ? '✓' : payNowMsg.type === 'error' ? '✕' : '…'}</span>
            {payNowMsg.text}
          </div>
        )}
      </Card>

      </>)} {/* end CFO/FinAdmin only panels */}

      {/* CFO Copilot — NL Query */}
      <CopilotWidget role={role} onNavigate={onNavigate} />

      {/* Summary detail panel */}
      <SidePanel open={summaryOpen} onClose={() => setSummaryOpen(false)} title={selectedMonth?.month || ''} width={500}>
        {selectedMonth && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <AIBadge />
              <LiveDot color="#8B5CF6" />
              <span style={{ fontSize: '11px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>AI-generated summary</span>
            </div>
            <div style={{ marginBottom: '16px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}><AIBadge small /><span style={{ fontSize: '11px', fontWeight: 700, color: '#1E40AF', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Generated Insight</span></div>
              <div style={{ fontSize: '13px', color: '#334155', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.6 }}>{selectedMonth.insight || 'No AI insight available for this month yet.'}</div>
            </div>
            <TjTextarea label="Finance Manager Notes" placeholder="Add notes to this summary…" rows={3} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <Btn variant="primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setSummaryOpen(false)}>Save Notes</Btn>
              <Btn variant="secondary" small onClick={() => {
                if (!selectedMonth) return;
                const w = window.open('', '_blank');
                w.document.write(`<!DOCTYPE html><html><head><title>${selectedMonth.month} Summary</title><style>body{font-family:sans-serif;padding:32px;color:#0F172A;} h1{font-size:22px;margin-bottom:4px;} .meta{font-size:12px;color:#64748B;margin-bottom:24px;}</style></head><body><h1>Tijori AI — ${selectedMonth.month}</h1><div class="meta">Generated: ${new Date().toLocaleString('en-IN')}</div><table border=1 cellpadding=8 style="width:100%;border-collapse:collapse;"><tr><th>Revenue</th><td>${selectedMonth.revenue}</td></tr><tr><th>Expenses</th><td>${selectedMonth.expenses}</td></tr><tr><th>Net Profit</th><td>${selectedMonth.profit}</td></tr><tr><th>Cash Position</th><td>${selectedMonth.cash}</td></tr></table><p style="margin-top:24px;"><b>AI Insight:</b> ${selectedMonth.insight}</p><script>window.print()<\/script></body></html>`);
                w.document.close();
              }}>Export PDF</Btn>
            </div>
          </>
        )}
      </SidePanel>

      {/* ── Pay Now Modal ─────────────────────────────────────────────────── */}
      {payModal && (
        <TjModal open onClose={() => { setPayModal(null); setPayProcessing(false); }} title="Initiate Payment" accentColor="#E8783B" width={480}>
          {/* Invoice summary */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: 'linear-gradient(135deg, #FFF7ED, #FEF3C7)', border: '1px solid #FED7AA', borderRadius: '12px', marginBottom: '20px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Invoice</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', color: '#E8783B', fontWeight: 600, marginTop: '2px' }}>{payModal.rec.invoices}</div>
              <div style={{ fontSize: '12px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif", marginTop: '2px' }}>{payModal.rec.vendor}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '26px', color: '#E8783B', letterSpacing: '-1px' }}>{payModal.rec.amount}</div>
              <div style={{ fontSize: '11px', color: '#92400E', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Due: {payModal.rec.due}</div>
            </div>
          </div>

          {/* Payment method */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#374151', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '6px' }}>Payment Method</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['NEFT', 'RTGS', 'IMPS', 'UPI'].map(m => (
                <button key={m} onClick={() => setPayForm(f => ({...f, method: m}))}
                  style={{ flex: 1, padding: '8px 4px', borderRadius: '8px', border: `2px solid ${payForm.method === m ? '#E8783B' : '#E2E8F0'}`, background: payForm.method === m ? '#FFF7ED' : 'white', fontSize: '12px', fontWeight: 700, color: payForm.method === m ? '#E8783B' : '#64748B', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", transition: 'all 150ms' }}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          <TjInput label="UTR / Transaction Reference (optional — auto-generated if blank)" placeholder={`UTR-${payModal.rec.invoices}-${Date.now().toString().slice(-6)}`} value={payForm.utr} onChange={e => setPayForm(f => ({...f, utr: e.target.value}))} />
          <TjInput label="Payment Notes / Remarks" placeholder="e.g. Early payment for 1.5% discount" value={payForm.notes} onChange={e => setPayForm(f => ({...f, notes: e.target.value}))} />

          <div style={{ padding: '12px 14px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '10px', marginBottom: '16px', fontSize: '12px', color: '#065F46', fontFamily: "'Plus Jakarta Sans', sans-serif ", fontWeight: 500 }}>
            ✓ Payment confirmation will be sent to vendor via email. Transaction will be recorded in AuditLog with UTR.
          </div>

          {payNowMsg && (
            <div style={{ marginBottom: '12px', padding: '10px 14px', borderRadius: '8px', background: payNowMsg.type === 'success' ? '#D1FAE5' : '#FEE2E2', border: `1px solid ${payNowMsg.type === 'success' ? '#6EE7B7' : '#FCA5A5'}`, fontSize: '13px', fontWeight: 600, color: payNowMsg.type === 'success' ? '#065F46' : '#991B1B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {payNowMsg.text}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <Btn variant="secondary" onClick={() => setPayModal(null)}>Cancel</Btn>
            <Btn variant="primary" disabled={payProcessing} onClick={async () => {
              const r = payModal.rec;
              setPayProcessing(true); setPayNowMsg(null);
              try {
                const utr = payForm.utr.trim() || `UTR-${r.invoices}-${Date.now().toString().slice(-6)}`;
                const res = await window.TijoriAPI.BillsAPI.settle(r.rawId, utr, payForm.method, payForm.notes);
                setPayNowMsg({ type: 'success', text: res?.message || `✓ Payment of ${r.amount} to ${r.vendor} processed via ${payForm.method}. UTR: ${utr}` });
                setPayRecs(prev => prev.filter(p => p.rawId !== r.rawId));
                setTimeout(() => { setPayModal(null); setPayNowMsg(null); }, 3000);
              } catch(e) {
                setPayNowMsg({ type: 'error', text: `Payment failed: ${e.message || 'Check approval status or authority limits'}` });
              } finally {
                setPayProcessing(false);
              }
            }}>
              {payProcessing ? 'Processing…' : `Confirm Payment — ${payModal.rec.amount}`}
            </Btn>
          </div>
        </TjModal>
      )}

      {/* ── Schedule Payment Modal ─────────────────────────────────────────── */}
      {schedModal && (
        <TjModal open onClose={() => { setSchedModal(null); setSchedProcessing(false); }} title="Schedule Payment" accentColor="#5B21B6" width={440}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: '#F5F3FF', border: '1px solid #EDE9FE', borderRadius: '12px', marginBottom: '20px' }}>
            <div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#7C3AED', fontWeight: 600 }}>{schedModal.rec.invoices}</div>
              <div style={{ fontSize: '13px', color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, marginTop: '2px' }}>{schedModal.rec.vendor}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '22px', color: '#7C3AED', letterSpacing: '-0.5px' }}>{schedModal.rec.amount}</div>
              <div style={{ fontSize: '11px', color: '#7C3AED', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {schedModal.rec.tip}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '6px', fontSize: '12px', fontWeight: 600, color: '#374151', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Payment Date <span style={{ color: '#EF4444' }}>*</span></div>
          <input type="date" value={schedForm.date} onChange={e => setSchedForm(f => ({...f, date: e.target.value}))} min={new Date().toISOString().slice(0,10)}
            style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: '1.5px solid #E2E8F0', borderRadius: '10px', fontSize: '14px', fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#0F172A', outline: 'none', marginBottom: '14px' }} />

          <TjInput label="Note / Reason (optional)" placeholder="e.g. Early payment for discount — AI recommendation" value={schedForm.note} onChange={e => setSchedForm(f => ({...f, note: e.target.value}))} />

          <div style={{ padding: '10px 14px', background: '#F5F3FF', border: '1px solid #EDE9FE', borderRadius: '10px', marginBottom: '16px', fontSize: '12px', color: '#5B21B6', fontFamily: "'Plus Jakarta Sans', sans-serif'", fontWeight: 500 }}>
            ✓ Vendor will be notified via email. Payment will auto-initiate on the scheduled date.
          </div>

          {payNowMsg && schedModal && (
            <div style={{ marginBottom: '12px', padding: '10px 14px', borderRadius: '8px', background: payNowMsg.type === 'success' ? '#D1FAE5' : '#FEE2E2', border: `1px solid ${payNowMsg.type === 'success' ? '#6EE7B7' : '#FCA5A5'}`, fontSize: '13px', fontWeight: 600, color: payNowMsg.type === 'success' ? '#065F46' : '#991B1B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {payNowMsg.text}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <Btn variant="secondary" onClick={() => setSchedModal(null)}>Cancel</Btn>
            <Btn variant="purple" disabled={schedProcessing || !schedForm.date} onClick={async () => {
              const r = schedModal.rec;
              if (!schedForm.date) { setPayNowMsg({ type: 'error', text: 'Please select a payment date.' }); return; }
              setSchedProcessing(true);
              try {
                const res = await window.TijoriAPI.BillsAPI.schedulePayment(r.rawId, schedForm.date, schedForm.note || `Scheduled via AI Optimization for ${r.vendor}`);
                setPayNowMsg({ type: 'success', text: res?.message || `✓ Payment of ${r.amount} to ${r.vendor} scheduled for ${schedForm.date}. Vendor notified.` });
                setTimeout(() => { setSchedModal(null); setPayNowMsg(null); }, 3000);
              } catch(e) {
                setPayNowMsg({ type: 'error', text: `Schedule failed: ${e.message || 'Server error'}` });
              } finally {
                setSchedProcessing(false);
              }
            }}>
              {schedProcessing ? 'Scheduling…' : `Confirm Schedule — ${schedModal.rec.amount}`}
            </Btn>
          </div>
        </TjModal>
      )}
    </div>
  );
};

Object.assign(window, { AIHubScreen });
