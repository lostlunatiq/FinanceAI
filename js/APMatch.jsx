// Tijori AI — AP Invoice Detail (real data + working actions)

const APMatchScreen = ({ onNavigate, invoice: passedInvoice, role: propRole }) => {
  const [bill, setBill] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [modal, setModal] = React.useState(null);  // { type: 'approve'|'reject'|'query'|'investigate' }
  const [notes, setNotes] = React.useState('');
  const [anomalyOverride, setAnomalyOverride] = React.useState('');
  const [actionLoading, setActionLoading] = React.useState(false);
  const [actionError, setActionError] = React.useState('');

  const currentRole = propRole || localStorage.getItem('tj_role') || 'CFO';
  const rawId = passedInvoice?.rawId || passedInvoice?.id;

  const fetchBill = () => {
    if (!rawId) { setLoading(false); return; }
    const { BillsAPI } = window.TijoriAPI;
    setLoading(true);
    BillsAPI.detail(rawId)
      .then(d => { setBill(d); setLoading(false); })
      .catch(() => { setError('Failed to load invoice details.'); setLoading(false); });
  };

  React.useEffect(() => { fetchBill(); }, [rawId]);

  const fmt = (v) => {
    if (!v && v !== 0) return '—';
    const n = parseFloat(v);
    if (isNaN(n)) return v;
    return '\u20b9' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const fmtDate = (d) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch (e) { return d; }
  };

  const confirmAction = async () => {
    const { BillsAPI } = window.TijoriAPI;
    setActionLoading(true); setActionError('');
    try {
      if (modal.type === 'approve') {
        await BillsAPI.approve(bill.id, notes || 'Approved', anomalyOverride);
      } else if (modal.type === 'reject') {
        await BillsAPI.reject(bill.id, notes);
      } else if (modal.type === 'query') {
        await BillsAPI.query(bill.id, notes);
      } else if (modal.type === 'investigate') {
        await BillsAPI.scanAnomaly(bill.id);
      }
      setModal(null); setNotes(''); setAnomalyOverride('');
      fetchBill();
    } catch(err) {
      setActionError(err.message || 'Action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const isTerminal = (s) => ['APPROVED', 'PAID', 'REJECTED', 'AUTO_REJECT', 'WITHDRAWN'].includes(s);
  const canAct = bill && !isTerminal(bill.status);

  const needsAnomOverride = bill && ['HIGH','CRITICAL'].includes(bill.anomaly_severity) && modal?.type === 'approve';
  const canConfirm = modal && (
    modal.type === 'approve' ? (!needsAnomOverride || anomalyOverride.length >= 5) :
    modal.type === 'reject' ? notes.length >= 10 :
    modal.type === 'query' ? notes.length >= 10 : true
  );

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
      <div style={{ width: 24, height: 24, border: '2.5px solid #E2E8F0', borderTopColor: '#E8783B', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  if (error || !bill) return (
    <div style={{ padding: '32px', textAlign: 'center', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ fontSize: '48px', marginBottom: '12px' }}>📄</div>
      <div style={{ fontSize: '14px' }}>{error || 'Invoice not found.'}</div>
      <Btn variant="secondary" style={{ marginTop: 16 }} onClick={() => onNavigate && onNavigate('ap-hub')}>← Back to Hub</Btn>
    </div>
  );

  const ocr = bill.ocr_raw || {};
  const fields = ocr.extracted_fields || {};
  const anomalyFlags = ocr.anomaly_flags || [];
  const lineItems = fields.line_items || [];
  const bankDetails = fields.bank_details || {};

  const statusColors = {
    'PENDING_L1': '#F59E0B', 'PENDING_L2': '#F59E0B', 'PENDING_HOD': '#8B5CF6',
    'PENDING_FIN_L1': '#3B82F6', 'PENDING_FIN_L2': '#3B82F6', 'PENDING_FIN_HEAD': '#E8783B',
    'QUERY_RAISED': '#F59E0B', 'SUBMITTED': '#64748B',
    'APPROVED': '#10B981', 'PAID': '#10B981', 'REJECTED': '#EF4444',
  };
  const sc = statusColors[bill.status] || '#64748B';

  const sevColor = { HIGH: '#EF4444', CRITICAL: '#DC2626', MEDIUM: '#F59E0B', LOW: '#10B981', NONE: '#10B981' };

  return (
    <div style={{ padding: '32px', maxWidth: 1280, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '12px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ cursor: 'pointer', color: '#E8783B' }} onClick={() => onNavigate && onNavigate('ap-hub')}>← Accounts Payable Hub</span>
          <span>›</span>
          <span style={{ color: '#0F172A', fontWeight: 600 }}>{bill.ref_no}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '22px', color: '#E8783B', fontWeight: 700 }}>{bill.ref_no}</span>
              <span style={{ background: sc + '22', color: sc, padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{bill.status?.replace(/_/g,' ')}</span>
              {bill.anomaly_severity && bill.anomaly_severity !== 'NONE' && (
                <span style={{ background: '#FEE2E2', color: '#EF4444', padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", animation: 'dotPulse 2s ease infinite' }}>
                  ⚠ {bill.anomaly_severity} ANOMALY
                </span>
              )}
            </div>
            <div style={{ fontSize: '14px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              <strong style={{ color: '#0F172A' }}>{bill.vendor_name}</strong>
              {bill.vendor_gstin && <span style={{ marginLeft: 8, fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#94A3B8' }}>GSTIN: {bill.vendor_gstin}</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Btn variant="secondary" onClick={() => onNavigate && onNavigate('ap-hub')}>← Back</Btn>
            {canAct && (
              <>
                {bill.anomaly_severity && bill.anomaly_severity !== 'NONE' && (
                  <Btn variant="secondary" onClick={() => { setModal({ type: 'investigate' }); setNotes(''); }}>🔍 Re-Scan Anomaly</Btn>
                )}
                <Btn variant="purple" small onClick={() => { setModal({ type: 'query' }); setNotes(''); }}>? Query</Btn>
                <Btn variant="destructive" small onClick={() => { setModal({ type: 'reject' }); setNotes(''); }}>✕ Reject</Btn>
                <Btn variant="green" small onClick={() => { setModal({ type: 'approve' }); setNotes(''); setAnomalyOverride(''); }}>✓ Approve</Btn>
              </>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '20px' }}>
        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Invoice Financials */}
          <Card style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F0EE', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '16px', color: '#0F172A' }}>
              Invoice Financials
            </div>
            <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              {[
                { label: 'Invoice Number', value: bill.invoice_number || '—', mono: true },
                { label: 'Invoice Date', value: fmtDate(bill.invoice_date) },
                { label: 'Submitted By', value: bill.submitted_by_name || '—' },
                { label: 'Pre-GST Amount', value: fmt(bill.pre_gst_amount) },
                { label: 'CGST', value: fmt(bill.cgst) },
                { label: 'SGST', value: fmt(bill.sgst) },
                { label: 'IGST', value: fmt(bill.igst) },
                { label: 'TDS Section', value: bill.tds_section || '—' },
                { label: 'TDS Amount', value: fmt(bill.tds_amount) },
              ].map(({ label, value, mono }) => (
                <div key={label}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '4px' }}>{label}</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', fontFamily: mono ? "'JetBrains Mono', monospace" : "'Plus Jakarta Sans', sans-serif" }}>{value}</div>
                </div>
              ))}
            </div>
            <div style={{ margin: '0 20px 20px', padding: '14px 18px', background: 'linear-gradient(135deg, #FFF7ED, #FFF3E8)', borderRadius: '12px', border: '1px solid #FED7AA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '14px', color: '#92400E' }}>Total Invoice Amount</span>
              <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '28px', color: '#E8783B', letterSpacing: '-1px' }}>{fmt(bill.total_amount)}</span>
            </div>
            {bill.business_purpose && (
              <div style={{ margin: '0 20px 20px', padding: '12px 16px', background: '#F8FAFC', borderRadius: '10px', fontSize: '13px', color: '#475569', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                <span style={{ fontWeight: 700, color: '#0F172A' }}>Purpose: </span>{bill.business_purpose}
              </div>
            )}
          </Card>

          {/* OCR Extracted Data */}
          {(fields.vendor_name || lineItems.length > 0 || fields.raw_text) && (
            <Card style={{ padding: '0', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F0EE', display: 'flex', alignItems: 'center', gap: '10px', background: 'linear-gradient(135deg, rgba(232,120,59,0.06), rgba(139,92,246,0.06))' }}>
                <AIBadge />
                <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '16px', color: '#0F172A' }}>OCR Extracted Data</div>
                {bill.ocr_confidence && (
                  <span style={{ marginLeft: 'auto', background: '#D1FAE5', color: '#065F46', padding: '2px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {Math.round(parseFloat(bill.ocr_confidence) * 100)}% Confidence
                  </span>
                )}
              </div>
              <div style={{ padding: '20px' }}>
                {/* Key extracted fields */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: lineItems.length ? '20px' : 0 }}>
                  {[
                    ['Vendor Name (OCR)', fields.vendor_name],
                    ['Invoice No (OCR)', fields.invoice_number],
                    ['Invoice Date (OCR)', fields.invoice_date],
                    ['Pre-GST Amount (OCR)', fields.pre_gst_amount != null ? fmt(fields.pre_gst_amount) : null],
                    ['CGST (OCR)', fields.cgst != null ? fmt(fields.cgst) : null],
                    ['SGST (OCR)', fields.sgst != null ? fmt(fields.sgst) : null],
                    ['IGST (OCR)', fields.igst != null ? fmt(fields.igst) : null],
                    ['Total Amount (OCR)', fields.total_amount != null ? fmt(fields.total_amount) : null],
                    ['GSTIN (OCR)', fields.gstin],
                    ['PAN (OCR)', fields.pan],
                    ['Bank Account', bankDetails.account_no],
                    ['IFSC Code', bankDetails.ifsc],
                  ].filter(([, v]) => v != null && v !== '' && v !== '—').map(([label, value]) => (
                    <div key={label} style={{ padding: '10px 12px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: '10px', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '3px' }}>{label}</div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{value}</div>
                    </div>
                  ))}
                </div>

                {/* Line Items */}
                {lineItems.length > 0 && (
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '10px' }}>Line Items</div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ background: '#F8F7F5' }}>
                          {['Description', 'Qty', 'Unit Price', 'Amount'].map(h => (
                            <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: '10px', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {lineItems.map((item, i) => (
                          <tr key={i} style={{ borderTop: '1px solid #F1F0EE' }}>
                            <td style={{ padding: '10px 12px', fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#0F172A', fontWeight: 500 }}>{item.description || item.desc || '—'}</td>
                            <td style={{ padding: '10px 12px', fontFamily: "'JetBrains Mono', monospace", color: '#475569' }}>{item.quantity != null ? item.quantity : (item.qty != null ? item.qty : '—')}</td>
                            <td style={{ padding: '10px 12px', fontFamily: "'JetBrains Mono', monospace", color: '#E8783B' }}>{item.unit_price != null ? fmt(item.unit_price) : '—'}</td>
                            <td style={{ padding: '10px 12px', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, color: '#0F172A' }}>{item.amount != null ? fmt(item.amount) : (item.total != null ? fmt(item.total) : '—')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Raw text snippet */}
                {fields.raw_text && (
                  <details style={{ marginTop: 16 }}>
                    <summary style={{ fontSize: '12px', color: '#94A3B8', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", userSelect: 'none' }}>Raw OCR Text (click to expand)</summary>
                    <pre style={{ marginTop: 8, padding: '12px', background: '#0F172A', color: '#94A3B8', borderRadius: '8px', fontSize: '11px', fontFamily: "'JetBrains Mono', monospace", overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 200, overflow: 'auto' }}>
                      {fields.raw_text.slice(0, 1000)}{fields.raw_text.length > 1000 ? '…' : ''}
                    </pre>
                  </details>
                )}
              </div>
            </Card>
          )}

          {/* Approval Timeline */}
          {bill.timeline && bill.timeline.length > 0 && (
            <Card style={{ padding: '20px' }}>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '16px', color: '#0F172A', marginBottom: '16px' }}>Approval Timeline</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {bill.timeline.map((ev, i) => {
                  const action = ev.action || '';
                  const dotColor = action.includes('reject') ? '#EF4444' : (action.includes('approv') || action.includes('paid')) ? '#10B981' : action.includes('query') ? '#F59E0B' : '#E8783B';
                  return (
                    <div key={i} style={{ display: 'flex', gap: '14px', paddingBottom: i < bill.timeline.length - 1 ? '16px' : 0, position: 'relative' }}>
                      {i < bill.timeline.length - 1 && (
                        <div style={{ position: 'absolute', left: 7, top: 20, bottom: 0, width: 2, background: '#F1F0EE' }} />
                      )}
                      <div style={{ width: 16, height: 16, borderRadius: '50%', background: dotColor, flexShrink: 0, marginTop: 2, border: '2px solid white', boxShadow: '0 0 0 2px ' + dotColor + '44' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: '13px', color: '#0F172A' }}>
                          {action.replace(/expense\.|_/g, ' ').trim()}
                        </div>
                        <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          {ev.actor} · {new Date(ev.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </div>
                        {ev.details && ev.details.reason && ev.details.reason !== 'Approved' && (
                          <div style={{ marginTop: '4px', fontSize: '12px', color: '#475569', fontFamily: "'Plus Jakarta Sans', sans-serif", fontStyle: 'italic' }}>"{ev.details.reason}"</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Anomaly Panel */}
          <Card style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #F1F0EE', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '15px', color: '#0F172A' }}>
              Anomaly Detection
            </div>
            {anomalyFlags.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#10B981', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', fontWeight: 600 }}>
                ✓ No anomalies detected
              </div>
            ) : (
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {anomalyFlags.map((flag, i) => {
                  const fc = sevColor[flag.severity] || '#F59E0B';
                  return (
                    <div key={i} style={{ padding: '12px', background: fc + '10', border: '1px solid ' + fc + '33', borderRadius: '10px', borderLeft: '3px solid ' + fc }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          {flag.type ? flag.type.replace(/_/g,' ') : 'Unknown'}
                        </span>
                        <span style={{ background: fc + '22', color: fc, padding: '1px 7px', borderRadius: '999px', fontSize: '9px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{flag.severity}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#475569', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.4 }}>{flag.message}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Approval Steps */}
          {bill.approval_steps && bill.approval_steps.length > 0 && (
            <Card style={{ padding: '0', overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #F1F0EE', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '15px', color: '#0F172A' }}>
                Approval Chain
              </div>
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {bill.approval_steps.map((step, i) => {
                  const stepStatusColor = ({ PENDING: '#F59E0B', APPROVED: '#10B981', REJECTED: '#EF4444', QUERIED: '#8B5CF6' })[step.status] || '#94A3B8';
                  return (
                    <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '10px 12px', background: step.status === 'PENDING' ? '#FFF7ED' : '#F8F7F5', borderRadius: '10px', border: '1px solid ' + (step.status === 'PENDING' ? '#FED7AA' : '#F1F0EE') }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: stepStatusColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>{step.level}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '12px', color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{step.assigned_to_name || ('Level ' + step.level)}</div>
                        <div style={{ fontSize: '10px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{step.role_required}</div>
                        {step.decided_at && <div style={{ fontSize: '10px', color: '#64748B', marginTop: 2, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{new Date(step.decided_at).toLocaleDateString('en-IN')}</div>}
                      </div>
                      <span style={{ background: stepStatusColor + '22', color: stepStatusColor, padding: '2px 8px', borderRadius: '999px', fontSize: '9px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", flexShrink: 0 }}>{step.status}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Quick Info */}
          <Card style={{ padding: '18px' }}>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '15px', color: '#0F172A', marginBottom: '14px' }}>Bill Info</div>
            {[
              ['Submitted', fmtDate(bill.submitted_at || bill.created_at)],
              ['Approved At', fmtDate(bill.approved_at)],
              ['D365 Doc No', bill.d365_document_no || '—'],
              ['Payment UTR', bill.d365_payment_utr || '—'],
              ['Payment Date', fmtDate(bill.d365_paid_at)],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #F8F7F5', fontSize: '12px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                <span style={{ color: '#94A3B8' }}>{label}</span>
                <span style={{ color: '#0F172A', fontWeight: 600 }}>{value}</span>
              </div>
            ))}
          </Card>

          {/* Action Buttons (bottom) */}
          {canAct && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Btn variant="green" style={{ width: '100%', justifyContent: 'center' }} onClick={() => { setModal({ type: 'approve' }); setNotes(''); setAnomalyOverride(''); }}>✓ Approve This Invoice</Btn>
              <Btn variant="purple" style={{ width: '100%', justifyContent: 'center' }} onClick={() => { setModal({ type: 'query' }); setNotes(''); }}>? Raise Query to Vendor</Btn>
              <Btn variant="destructive" style={{ width: '100%', justifyContent: 'center' }} onClick={() => { setModal({ type: 'reject' }); setNotes(''); }}>✕ Reject This Invoice</Btn>
              {bill.anomaly_severity && bill.anomaly_severity !== 'NONE' && (
                <Btn variant="secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => { setModal({ type: 'investigate' }); }}>🔍 Re-Run Anomaly Scan</Btn>
              )}
            </div>
          )}
          {!canAct && bill && (
            <div style={{ padding: '14px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '12px', textAlign: 'center', fontSize: '13px', color: '#065F46', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600 }}>
              {bill.status === 'PAID' ? '✓ Invoice paid & closed' : bill.status === 'REJECTED' ? '✕ Invoice rejected' : ('Status: ' + bill.status)}
            </div>
          )}
        </div>
      </div>

      {/* Action Modal */}
      {modal && (
        <TjModal open={!!modal} onClose={() => { setModal(null); setActionError(''); }}
          title={modal.type === 'approve' ? '✓ Approve Invoice' : modal.type === 'reject' ? '✕ Reject Invoice' : modal.type === 'query' ? '? Raise Query' : '🔍 Re-Scan Anomaly'}
          accentColor={modal.type === 'approve' ? '#065F46' : modal.type === 'reject' ? '#991B1B' : modal.type === 'query' ? '#5B21B6' : '#E8783B'}
          width={500}>

          <div style={{ padding: '12px 14px', background: '#F8F7F5', borderRadius: '10px', marginBottom: '16px' }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#E8783B' }}>{bill.ref_no} · {bill.vendor_name}</div>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '22px', color: '#0F172A', letterSpacing: '-0.5px', marginTop: '4px' }}>
              {fmt(bill.total_amount)}
            </div>
          </div>

          {modal.type === 'investigate' ? (
            <div style={{ padding: '12px', background: '#FFF7ED', borderRadius: '8px', fontSize: '13px', color: '#92400E', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 16 }}>
              This will re-run the anomaly detection pipeline on this invoice and update the risk score.
            </div>
          ) : (
            <>
              {needsAnomOverride && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: '8px', padding: '10px 12px', marginBottom: '8px', fontSize: '12px', color: '#991B1B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    ⚠ This invoice has a <strong>{bill.anomaly_severity}</strong> anomaly. You must provide an override reason to approve.
                  </div>
                  <TjInput label="Anomaly Override Reason *" placeholder="Explain why this anomaly is acceptable…" value={anomalyOverride} onChange={e => setAnomalyOverride(e.target.value)} />
                </div>
              )}
              <TjTextarea
                label={modal.type === 'reject' ? 'Rejection Reason (min 10 chars) *' : modal.type === 'query' ? 'Query for Vendor (min 10 chars) *' : 'Notes (optional)'}
                placeholder={modal.type === 'reject' ? 'State the reason for rejection…' : modal.type === 'query' ? 'What clarification do you need?…' : 'Add approval notes…'}
                value={notes} onChange={e => setNotes(e.target.value)}
                required={modal.type !== 'approve'} rows={3}
              />
            </>
          )}

          {actionError && (
            <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: '8px', padding: '10px 12px', marginBottom: '12px', fontSize: '12px', color: '#991B1B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {actionError}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <Btn variant="secondary" onClick={() => { setModal(null); setActionError(''); }}>Cancel</Btn>
            <Btn
              variant={modal.type === 'approve' ? 'green' : modal.type === 'reject' ? 'destructive' : modal.type === 'query' ? 'purple' : 'primary'}
              onClick={confirmAction}
              disabled={!canConfirm || actionLoading}>
              {actionLoading ? 'Processing…' : modal.type === 'approve' ? 'Confirm Approval' : modal.type === 'reject' ? 'Confirm Rejection' : modal.type === 'query' ? 'Send Query' : 'Run Scan'}
            </Btn>
          </div>
        </TjModal>
      )}
    </div>
  );
};

Object.assign(window, { APMatchScreen });
