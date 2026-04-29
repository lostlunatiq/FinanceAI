// Tijori AI — AI Feedback Modal
// Shared component for OCR, Anomaly, and Forecast feedback.
// Usage:
//   <FeedbackModal
//     taskType="OCR" | "ANOMALY" | "FORECAST"
//     expenseId={uuid}            // required for OCR + ANOMALY
//     vendorName="Acme Corp"      // for OCR + ANOMALY
//     anomalyFlags={[...]}        // Anomaly only — list of flag objects
//     onClose={() => {}}
//   />

const ANOMALY_REASONS = [
  'Round amounts are normal for this vendor (fixed-fee contract)',
  'Recurring contract payment — not a duplicate',
  'Already paid separately via different channel',
  'MSME timeline exception applies',
  'Other',
];

const OCR_FIELDS = [
  { key: 'vendor_name', label: 'Vendor Name' },
  { key: 'invoice_number', label: 'Invoice Number' },
  { key: 'invoice_date', label: 'Invoice Date' },
  { key: 'total_amount', label: 'Total Amount' },
  { key: 'pre_gst_amount', label: 'Pre-GST Amount' },
  { key: 'cgst', label: 'CGST' },
  { key: 'sgst', label: 'SGST' },
  { key: 'igst', label: 'IGST' },
  { key: 'gstin', label: 'GSTIN' },
  { key: 'pan', label: 'PAN' },
];

