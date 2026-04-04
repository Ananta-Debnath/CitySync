import React, { useState, useEffect } from 'react';
import { generateBill } from '../../services/api';
import { fonts } from '../../theme';

const inputStyle = (t) => ({
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: `1px solid ${t.border}`, background: t.bgInputs,
  color: t.text, fontFamily: fonts.ui, fontSize: 13,
  boxSizing: 'border-box'
});

const GenerateBillModal = ({ connections, t, isDark, onClose, onSuccess }) => {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    connection_id: '',
    bill_period_start: '',
    bill_period_end: today,
    due_in_days: 30
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Auto-set due date to 30 days after bill_period_end
  useEffect(() => {
    if (form.bill_period_end && !form.due_in_days) {
      setForm(f => ({ ...f, due_in_days: 30 }));
    }
  }, [form.bill_period_end]);

  const handleGenerate = async () => {
    if (!form.connection_id || !form.bill_period_start || !form.bill_period_end || form.due_in_days == null)
      return setError('All fields are required');
    setError('');
    setLoading(true);
    try {
      // compute due_date from bill_period_end + due_in_days for API compatibility
      const dueDate = (() => {
        const d = new Date(form.bill_period_end);
        d.setDate(d.getDate() + Number(form.due_in_days || 0));
        return d.toISOString().split('T')[0];
      })();

      const payload = { ...form, due_date: dueDate };

      const res = await generateBill(payload);
      setResult(res.data);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate bill');
    } finally {
      setLoading(false);
    }
  };

  // Postpaid connections only
  const postpaidConnections = connections.filter(c => c.payment_type?.toLowerCase() === 'postpaid');

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: t.bgCard, borderRadius: 16, padding: 28, width: 520, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', border: `1px solid ${t.border}` }}>
        {!result ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, color: t.text, fontSize: 17 }}>Generate Postpaid Bill</h3>
              <button onClick={onClose} style={{ background: 'none', border: 'none', color: t.textSub, cursor: 'pointer', fontSize: 20 }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: t.textSub, marginBottom: 5, fontWeight: 600 }}>Connection (Postpaid only)</label>
                <select
                  value={form.connection_id}
                  onChange={e => setForm({ ...form, connection_id: e.target.value })}
                  style={{ ...inputStyle(t), padding: '9px 10px' }}
                >
                  <option value="">Select connection...</option>
                  {postpaidConnections.map(c => (
                    <option key={c.connection_id} value={c.connection_id}>
                      #{c.connection_id} — {c.first_name} {c.last_name} · {c.utility_name} ({c.address})
                    </option>
                  ))}
                </select>
                {postpaidConnections.length === 0 && (
                  <div style={{ fontSize: 12, color: '#F87171', marginTop: 4 }}>No postpaid connections found</div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: t.textSub, marginBottom: 5, fontWeight: 600 }}>Bill Period Start</label>
                  <input type="date" value={form.bill_period_start} onChange={e => setForm({ ...form, bill_period_start: e.target.value })} style={inputStyle(t)} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: t.textSub, marginBottom: 5, fontWeight: 600 }}>Bill Period End</label>
                  <input type="date" value={form.bill_period_end} onChange={e => setForm({ ...form, bill_period_end: e.target.value })} style={inputStyle(t)} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, color: t.textSub, marginBottom: 5, fontWeight: 600 }}>Due In (days)</label>
                <input
                  type="number"
                  min="0"
                  value={form.due_in_days}
                  onChange={e => setForm({ ...form, due_in_days: e.target.value ? Number(e.target.value) : '' })}
                  style={inputStyle(t)}
                />
                <div style={{ fontSize: 11, color: t.textSub, marginTop: 3 }}>Number of days after period end</div>
              </div>

              {error && <div style={{ padding: '10px 14px', background: isDark ? '#2D0C0C' : '#FEE2E2', borderRadius: 8, fontSize: 13, color: isDark ? '#F87171' : '#B91C1C' }}>{error}</div>}

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  style={{ flex: 1, padding: '11px', background: loading ? t.border : '#3B6FFF', color: 'white', border: 'none', borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 14 }}
                >
                  {loading ? 'Generating...' : 'Generate Bill'}
                </button>
                <button onClick={onClose} style={{ padding: '11px 20px', background: 'transparent', color: t.textSub, border: `1px solid ${t.border}`, borderRadius: 8, cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </div>
          </>
        ) : (
          // Success screen
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <h3 style={{ color: t.text, marginBottom: 8 }}>Bill Generated</h3>
            {/* <div style={{ background: t.bgInputs, borderRadius: 12, padding: 20, textAlign: 'left', marginBottom: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  ['Bill ID', `#${result.bill_document_id}`],
                  ['Units Consumed', `${result.unit_consumed}`],
                  ['Energy Amount', `$${parseFloat(result.energy_amount).toFixed(2)}`],
                  ['Fixed Charges', `$${parseFloat(result.fixed_charges).toFixed(2)}`],
                  ['Total Amount', `$${parseFloat(result.total_amount).toFixed(2)}`],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div style={{ fontSize: 11, color: t.textSub, fontWeight: 600 }}>{label}</div>
                    <div style={{ fontSize: 16, color: label === 'Total Amount' ? '#10B981' : t.text, fontWeight: label === 'Total Amount' ? 700 : 500 }}>{value}</div>
                  </div>
                ))}
              </div>
            </div> */}
            <button onClick={onClose} style={{ width: '100%', padding: '11px', background: '#10B981', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GenerateBillModal;
