import React, { useState, useEffect, useCallback } from 'react';
import {
  getTariffs, createTariff, deactivateTariff,
  getTariffSlabs, createTariffSlab, deleteTariffSlab,
  getFixedCharges, createFixedCharge, deleteFixedCharge,
  getUtilities
} from '../../services/api';

// ── Slab Panel ───────────────────────────────────────────────────────────────
const SlabPanel = ({ tariff }) => {
  const [slabs, setSlabs] = useState([]);
  const [newSlab, setNewSlab] = useState({ charge_type: 'FLAT', unit_from: '', unit_to: '', rate_per_unit: '' });

  const load = useCallback(async () => {
    try {
      const res = await getTariffSlabs(tariff.tariff_id);
      setSlabs(res.data.data || []);
    } catch { /* silent */ }
  }, [tariff.tariff_id]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!newSlab.unit_from || !newSlab.rate_per_unit) return alert('unit_from and rate_per_unit are required');
    try {
      await createTariffSlab(tariff.tariff_id, newSlab);
      setNewSlab({ charge_type: 'FLAT', unit_from: '', unit_to: '', rate_per_unit: '' });
      load();
    } catch { alert('Failed to add slab'); }
  };

  const handleDelete = async (slab_num) => {
    if (!window.confirm('Delete this slab?')) return;
    try {
      await deleteTariffSlab(tariff.tariff_id, slab_num);
      load();
    } catch (e) { alert(e.response?.data?.error || 'Cannot delete slab'); }
  };

  const inputCls = 'px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-txt placeholder:text-sub focus:border-elec/40 transition-all font-outfit text-xs w-full';
  const selectCls = 'px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-txt focus:border-elec/40 transition-all font-outfit text-xs w-full';

  return (
    <div className="mt-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-sub mb-2">Rate Slabs</div>
      <div className="bg-white/[0.02] border border-white/[0.07] rounded-xl overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[40px_80px_1fr_1fr_1fr_auto] gap-2 px-3 py-2 bg-white/[0.03] border-b border-white/[0.07]">
          {['#', 'Type', 'From', 'To', 'Rate/Unit', ''].map((h, i) => (
            <div key={i} className="font-mono text-[9px] uppercase tracking-[0.1em] text-sub">{h}</div>
          ))}
        </div>
        {slabs.map(s => (
          <div key={s.slab_num} className="grid grid-cols-[40px_80px_1fr_1fr_1fr_auto] gap-2 px-3 py-2 border-b border-white/[0.05] items-center">
            <div className="font-mono text-xs text-sub">#{s.slab_num}</div>
            <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 font-mono text-[10px] text-sub w-fit">{s.charge_type}</span>
            <div className="font-outfit text-xs text-txt">{s.unit_from}</div>
            <div className="font-outfit text-xs text-txt">{s.unit_to ?? '∞'}</div>
            <div className="font-outfit text-xs text-txt font-semibold">{parseFloat(s.rate_per_unit).toFixed(4)}</div>
            <button
              onClick={() => handleDelete(s.slab_num)}
              className="px-2 py-1 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/20 transition-all font-outfit text-xs"
            >✕</button>
          </div>
        ))}
        {slabs.length === 0 && (
          <div className="px-3 py-3 font-outfit text-xs text-sub">No slabs yet</div>
        )}
        {/* Add row */}
        <div className="grid grid-cols-[40px_80px_1fr_1fr_1fr_auto] gap-2 px-3 py-2 bg-white/[0.02] items-center">
          <div className="font-mono text-[10px] text-sub">New</div>
          <select value={newSlab.charge_type} onChange={e => setNewSlab({ ...newSlab, charge_type: e.target.value })} className={selectCls}>
            {['FLAT', 'PEAK', 'OFF-PEAK'].map(o => <option key={o}>{o}</option>)}
          </select>
          <input type="number" placeholder="From" value={newSlab.unit_from} onChange={e => setNewSlab({ ...newSlab, unit_from: e.target.value })} className={inputCls} />
          <input type="number" placeholder="To (∞)" value={newSlab.unit_to} onChange={e => setNewSlab({ ...newSlab, unit_to: e.target.value })} className={inputCls} />
          <input type="number" step="0.0001" placeholder="Rate" value={newSlab.rate_per_unit} onChange={e => setNewSlab({ ...newSlab, rate_per_unit: e.target.value })} className={inputCls} />
          <button onClick={handleAdd} className="px-2 py-1 bg-elec/10 border border-elec/40 text-elec rounded-lg hover:bg-elec/20 transition-all font-outfit text-xs whitespace-nowrap">+ Add</button>
        </div>
      </div>
    </div>
  );
};

