import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../Layout/ThemeContext';
import { tokens, fonts } from '../../theme';
import { BankTransferIcon, MobileBankingIcon, GooglePayIcon } from '../../Icons';
import BillDetail from './BillDetail';
import AddMethodModal from './AddMethodModal';

// ── Icons ─────────────────────────────────────────────────────────────────────
const TrashIcon   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const StarIcon    = ({ filled }) => <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const PlusIcon    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>;
const CheckIcon   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;

// ── Method type config ────────────────────────────────────────────────────────
const METHOD_TYPES = {
  bank: {
    label: 'Bank Transfer',
    icon:  BankTransferIcon,
    grad:  'linear-gradient(135deg,#3B6FFF,#2952D9)',
    glow:  'rgba(59,111,255,0.3)',
    providers: ['BRAC Bank','Dutch-Bangla Bank','City Bank','Islami Bank','Eastern Bank','Standard Chartered'],
  },
  mobile_banking: {
    label: 'Mobile Banking',
    icon:  MobileBankingIcon,
    grad:  'linear-gradient(135deg,#E91E8C,#FF5C8A)',
    glow:  'rgba(233,30,140,0.3)',
    providers: ['bKash','Nagad','Rocket','SureCash','Upay'],
  },
  google_pay: {
    label: 'Google Pay',
    icon:  GooglePayIcon,
    grad:  'linear-gradient(135deg,#4285F4,#34A853)',
    glow:  'rgba(66,133,244,0.3)',
    providers: [],
  },
};

// ── Method label helper ───────────────────────────────────────────────────────
const methodSubtitle = (m) => {
  if (m.bank_name)            return `${m.bank_name} ···· ${m.account_num?.slice(-4)}`;
  if (m.provider_name)        return `${m.provider_name} · ${m.mb_phone}`;
  if (m.email) return m.email;
  return '';
};

