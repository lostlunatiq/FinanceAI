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

const ANOMALY_REASONS = ['Round amounts are normal for this vendor (fixed-fee contract)', 'Recurring contract payment — not a duplicate', 'Already paid separately via different channel', 'MSME timeline exception applies', 'Other'];
const OCR_FIELDS = [{
  key: 'vendor_name',
  label: 'Vendor Name'
}, {
  key: 'invoice_number',
  label: 'Invoice Number'
}, {
  key: 'invoice_date',
  label: 'Invoice Date'
}, {
  key: 'total_amount',
  label: 'Total Amount'
}, {
  key: 'pre_gst_amount',
  label: 'Pre-GST Amount'
}, {
  key: 'cgst',
  label: 'CGST'
}, {
  key: 'sgst',
  label: 'SGST'
}, {
  key: 'igst',
  label: 'IGST'
}, {
  key: 'gstin',
  label: 'GSTIN'
}, {
  key: 'pan',
  label: 'PAN'
}];
const FeedbackModal = ({
  taskType,
  expenseId,
  vendorName,
  anomalyFlags = [],
  onClose
}) => {
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
    setFieldCorrections(prev => ({
      ...prev,
      [selectedField]: correctionValue.trim()
    }));
    setSelectedField('');
    setCorrectionValue('');
  };
  const removeCorrection = key => {
    setFieldCorrections(prev => {
      const next = {
        ...prev
      };
      delete next[key];
      return next;
    });
  };
  const toggleFlag = flagType => {
    setDisputedFlags(prev => prev.includes(flagType) ? prev.filter(f => f !== flagType) : [...prev, flagType]);
  };
  const handleSubmit = async () => {
    if (isPositive === null) {
      setError('Please select thumbs up or thumbs down.');
      return;
    }
    if (taskType === 'ANOMALY' && !isPositive && disputedFlags.length === 0) {
      setError('Please select which flags you are disputing.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const finalComment = selectedReason && selectedReason !== 'Other' ? comment ? `${selectedReason}. ${comment}` : selectedReason : comment;
      await window.TijoriAPI.FeedbackAPI.submit({
        task_type: taskType,
        expense_id: expenseId || null,
        vendor_name: vendorName || '',
        is_positive: isPositive,
        comment: finalComment,
        field_corrections: taskType === 'OCR' && Object.keys(fieldCorrections).length > 0 ? fieldCorrections : null,
        disputed_flags: taskType === 'ANOMALY' && disputedFlags.length > 0 ? disputedFlags : null
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
    position: 'fixed',
    inset: 0,
    background: 'rgba(15,23,42,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999
  };
  const card = {
    background: 'white',
    borderRadius: '20px',
    padding: '32px',
    width: '480px',
    maxWidth: '95vw',
    maxHeight: '85vh',
    overflowY: 'auto',
    boxShadow: '0 24px 80px rgba(0,0,0,0.2)',
    fontFamily: "'Plus Jakarta Sans', sans-serif"
  };
  const label = {
    fontSize: '11px',
    fontWeight: 700,
    color: '#64748B',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    marginBottom: '8px',
    display: 'block'
  };
  const input = {
    width: '100%',
    border: '1px solid #E2E8F0',
    borderRadius: '10px',
    padding: '10px 12px',
    fontSize: '13px',
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box'
  };
  const taskLabel = {
    OCR: 'OCR Extraction',
    ANOMALY: 'Anomaly Detection',
    FORECAST: 'Cash Flow Forecast'
  }[taskType] || taskType;
  if (submitted) {
    return /*#__PURE__*/React.createElement("div", {
      style: overlay
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        ...card,
        textAlign: 'center',
        padding: '48px 32px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '40px',
        marginBottom: '16px'
      }
    }, "\u2713"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 700,
        fontSize: '18px',
        color: '#10B981'
      }
    }, "Feedback saved!"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '13px',
        color: '#64748B',
        marginTop: '8px'
      }
    }, "The AI will use this to improve future predictions.")));
  }
  return /*#__PURE__*/React.createElement("div", {
    style: overlay,
    onClick: e => {
      if (e.target === e.currentTarget) onClose();
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: card
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '24px'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 800,
      fontSize: '20px',
      color: '#0F172A',
      letterSpacing: '-0.5px'
    }
  }, "AI Feedback"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      color: '#64748B',
      marginTop: '4px'
    }
  }, taskLabel, vendorName ? ` · ${vendorName}` : '')), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    style: {
      background: 'none',
      border: 'none',
      fontSize: '18px',
      color: '#94A3B8',
      cursor: 'pointer',
      padding: '4px'
    }
  }, "\u2715")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: '24px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: label
  }, "Was this AI output helpful?"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '12px'
    }
  }, [{
    val: true,
    icon: '👍',
    text: 'Yes, correct'
  }, {
    val: false,
    icon: '👎',
    text: 'No, incorrect'
  }].map(({
    val,
    icon,
    text
  }) => /*#__PURE__*/React.createElement("button", {
    key: String(val),
    onClick: () => setIsPositive(val),
    style: {
      flex: 1,
      padding: '12px',
      borderRadius: '12px',
      border: '2px solid',
      borderColor: isPositive === val ? val ? '#10B981' : '#EF4444' : '#E2E8F0',
      background: isPositive === val ? val ? '#ECFDF5' : '#FEF2F2' : 'white',
      cursor: 'pointer',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '4px',
      fontFamily: 'inherit'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '20px'
    }
  }, icon), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '12px',
      fontWeight: 600,
      color: '#0F172A'
    }
  }, text))))), taskType === 'OCR' && isPositive === false && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: '24px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: label
  }, "Which fields were extracted incorrectly?"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '8px',
      marginBottom: '8px'
    }
  }, /*#__PURE__*/React.createElement("select", {
    value: selectedField,
    onChange: e => setSelectedField(e.target.value),
    style: {
      ...input,
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Select field\u2026"), OCR_FIELDS.map(f => /*#__PURE__*/React.createElement("option", {
    key: f.key,
    value: f.key
  }, f.label))), /*#__PURE__*/React.createElement("input", {
    placeholder: "Correct value",
    value: correctionValue,
    onChange: e => setCorrectionValue(e.target.value),
    onKeyDown: e => {
      if (e.key === 'Enter') addCorrection();
    },
    style: {
      ...input,
      flex: 1.5
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: addCorrection,
    style: {
      padding: '10px 14px',
      background: '#0F172A',
      color: 'white',
      border: 'none',
      borderRadius: '10px',
      cursor: 'pointer',
      fontWeight: 600,
      fontSize: '13px'
    }
  }, "Add")), Object.keys(fieldCorrections).length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#F8FAFC',
      borderRadius: '10px',
      padding: '12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px'
    }
  }, Object.entries(fieldCorrections).map(([k, v]) => /*#__PURE__*/React.createElement("div", {
    key: k,
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontSize: '12px'
    }
  }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("strong", null, OCR_FIELDS.find(f => f.key === k)?.label || k, ":"), " ", v), /*#__PURE__*/React.createElement("button", {
    onClick: () => removeCorrection(k),
    style: {
      background: 'none',
      border: 'none',
      color: '#EF4444',
      cursor: 'pointer',
      fontSize: '14px'
    }
  }, "\u2715"))))), taskType === 'ANOMALY' && isPositive === false && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: '24px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: label
  }, "Which flags are incorrect? (select all that apply)"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      marginBottom: '12px'
    }
  }, anomalyFlags.map(flag => {
    const flagType = typeof flag === 'string' ? flag : flag.type;
    const flagMsg = typeof flag === 'string' ? flag : flag.message || flag.type;
    const checked = disputedFlags.includes(flagType);
    return /*#__PURE__*/React.createElement("label", {
      key: flagType,
      style: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        padding: '10px 12px',
        background: checked ? '#FEF2F2' : '#F8FAFC',
        borderRadius: '10px',
        cursor: 'pointer',
        border: `1px solid ${checked ? '#FECACA' : '#E2E8F0'}`
      }
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: checked,
      onChange: () => toggleFlag(flagType),
      style: {
        marginTop: '2px'
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: '12px',
        color: '#0F172A',
        lineHeight: 1.4
      }
    }, flagMsg));
  }), anomalyFlags.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      color: '#94A3B8',
      padding: '8px'
    }
  }, "No specific flags to dispute.")), /*#__PURE__*/React.createElement("span", {
    style: label
  }, "Reason"), /*#__PURE__*/React.createElement("select", {
    value: selectedReason,
    onChange: e => setSelectedReason(e.target.value),
    style: {
      ...input,
      marginBottom: '8px'
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Select a reason\u2026"), ANOMALY_REASONS.map(r => /*#__PURE__*/React.createElement("option", {
    key: r,
    value: r
  }, r)))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: '24px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: label
  }, "Additional comment (optional)"), /*#__PURE__*/React.createElement("textarea", {
    value: comment,
    onChange: e => setComment(e.target.value),
    placeholder: "Add any context that will help the AI improve\u2026",
    rows: 3,
    style: {
      ...input,
      resize: 'vertical',
      lineHeight: 1.5
    }
  })), error && /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#FEF2F2',
      border: '1px solid #FECACA',
      borderRadius: '10px',
      padding: '10px 14px',
      fontSize: '12px',
      color: '#DC2626',
      marginBottom: '16px'
    }
  }, error), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '10px'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    style: {
      flex: 1,
      padding: '12px',
      borderRadius: '12px',
      border: '1px solid #E2E8F0',
      background: 'white',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: 600,
      fontFamily: 'inherit',
      color: '#64748B'
    }
  }, "Cancel"), /*#__PURE__*/React.createElement("button", {
    onClick: handleSubmit,
    disabled: submitting,
    style: {
      flex: 2,
      padding: '12px',
      borderRadius: '12px',
      border: 'none',
      background: submitting ? '#94A3B8' : '#0F172A',
      color: 'white',
      cursor: submitting ? 'not-allowed' : 'pointer',
      fontSize: '13px',
      fontWeight: 700,
      fontFamily: 'inherit'
    }
  }, submitting ? 'Saving…' : 'Submit Feedback'))));
};