// ── Fixed Charges Panel ──────────────────────────────────────────────────────
const FixedChargesPanel = ({ tariff }) => {
  const [charges, setCharges] = useState([]);
  const [form, setForm] = useState({ charge_name: '', charge_amount: '', charge_frequency: 'Monthly', is_mandatory: true });

  const load = useCallback(async () => {
    try {
      const res = await getFixedCharges(tariff.tariff_id);
      setCharges(res.data.data || []);
    } catch { /* silent */ }
  }, [tariff.tariff_id]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!form.charge_amount || !form.charge_frequency) return alert('Amount and frequency are required');
    try {
      await createFixedCharge(tariff.tariff_id, form);
      setForm({ charge_name: '', charge_amount: '', charge_frequency: 'Monthly', is_mandatory: true });
      load();
    } catch { alert('Failed to add charge'); }
  };

  const handleDelete = async (fc_id) => {
    if (!window.confirm('Delete this charge?')) return;
    try {
      await deleteFixedCharge(tariff.tariff_id, fc_id);
      load();
    } catch (e) { alert(e.response?.data?.error || 'Cannot delete'); }
  };

  const inputCls = 'px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-txt placeholder:text-sub focus:border-elec/40 transition-all font-outfit text-xs w-full';
  const selectCls = 'px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-txt focus:border-elec/40 transition-all font-outfit text-xs w-full';

  return (
    <div className="mt-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-sub mb-2">Fixed Charges</div>
      <div className="bg-white/[0.02] border border-white/[0.07] rounded-xl overflow-hidden">
        {charges.map(fc => (
          <div key={fc.fixed_charge_id} className="flex items-center gap-3 px-3 py-2.5 border-b border-white/[0.05]">
            <div className="flex-1">
              <div className="font-outfit text-xs font-medium text-txt">{fc.charge_name || 'Unnamed Charge'}</div>
              <div className="font-outfit text-[10px] text-sub">{fc.charge_frequency} · {fc.is_mandatory ? 'Mandatory' : 'Optional'}</div>
            </div>
            <div className="font-mono text-sm text-txt">৳{parseFloat(fc.charge_amount).toFixed(2)}</div>
            <button
              onClick={() => handleDelete(fc.fixed_charge_id)}
              className="px-2 py-1 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/20 transition-all font-outfit text-xs"
            >Remove</button>
          </div>
        ))}
        {charges.length === 0 && (
          <div className="px-3 py-3 font-outfit text-xs text-sub">No fixed charges yet</div>
        )}
        {/* Add row */}
        <div className="grid grid-cols-[1fr_100px_120px_auto_auto] gap-2 px-3 py-2 bg-white/[0.02] items-center">
          <input placeholder="Name (e.g. Service Fee)" value={form.charge_name} onChange={e => setForm({ ...form, charge_name: e.target.value })} className={inputCls} />
          <input type="number" step="0.01" placeholder="Amount" value={form.charge_amount} onChange={e => setForm({ ...form, charge_amount: e.target.value })} className={inputCls} />
          <select value={form.charge_frequency} onChange={e => setForm({ ...form, charge_frequency: e.target.value })} className={selectCls}>
            {['Monthly', 'Quarterly', 'Annually', 'One-time'].map(f => <option key={f}>{f}</option>)}
          </select>
          <label className="flex items-center gap-1.5 font-outfit text-xs text-sub whitespace-nowrap cursor-pointer">
            <input type="checkbox" checked={form.is_mandatory} onChange={e => setForm({ ...form, is_mandatory: e.target.checked })} className="w-3 h-3" />
            Mandatory
          </label>
          <button onClick={handleAdd} className="px-2 py-1 bg-elec/10 border border-elec/40 text-elec rounded-lg hover:bg-elec/20 transition-all font-outfit text-xs whitespace-nowrap">+ Add</button>
        </div>
      </div>
    </div>
  );
};