// ── Method Card ───────────────────────────────────────────────────────────────
const MethodCard = ({ method, onDelete, onSetDefault, t, isDark }) => {
  const cfg  = METHOD_TYPES[method.method_name] || METHOD_TYPES.bank;
  const Icon = cfg.icon;
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div style={{ background: t.bgCard, border: `1px solid ${method.is_default ? t.primary : t.border}`, borderRadius: 14, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, position: 'relative', overflow: 'hidden', transition: 'border-color 0.2s' }}>
      {/* Glow blob */}
      <div style={{ position: 'absolute', top: -20, right: -20, width: 70, height: 70, borderRadius: '50%', background: cfg.grad, opacity: 0.08, filter: 'blur(16px)', pointerEvents: 'none' }} />

      {/* Icon */}
      <div style={{ width: 42, height: 42, borderRadius: 12, background: cfg.grad, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 12px ${cfg.glow}`, flexShrink: 0, color: '#fff' }}>
        <Icon />
      </div>

      {/* Details */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{cfg.label}</div>
          {method.is_default && (
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 100, background: isDark ? 'rgba(59,111,255,0.15)' : '#EEF2FF', color: t.primary, fontFamily: fonts.mono }}>
              Default
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, color: t.textSub, marginTop: 2, fontFamily: fonts.mono }}>{methodSubtitle(method)}</div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        {!method.is_default && (
          <button onClick={() => onSetDefault(method.method_id)} title="Set as default"
            style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${t.border}`, background: 'transparent', color: t.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#F5A623'; e.currentTarget.style.color = '#F5A623'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = t.textMuted; }}
          >
            <StarIcon filled={false} />
          </button>
        )}
        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)} title="Delete"
            style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${t.border}`, background: 'transparent', color: t.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#EF4444'; e.currentTarget.style.color = '#EF4444'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = t.textMuted; }}
          >
            <TrashIcon />
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 5 }}>
            <button onClick={() => onDelete(method.method_id)}
              style={{ fontSize: 11, padding: '4px 10px', borderRadius: 7, border: 'none', background: '#EF4444', color: '#fff', cursor: 'pointer', fontFamily: fonts.ui, fontWeight: 600 }}>
              Confirm
            </button>
            <button onClick={() => setConfirmDelete(false)}
              style={{ fontSize: 11, padding: '4px 10px', borderRadius: 7, border: `1px solid ${t.border}`, background: 'transparent', color: t.textSub, cursor: 'pointer', fontFamily: fonts.ui }}>
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// AddMethodModal extracted to ./AddMethodModal

// ── Payment History Row ───────────────────────────────────────────────────────
const HistoryRow = ({ p, t, onOpenBill }) => {
  const cfg  = METHOD_TYPES[p.method_name] || METHOD_TYPES.bank;
  const Icon = cfg.icon;

  const billId = p.bill_document_id;
  const isClickable = Boolean(billId);

  return (
    <button
      onClick={() => isClickable && onOpenBill(billId)}
      disabled={!isClickable}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '13px 0',
        border: 'none',
        borderBottom: `1px solid ${t.border}`,
        background: 'transparent',
        textAlign: 'left',
        cursor: isClickable ? 'pointer' : 'default',
      }}
    >
      <div style={{ width: 34, height: 34, borderRadius: 10, background: cfg.grad, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 2px 8px ${cfg.glow}`, flexShrink: 0, color: '#fff' }}>
        <Icon />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: t.text, textTransform: 'capitalize' }}>{p.utility_name} Bill</div>
        <div style={{ fontSize: 11, color: t.textSub, fontFamily: fonts.mono }}>{cfg.label} · {methodSubtitle(p)}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>৳ {parseFloat(p.payment_amount).toLocaleString()}</div>
        <div style={{ fontSize: 11, color: t.textMuted, fontFamily: fonts.mono }}>{new Date(p.payment_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
      </div>
    </button>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────────
const Payments = () => {
  const { authFetch } = useAuth();
  const { isDark }    = useTheme();
  const t = tokens[isDark ? 'dark' : 'light'];

  const [methods, setMethods]   = useState([]);
  const [history, setHistory]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showAdd, setShowAdd]   = useState(false);
  const [tab, setTab]           = useState('methods'); // 'methods' | 'history'
  const [toast, setToast]       = useState('');
  const [detailBillId, setDetailBillId] = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [mRes, hRes] = await Promise.all([
        authFetch('/api/consumer/payment-methods'),
        authFetch('/api/consumer/payment-history'),
      ]);
      const [mData, hData] = await Promise.all([mRes.json(), hRes.json()]);
      setMethods(Array.isArray(mData) ? mData : []);
      setHistory(Array.isArray(hData) ? hData : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [authFetch]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleDelete = async (id) => {
    try {
      const res = await authFetch(`/api/consumer/payment-methods/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setMethods(m => m.filter(x => x.method_id !== id));
      showToast('Payment method removed');
    } catch { showToast('Failed to delete'); }
  };

  const handleSetDefault = async (id) => {
    try {
      const res = await authFetch(`/api/consumer/payment-methods/${id}/default`, { method: 'PUT' });
      if (!res.ok) throw new Error();
      setMethods(m => m.map(x => ({ ...x, is_default: x.method_id === id })));
      showToast('Default method updated');
    } catch { showToast('Failed to update default'); }
  };

  const handleOpenBill = (billId) => {
    setDetailBillId(billId);
  };

  const totalSpent = history.reduce((s, p) => s + parseFloat(p.payment_amount || 0), 0);

  return (
    <div style={{ fontFamily: fonts.ui, maxWidth: 700 }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 80, right: 24, zIndex: 300, padding: '12px 20px', borderRadius: 12, background: isDark ? '#0D2E1A' : '#DCFCE7', border: `1px solid ${isDark ? '#4ADE8033' : '#86EFAC'}`, color: isDark ? '#4ADE80' : '#16A34A', fontSize: 13, fontWeight: 500, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
          ✓ {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 11, color: t.primary, fontFamily: fonts.mono, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>Billing</div>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: t.text, letterSpacing: '-0.4px', marginBottom: 4 }}>Payments</h1>
          <p style={{ fontSize: 14, color: t.textSub }}>Manage payment methods and view transaction history</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 20px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#3B6FFF,#2952D9)', color: '#fff', fontSize: 14, fontWeight: 600, fontFamily: fonts.ui, cursor: 'pointer', boxShadow: '0 4px 16px rgba(59,111,255,0.3)', whiteSpace: 'nowrap' }}>
          <PlusIcon /> Add Method
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 22 }}>
        {[
          { label: 'Saved Methods', val: methods.length,                   grad: 'linear-gradient(135deg,#3B6FFF,#00C4FF)' },
          { label: 'Total Payments', val: history.length,                  grad: 'linear-gradient(135deg,#22C55E,#16A34A)' },
          { label: 'Total Spent',   val: `৳${totalSpent.toLocaleString()}`, grad: 'linear-gradient(135deg,#F5A623,#FF6B00)' },
        ].map(c => (
          <div key={c.label} style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 13, padding: '14px 16px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -16, right: -16, width: 60, height: 60, borderRadius: '50%', background: c.grad, opacity: 0.1, filter: 'blur(12px)' }} />
            <div style={{ fontSize: 22, fontWeight: 700, color: t.text, letterSpacing: '-0.4px', marginBottom: 2 }}>{c.val}</div>
            <div style={{ fontSize: 12, color: t.textSub }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 18, background: isDark ? '#0D1525' : '#F1F5FF', borderRadius: 12, padding: 4 }}>
        {[['methods','Saved Methods'],['history','Payment History']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            style={{ flex: 1, padding: '9px', borderRadius: 9, border: 'none', background: tab === key ? (isDark ? '#1A2A45' : '#fff') : 'transparent', color: tab === key ? t.text : t.textMuted, fontSize: 13, fontWeight: tab === key ? 600 : 400, fontFamily: fonts.ui, cursor: 'pointer', boxShadow: tab === key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s' }}>
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3].map(i => <div key={i} style={{ height: 72, borderRadius: 14, background: t.bgCard, border: `1px solid ${t.border}`, animation: 'pulse 1.5s infinite' }} />)}
          <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
        </div>
      ) : tab === 'methods' ? (
        methods.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '52px 0', color: t.textMuted }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>💳</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: t.textSub, marginBottom: 6 }}>No payment methods saved</div>
            <div style={{ fontSize: 13, marginBottom: 20 }}>Add a method to pay bills faster</div>
            <button onClick={() => setShowAdd(true)}
              style={{ padding: '10px 22px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#3B6FFF,#2952D9)', color: '#fff', fontSize: 13, fontWeight: 600, fontFamily: fonts.ui, cursor: 'pointer' }}>
              Add First Method
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {methods.map(m => (
              <MethodCard key={m.method_id} method={m} onDelete={handleDelete} onSetDefault={handleSetDefault} t={t} isDark={isDark} />
            ))}
          </div>
        )
      ) : (
        history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '52px 0', color: t.textMuted, fontSize: 13 }}>No payment history yet</div>
        ) : (
          <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16, padding: '4px 20px' }}>
            {history.map((p, i) => <HistoryRow key={i} p={p} t={t} onOpenBill={handleOpenBill} />)}
          </div>
        )
      )}

      {showAdd && <AddMethodModal onClose={() => setShowAdd(false)} onAdded={fetchAll} t={t} isDark={isDark} authFetch={authFetch} />}
      {detailBillId && <BillDetail billId={detailBillId} onClose={() => setDetailBillId(null)} />}
    </div>
  );
};

export default Payments;