const FeedbackModal = ({ taskType, expenseId, vendorName, anomalyFlags = [], onClose }) => {
  const [isPositive, setIsPositive] = React.useState(null);
  const [comment, setComment] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [error, setError] = React.useState('');

  // OCR state
  const [selectedField, setSelectedField] = React.useState('');
  const [fieldCorrections, setFieldCorrections] = React.useState({});
  const [correctionValue, setCorrectionValue] = React.useState('');

  // Anomaly state
  const [disputedFlags, setDisputedFlags] = React.useState([]);
  const [selectedReason, setSelectedReason] = React.useState('');

  const addCorrection = () => {
    if (!selectedField || !correctionValue.trim()) return;
    setFieldCorrections(prev => ({ ...prev, [selectedField]: correctionValue.trim() }));
    setSelectedField('');
    setCorrectionValue('');
  };

  const removeCorrection = (key) => {
    setFieldCorrections(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const toggleFlag = (flagType) => {
    setDisputedFlags(prev =>
      prev.includes(flagType) ? prev.filter(f => f !== flagType) : [...prev, flagType]
    );
  };

  const handleSubmit = async () => {
    if (isPositive === null) { setError('Please select thumbs up or thumbs down.'); return; }
    if (taskType === 'ANOMALY' && !isPositive && disputedFlags.length === 0) {
      setError('Please select which flags you are disputing.'); return;
    }
    setError('');
    setSubmitting(true);
    try {
      const finalComment = selectedReason && selectedReason !== 'Other'
        ? (comment ? `${selectedReason}. ${comment}` : selectedReason)
        : comment;
      await window.TijoriAPI.FeedbackAPI.submit({
        task_type: taskType,
        expense_id: expenseId || null,
        vendor_name: vendorName || '',
        is_positive: isPositive,
        comment: finalComment,
        field_corrections: taskType === 'OCR' && Object.keys(fieldCorrections).length > 0 ? fieldCorrections : null,
        disputed_flags: taskType === 'ANOMALY' && disputedFlags.length > 0 ? disputedFlags : null,
      });
      setSubmitted(true);
      setTimeout(onClose, 1500);
    } catch (e) {
      setError('Failed to save feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const overlay = {
    position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
  };
  const card = {
    background: 'white', borderRadius: '20px', padding: '32px',
    width: '480px', maxWidth: '95vw', maxHeight: '85vh', overflowY: 'auto',
    boxShadow: '0 24px 80px rgba(0,0,0,0.2)',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  };
  const label = { fontSize: '11px', fontWeight: 700, color: '#64748B', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px', display: 'block' };
  const input = { width: '100%', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '10px 12px', fontSize: '13px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };

  const taskLabel = { OCR: 'OCR Extraction', ANOMALY: 'Anomaly Detection', FORECAST: 'Cash Flow Forecast' }[taskType] || taskType;

  if (submitted) {
    return (
      <div style={overlay}>
        <div style={{ ...card, textAlign: 'center', padding: '48px 32px' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>✓</div>
          <div style={{ fontWeight: 700, fontSize: '18px', color: '#10B981' }}>Feedback saved!</div>
          <div style={{ fontSize: '13px', color: '#64748B', marginTop: '8px' }}>The AI will use this to improve future predictions.</div>
        </div>
      </div>
    );
  }

  return (
    <div style={overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={card}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '20px', color: '#0F172A', letterSpacing: '-0.5px' }}>
              AI Feedback
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>{taskLabel}{vendorName ? ` · ${vendorName}` : ''}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '18px', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}>✕</button>
        </div>

        {/* Thumbs */}
        <div style={{ marginBottom: '24px' }}>
          <span style={label}>Was this AI output helpful?</span>
          <div style={{ display: 'flex', gap: '12px' }}>
            {[{ val: true, icon: '👍', text: 'Yes, correct' }, { val: false, icon: '👎', text: 'No, incorrect' }].map(({ val, icon, text }) => (
              <button key={String(val)} onClick={() => setIsPositive(val)} style={{
                flex: 1, padding: '12px', borderRadius: '12px', border: '2px solid',
                borderColor: isPositive === val ? (val ? '#10B981' : '#EF4444') : '#E2E8F0',
                background: isPositive === val ? (val ? '#ECFDF5' : '#FEF2F2') : 'white',
                cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                fontFamily: 'inherit',
              }}>
                <span style={{ fontSize: '20px' }}>{icon}</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>{text}</span>
              </button>
            ))}
          </div>
        </div>

        {/* OCR: field corrections */}
        {taskType === 'OCR' && isPositive === false && (
          <div style={{ marginBottom: '24px' }}>
            <span style={label}>Which fields were extracted incorrectly?</span>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <select value={selectedField} onChange={e => setSelectedField(e.target.value)}
                style={{ ...input, flex: 1 }}>
                <option value="">Select field…</option>
                {OCR_FIELDS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
              </select>
              <input
                placeholder="Correct value"
                value={correctionValue}
                onChange={e => setCorrectionValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addCorrection(); }}
                style={{ ...input, flex: 1.5 }}
              />
              <button onClick={addCorrection} style={{ padding: '10px 14px', background: '#0F172A', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>Add</button>
            </div>
            {Object.keys(fieldCorrections).length > 0 && (
              <div style={{ background: '#F8FAFC', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {Object.entries(fieldCorrections).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                    <span><strong>{OCR_FIELDS.find(f => f.key === k)?.label || k}:</strong> {v}</span>
                    <button onClick={() => removeCorrection(k)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: '14px' }}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Anomaly: disputed flags */}
        {taskType === 'ANOMALY' && isPositive === false && (
          <div style={{ marginBottom: '24px' }}>
            <span style={label}>Which flags are incorrect? (select all that apply)</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
              {anomalyFlags.map(flag => {
                const flagType = typeof flag === 'string' ? flag : flag.type;
                const flagMsg = typeof flag === 'string' ? flag : (flag.message || flag.type);
                const checked = disputedFlags.includes(flagType);
                return (
                  <label key={flagType} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 12px', background: checked ? '#FEF2F2' : '#F8FAFC', borderRadius: '10px', cursor: 'pointer', border: `1px solid ${checked ? '#FECACA' : '#E2E8F0'}` }}>
                    <input type="checkbox" checked={checked} onChange={() => toggleFlag(flagType)} style={{ marginTop: '2px' }} />
                    <span style={{ fontSize: '12px', color: '#0F172A', lineHeight: 1.4 }}>{flagMsg}</span>
                  </label>
                );
              })}
              {anomalyFlags.length === 0 && (
                <div style={{ fontSize: '12px', color: '#94A3B8', padding: '8px' }}>No specific flags to dispute.</div>
              )}
            </div>
            <span style={label}>Reason</span>
            <select value={selectedReason} onChange={e => setSelectedReason(e.target.value)} style={{ ...input, marginBottom: '8px' }}>
              <option value="">Select a reason…</option>
              {ANOMALY_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        )}

        {/* Comment */}
        <div style={{ marginBottom: '24px' }}>
          <span style={label}>Additional comment (optional)</span>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Add any context that will help the AI improve…"
            rows={3}
            style={{ ...input, resize: 'vertical', lineHeight: 1.5 }}
          />
        </div>

        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', color: '#DC2626', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 600, fontFamily: 'inherit', color: '#64748B' }}>
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={submitting} style={{ flex: 2, padding: '12px', borderRadius: '12px', border: 'none', background: submitting ? '#94A3B8' : '#0F172A', color: 'white', cursor: submitting ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 700, fontFamily: 'inherit' }}>
            {submitting ? 'Saving…' : 'Submit Feedback'}
          </button>
        </div>
      </div>
    </div>
  );
};