// ── Create Tariff Form ────────────────────────────────────────────────────────
const CreateTariffForm = ({ utilities, onSave, onCancel }) => {
  const [form, setForm] = useState({
    tariff_name: '', utility_id: '', consumer_category: 'Residential',
    billing_method: 'Slab', effective_from: '', effective_to: '',
    is_active: true, vat_rate: 5.00, is_vat_exempt: false
  });

  const handleSubmit = async () => {
    if (!form.tariff_name || !form.utility_id || !form.effective_from)
      return alert('Name, utility and effective date are required');
    await onSave(form);
  };

  const labelCls = 'block font-mono text-[10px] uppercase tracking-[0.12em] text-sub mb-2';
  const inputCls = 'w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-txt placeholder:text-sub focus:border-elec/40 focus:bg-white/[0.07] transition-all font-outfit text-sm';
  const selectCls = 'w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-txt focus:border-elec/40 focus:bg-white/[0.07] transition-all font-outfit text-sm';

  return (
    <div className="bg-card border-0.5 border-white/[0.07] rounded-2xl overflow-hidden mb-6">
      <div className="h-[1.5px] bg-elec/45 rounded-t-2xl" />
      <div className="p-5">
        <h3 className="font-outfit text-sm font-semibold text-txt mb-4">New Tariff</h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className={labelCls}>Tariff Name</label>
            <input value={form.tariff_name} onChange={e => setForm({ ...form, tariff_name: e.target.value })} placeholder="e.g. Residential Slab 2025" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Utility</label>
            <select value={form.utility_id} onChange={e => setForm({ ...form, utility_id: e.target.value })} className={selectCls}>
              <option value="">Select utility...</option>
              {utilities.map(u => <option key={u.utility_id} value={u.utility_id}>{u.utility_name} ({u.utility_type})</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Consumer Category</label>
            <select value={form.consumer_category} onChange={e => setForm({ ...form, consumer_category: e.target.value })} className={selectCls}>
              {['Residential', 'Commercial', 'Industrial', 'Agricultural'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Billing Method</label>
            <select value={form.billing_method} onChange={e => setForm({ ...form, billing_method: e.target.value })} className={selectCls}>
              {['Slab', 'Flat Rate', 'Time-of-Use', 'Tiered'].map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Effective From</label>
            <input type="date" value={form.effective_from} onChange={e => setForm({ ...form, effective_from: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Effective To (blank = ongoing)</label>
            <input type="date" value={form.effective_to} onChange={e => setForm({ ...form, effective_to: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>VAT Rate (%)</label>
            <input
              type="number" step="0.01" min="0" max="100"
              placeholder="e.g., 5.00"
              value={form.vat_rate}
              onChange={e => setForm({ ...form, vat_rate: e.target.value })}
              disabled={form.is_vat_exempt}
              className={inputCls + (form.is_vat_exempt ? ' opacity-40 cursor-not-allowed' : '')}
            />
          </div>
          <div className="flex flex-col justify-end gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_vat_exempt}
                onChange={e => setForm({ ...form, is_vat_exempt: e.target.checked, vat_rate: e.target.checked ? 0 : 5.00 })}
                className="w-4 h-4"
              />
              <span className="font-outfit text-sm text-txt">VAT Exempt</span>
            </label>
            <p className="font-outfit text-xs text-sub">Check if exempt from VAT</p>
          </div>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/40 rounded-lg p-3 mb-4">
          <p className="font-outfit text-xs text-blue-300">
            <strong>Suggested rates:</strong> Residential: 5% &nbsp;|&nbsp; Commercial: 15% &nbsp;|&nbsp; Industrial: 15%
          </p>
        </div>

        <div className="flex gap-3">
          <button onClick={handleSubmit} className="px-4 py-2 bg-elec/10 border border-elec/40 text-elec rounded-lg hover:bg-elec/20 transition-all font-outfit text-sm font-medium">
            Create Tariff
          </button>
          <button onClick={onCancel} className="px-4 py-2 bg-white/5 border border-white/10 text-txt rounded-lg hover:border-white/20 transition-all font-outfit text-sm">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ───────────────────────────────────────────────────────────
const TariffsManager = () => {
  const [tariffs, setTariffs] = useState([]);
  const [utilities, setUtilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const load = async () => {
    try {
      const [tr, ut] = await Promise.all([getTariffs(), getUtilities()]);
      setTariffs(tr.data.data || []);
      setUtilities(ut.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (form) => {
    try {
      await createTariff(form);
      setShowCreate(false);
      load();
    } catch { alert('Failed to create tariff'); }
  };

  const handleDeactivate = async (tariff_id, tariff_name) => {
    if (!window.confirm(`Deactivate "${tariff_name}"?\n\nThis cannot be undone. Create a new tariff version to replace it.`)) return;
    try {
      await deactivateTariff(tariff_id);
      load();
    } catch { alert('Failed to deactivate tariff'); }
  };

  if (loading) return (
    <div className="font-outfit text-sub text-sm p-6">Loading tariffs...</div>
  );

  return (
    <div className="font-outfit">
      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <h2 className="font-outfit text-lg font-semibold text-txt">Tariff Configuration</h2>
        {!showCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-elec/10 border border-elec/40 text-elec rounded-lg hover:bg-elec/20 transition-all font-outfit text-sm font-medium"
          >
            + New Tariff
          </button>
        )}
      </div>

      {/* Policy banner */}
      <div className="bg-blue-500/10 border border-blue-500/40 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="text-blue-400 text-lg leading-none mt-0.5">ℹ️</div>
          <div>
            <h4 className="font-outfit text-sm font-semibold text-blue-400 mb-1">Tariff Policy</h4>
            <p className="font-outfit text-xs text-blue-300">
              Existing tariffs cannot be edited to maintain billing integrity.
              To update rates, create a new tariff version and deactivate the old one.
            </p>
          </div>
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <CreateTariffForm
          utilities={utilities}
          onSave={handleCreate}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {/* Tariff list */}
      <div className="flex flex-col gap-3">
        {tariffs.map(tf => {
          const isExpanded = expandedId === tf.tariff_id;
          return (
            <div key={tf.tariff_id} className="bg-card border-0.5 border-white/[0.07] rounded-2xl overflow-hidden">
              <div className="h-[1.5px] bg-elec/45 rounded-t-2xl" />

              {/* Row */}
              <div
                onClick={() => setExpandedId(isExpanded ? null : tf.tariff_id)}
                className="grid grid-cols-[36px_1fr_120px_150px_80px_80px_auto] gap-3 items-center px-4 py-3.5 cursor-pointer hover:bg-white/[0.02] transition-colors"
              >
                <div className="font-mono text-xs text-sub">#{tf.tariff_id}</div>
                <div>
                  <div className="font-outfit text-sm font-semibold text-txt">{tf.tariff_name}</div>
                  <div className="font-outfit text-xs text-sub">{tf.utility_name} · {tf.consumer_category}</div>
                </div>
                <div className="font-outfit text-xs text-txt">{tf.billing_method}</div>
                <div>
                  <div className="font-outfit text-[11px] text-sub">From: {new Date(tf.effective_from).toLocaleDateString()}</div>
                  <div className="font-outfit text-[11px] text-sub">To: {tf.effective_to ? new Date(tf.effective_to).toLocaleDateString() : 'Ongoing'}</div>
                </div>
                {/* VAT column */}
                <div>
                  {tf.is_vat_exempt ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-yellow-500/10 border border-yellow-500/40 text-yellow-400">EXEMPT</span>
                  ) : (
                    <span className="font-outfit text-xs text-txt">{tf.vat_rate ?? 5}%</span>
                  )}
                </div>
                {/* Status badge */}
                <span className={`px-2 py-1 rounded-full text-[11px] font-medium font-outfit w-fit ${
                  tf.is_active
                    ? 'bg-[#0D2E1A] text-[#4ADE80]'
                    : 'bg-[#2D0C0C] text-[#F87171]'
                }`}>
                  {tf.is_active ? 'Active' : 'Inactive'}
                </span>
                {/* Actions */}
                <div className="flex gap-2 items-center" onClick={e => e.stopPropagation()}>
                  {tf.is_active && (
                    <button
                      onClick={() => handleDeactivate(tf.tariff_id, tf.tariff_name)}
                      className="px-3 py-1.5 bg-red-500/10 border border-red-500/40 text-red-400 rounded-lg hover:bg-red-500/20 transition-all font-outfit text-xs"
                    >
                      Deactivate
                    </button>
                  )}
                  <span className="text-sub text-sm">{isExpanded ? '▲' : '▼'}</span>
                </div>
              </div>

              {/* Expanded: slabs + fixed charges */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-white/[0.07]">
                  <div className="pt-4">
                    <SlabPanel tariff={tf} />
                  </div>
                  <FixedChargesPanel tariff={tf} />
                </div>
              )}
            </div>
          );
        })}

        {tariffs.length === 0 && (
          <div className="bg-card border-0.5 border-white/[0.07] rounded-2xl p-10 text-center">
            <p className="font-outfit text-sm text-sub">No tariffs found. Create one above.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TariffsManager;
