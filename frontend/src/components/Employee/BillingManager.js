import React, { useState, useEffect } from 'react';
import { getConnections, getBills, updateBillStatus } from '../../services/api';
import { useTheme } from '../Layout/ThemeContext';
import { tokens, fonts } from '../../theme';
import GenerateBillModal from './GenerateBillModal';

const BillStatusBadge = ({ status, isDark }) => {
  const cfg = {
    UNPAID: { bg: isDark ? '#422006' : '#FEF3C7', c: isDark ? '#FBBF24' : '#D97706' },
    PAID:   { bg: isDark ? '#0D2E1A' : '#DCFCE7', c: isDark ? '#4ADE80' : '#16A34A' },
    OVERDUE:{ bg: isDark ? '#2D0C0C' : '#FEE2E2', c: isDark ? '#F87171' : '#B91C1C' }
  }[status] || { bg: '#eee', c: '#333' };
  return (
    <span style={{ padding: '4px 8px', borderRadius: 100, fontSize: 12, fontWeight: 500, background: cfg.bg, color: cfg.c }}>
      {status}
    </span>
  );
};

// ── Main Component ───────────────────────────────────────────────────────────
const BillingManager = () => {
  const { isDark } = useTheme();
  const t = tokens[isDark ? 'dark' : 'light'];

  const [bills, setBills] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');

  const load = async () => {
    try {
      const [br, cr] = await Promise.all([getBills(), getConnections()]);
      setBills(br.data.data || []);
      setConnections(cr.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleMarkPaid = async (id) => {
    try {
      await updateBillStatus(id, 'PAID');
      load();
    } catch { alert('Failed to update bill status'); }
  };

  const filtered = filterStatus === 'ALL' ? bills : bills.filter(b => b.bill_status === filterStatus);

  const summary = {
    total: bills.length,
    unpaid: bills.filter(b => b.bill_status === 'UNPAID').length,
    paid: bills.filter(b => b.bill_status === 'PAID').length,
    revenue: bills.filter(b => b.bill_status === 'PAID').reduce((s, b) => s + parseFloat(b.total_amount), 0)
  };

  if (loading) return <div style={{ color: t.text }}>Loading billing data...</div>;

  return (
    <div style={{ fontFamily: fonts.ui }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ color: t.text, margin: 0 }}>Billing Manager</h2>
        <button
          onClick={() => setShowModal(true)}
          style={{ padding: '10px 18px', background: '#3B6FFF', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
        >
          + Generate Bill
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total Bills',  value: summary.total,             color: '#3B6FFF' },
          { label: 'Unpaid',       value: summary.unpaid,            color: '#F59E0B' },
          { label: 'Paid',         value: summary.paid,              color: '#10B981' },
          { label: 'Revenue (Paid)', value: `$${summary.revenue.toFixed(2)}`, color: '#10B981' }
        ].map(card => (
          <div key={card.label} style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, padding: 18 }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: card.color }}>{card.value}</div>
            <div style={{ fontSize: 12, color: t.textSub, marginTop: 4 }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['ALL', 'UNPAID', 'PAID'].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            style={{
              padding: '7px 16px', borderRadius: 8, border: `1px solid ${t.border}`,
              background: filterStatus === s ? '#3B6FFF' : 'transparent',
              color: filterStatus === s ? 'white' : t.textSub,
              cursor: 'pointer', fontSize: 13, fontWeight: 500
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Bills table */}
      <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ background: isDark ? '#1F2937' : '#F3F4F6' }}>
            <tr>
              {['Bill ID', 'Consumer', 'Utility', 'Period', 'Units', 'Energy', 'Total', 'Due Date', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ padding: '11px 12px', borderBottom: `1px solid ${t.border}`, color: t.textSub, fontSize: 12, fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(b => (
              <tr key={b.bill_document_id} style={{ transition: 'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = isDark ? '#1a1d24' : '#f8f9fa'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{ padding: '11px 12px', borderBottom: `1px solid ${t.border}`, color: t.text, fontSize: 13, fontWeight: 500 }}>
                  #{b.bill_document_id}
                </td>
                <td style={{ padding: '11px 12px', borderBottom: `1px solid ${t.border}`, color: t.text, fontSize: 13 }}>
                  {b.first_name} {b.last_name}
                </td>
                <td style={{ padding: '11px 12px', borderBottom: `1px solid ${t.border}`, color: t.text, fontSize: 13 }}>
                  {b.utility_name || '—'}
                </td>
                <td style={{ padding: '11px 12px', borderBottom: `1px solid ${t.border}`, fontSize: 12, color: t.textSub }}>
                  {b.bill_period_start ? (
                    <>
                      <div>{new Date(b.bill_period_start).toLocaleDateString()}</div>
                      <div>→ {new Date(b.bill_period_end).toLocaleDateString()}</div>
                    </>
                  ) : '—'}
                </td>
                <td style={{ padding: '11px 12px', borderBottom: `1px solid ${t.border}`, color: t.text, fontSize: 13 }}>
                  {parseFloat(b.unit_consumed).toFixed(2)}
                </td>
                <td style={{ padding: '11px 12px', borderBottom: `1px solid ${t.border}`, color: t.text, fontSize: 13 }}>
                  ${parseFloat(b.energy_amount).toFixed(2)}
                </td>
                <td style={{ padding: '11px 12px', borderBottom: `1px solid ${t.border}`, color: t.text, fontSize: 13, fontWeight: 600 }}>
                  ${parseFloat(b.total_amount).toFixed(2)}
                </td>
                <td style={{ padding: '11px 12px', borderBottom: `1px solid ${t.border}`, fontSize: 12, color: b.due_date && new Date(b.due_date) < new Date() && b.bill_status !== 'PAID' ? '#F87171' : t.textSub }}>
                  {b.due_date ? new Date(b.due_date).toLocaleDateString() : '—'}
                </td>
                <td style={{ padding: '11px 12px', borderBottom: `1px solid ${t.border}` }}>
                  <BillStatusBadge status={b.bill_status} isDark={isDark} />
                </td>
                <td style={{ padding: '11px 12px', borderBottom: `1px solid ${t.border}` }}>
                  {b.bill_status === 'UNPAID' && (
                    <button
                      onClick={() => handleMarkPaid(b.bill_document_id)}
                      style={{ padding: '5px 10px', background: '#10B981', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 500 }}
                    >
                      Mark Paid
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan="10" style={{ padding: 30, textAlign: 'center', color: t.textSub }}>
                  No bills found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <GenerateBillModal
          connections={connections}
          t={t}
          isDark={isDark}
          onClose={() => setShowModal(false)}
          onSuccess={load}
        />
      )}
    </div>
  );
};

export default BillingManager;