import React, { useState, useEffect } from 'react';
import { getRegions, createRegion, updateRegion, deleteRegion, updateRegionCapacity } from '../../services/api';

const grain = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E")`;

const CapacityBar = ({ current, max }) => {
  const pct = max > 0 ? Math.min(Math.round((current / max) * 100), 100) : 0;
  const color = pct >= 90 ? '#FF5757' : pct >= 70 ? '#FF9900' : '#44ff99';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="font-mono text-[10px] text-sub whitespace-nowrap">{current}/{max}</span>
    </div>
  );
};

// Capacity edit modal
const CapacityModal = ({ region, onClose, onSave }) => {
  const [form, setForm] = useState({
    max_connections: region.max_connections ?? 1000,
    is_accepting_connections: region.is_accepting_connections ?? true,
    capacity_note: region.capacity_note || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (form.max_connections < 1) return setError('Max connections must be at least 1');
    setSaving(true); setError('');
    try {
      await onSave(region.region_id, form);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save capacity settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-bg border border-white/[0.1] rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="h-[1.5px] bg-elec/45 rounded-t mb-6" />
        <h3 className="font-outfit text-lg font-semibold text-txt mb-1">Capacity Settings</h3>
        <p className="font-mono text-[10px] text-muted mb-6 uppercase tracking-wider">{region.region_name}</p>

        <div className="space-y-4">
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-[0.12em] text-sub mb-2">Max Connections</label>
            <input
              type="number"
              min="1"
              value={form.max_connections}
              onChange={e => setForm(f => ({ ...f, max_connections: parseInt(e.target.value) || 1 }))}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-txt font-outfit text-sm focus:border-elec/40 focus:bg-white/[0.07] transition-all outline-none"
            />
          </div>

          <div>
            <label className="block font-mono text-[10px] uppercase tracking-[0.12em] text-sub mb-2">Accepting New Connections</label>
            <div className="flex gap-3">
              {[true, false].map(val => (
                <button
                  key={String(val)}
                  onClick={() => setForm(f => ({ ...f, is_accepting_connections: val }))}
                  className={`flex-1 py-2 rounded-lg border font-outfit text-sm font-medium transition-all ${
                    form.is_accepting_connections === val
                      ? val
                        ? 'bg-elec/10 border-elec/40 text-elec'
                        : 'bg-red-500/10 border-red-500/40 text-red-400'
                      : 'bg-white/5 border-white/10 text-sub'
                  }`}
                >
                  {val ? 'Yes' : 'No'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-mono text-[10px] uppercase tracking-[0.12em] text-sub mb-2">Capacity Note <span className="text-muted normal-case">(shown to consumers)</span></label>
            <input
              value={form.capacity_note}
              onChange={e => setForm(f => ({ ...f, capacity_note: e.target.value }))}
              placeholder="e.g. Temporarily closed for infrastructure upgrade"
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-txt font-outfit text-sm focus:border-elec/40 focus:bg-white/[0.07] transition-all outline-none placeholder:text-sub/40"
            />
          </div>
        </div>

        {error && (
          <div className="mt-4 px-4 py-3 bg-red-500/10 border border-red-500/40 rounded-lg">
            <p className="font-outfit text-sm text-red-400">{error}</p>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2 bg-elec/10 border border-elec/40 text-elec rounded-lg hover:bg-elec/20 transition-all font-outfit text-sm font-medium disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white/5 border border-white/10 text-txt rounded-lg hover:border-white/20 transition-all font-outfit text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

const RegionsManager = () => {
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [capacityRegion, setCapacityRegion] = useState(null);
  const [form, setForm] = useState({ region_name: '', postal_code: '' });
  const [editForm, setEditForm] = useState({});
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const res = await getRegions();
      setRegions(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.region_name || !form.postal_code)
      return setError('Both fields are required');
    setError('');
    try {
      await createRegion(form);
      setForm({ region_name: '', postal_code: '' });
      setShowCreate(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create region');
    }
  };

  const handleUpdate = async (id) => {
    try {
      await updateRegion(id, editForm);
      setEditingId(null);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update region');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this region? This will fail if any addresses, field workers, or utilities are assigned to it.')) return;
    try {
      await deleteRegion(id);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Cannot delete — region is in use');
    }
  };

  const handleCapacitySave = async (id, data) => {
    await updateRegionCapacity(id, data);
    load();
  };

  const getStatusLabel = (r) => {
    const cur = Number(r.current_connections || 0);
    const max = Number(r.max_connections || 1000);
    const pct = max > 0 ? Math.round((cur / max) * 100) : 0;
    if (!r.is_accepting_connections) return { label: 'Closed', color: 'text-sub bg-white/[0.04]' };
    if (pct >= 90) return { label: 'Overloaded', color: 'text-status-error bg-red-500/10' };
    if (pct >= 70) return { label: 'Limited', color: 'text-status-warning bg-yellow-500/10' };
    return { label: 'Available', color: 'text-status-active bg-green-500/10' };
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-14 bg-card border-0.5 border-white/[0.07] rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="fixed inset-0 z-[1] pointer-events-none opacity-[0.04]" style={{ backgroundImage: grain }} />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-elec mb-2">Employee Portal / Regions</div>
            <h2 className="font-outfit text-2xl font-semibold text-txt tracking-tight">Regions</h2>
            <p className="font-outfit text-sm text-sub mt-1">Manage service regions, postal codes, and capacity</p>
          </div>
          {!showCreate && (
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 bg-elec/10 border border-elec/40 text-elec rounded-lg hover:bg-elec/20 transition-all font-outfit text-sm font-medium"
            >
              Add New Region
            </button>
          )}
        </div>

        {/* Create Form Card */}
        {showCreate && (
          <div className="bg-card border-0.5 border-white/[0.07] rounded-2xl overflow-hidden mb-6">
            <div className="h-[1.5px] bg-elec/45 rounded-t-2xl" />
            <div className="p-6">
              <h3 className="font-mono text-[10px] uppercase tracking-[0.12em] text-sub mb-4">New Region</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-[0.12em] text-sub mb-2">Region Name</label>
                  <input
                    placeholder="e.g. North District"
                    value={form.region_name}
                    onChange={e => setForm({ ...form, region_name: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-txt placeholder:text-sub focus:border-elec/40 focus:bg-white/[0.07] transition-all font-outfit text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-[0.12em] text-sub mb-2">Postal Code</label>
                  <input
                    placeholder="e.g. 12345"
                    value={form.postal_code}
                    onChange={e => setForm({ ...form, postal_code: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-txt placeholder:text-sub focus:border-elec/40 focus:bg-white/[0.07] transition-all font-outfit text-sm outline-none"
                  />
                </div>
              </div>
              {error && (
                <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/40 rounded-lg">
                  <p className="font-outfit text-sm text-red-400">{error}</p>
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={handleCreate} className="px-4 py-2 bg-elec/10 border border-elec/40 text-elec rounded-lg hover:bg-elec/20 transition-all font-outfit text-sm font-medium">
                  Create Region
                </button>
                <button onClick={() => { setShowCreate(false); setError(''); }} className="px-4 py-2 bg-white/5 border border-white/10 text-txt rounded-lg hover:border-white/20 transition-all font-outfit text-sm">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Regions Table Card */}
        <div className="bg-card border-0.5 border-white/[0.07] rounded-2xl overflow-hidden">
          <div className="h-[1.5px] bg-elec/45 rounded-t-2xl" />
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-card2">
                  {['ID', 'Region Name', 'Postal Code', 'Capacity', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-mono text-[9px] uppercase tracking-[0.12em] text-sub border-b border-white/[0.05]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {regions.map(r => {
                  const statusInfo = getStatusLabel(r);
                  return (
                    <tr key={r.region_id} className="border-b border-white/[0.05] hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 font-mono text-sm text-sub">#{r.region_id}</td>

                      {editingId === r.region_id ? (
                        <>
                          <td className="px-4 py-3">
                            <input
                              value={editForm.region_name}
                              onChange={e => setEditForm({ ...editForm, region_name: e.target.value })}
                              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-txt font-outfit text-sm focus:border-elec/40 transition-all outline-none"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              value={editForm.postal_code}
                              onChange={e => setEditForm({ ...editForm, postal_code: e.target.value })}
                              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-txt font-outfit text-sm focus:border-elec/40 transition-all outline-none"
                            />
                          </td>
                          <td className="px-4 py-3 text-sub font-mono text-[10px]">—</td>
                          <td className="px-4 py-3 text-sub font-mono text-[10px]">—</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button onClick={() => handleUpdate(r.region_id)} className="px-3 py-1.5 bg-elec/10 border border-elec/40 text-elec rounded-lg hover:bg-elec/20 transition-all font-outfit text-xs font-medium">Save</button>
                              <button onClick={() => setEditingId(null)} className="px-3 py-1.5 bg-white/5 border border-white/10 text-txt rounded-lg hover:border-white/20 transition-all font-outfit text-xs">Cancel</button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 font-outfit text-sm text-txt font-medium">{r.region_name}</td>
                          <td className="px-4 py-3">
                            <span className="px-3 py-1 bg-white/5 rounded-lg font-mono text-sm text-txt">{r.postal_code}</span>
                          </td>
                          <td className="px-4 py-3 min-w-[160px]">
                            <CapacityBar current={Number(r.current_connections || 0)} max={Number(r.max_connections || 1000)} />
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-md font-mono text-[9px] uppercase tracking-wider ${statusInfo.color}`}>
                              {statusInfo.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button
                                onClick={() => setCapacityRegion(r)}
                                className="px-3 py-1.5 bg-white/5 border border-white/10 text-sub rounded-lg hover:border-white/20 hover:text-txt transition-all font-outfit text-xs"
                              >
                                Capacity
                              </button>
                              <button
                                onClick={() => { setEditingId(r.region_id); setEditForm({ region_name: r.region_name, postal_code: r.postal_code }); }}
                                className="px-3 py-1.5 bg-elec/10 border border-elec/40 text-elec rounded-lg hover:bg-elec/20 transition-all font-outfit text-xs font-medium"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(r.region_id)}
                                className="px-3 py-1.5 bg-red-500/10 border border-red-500/40 text-red-400 rounded-lg hover:bg-red-500/20 transition-all font-outfit text-xs font-medium"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
                {regions.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center">
                      <p className="font-outfit text-sub">No regions found. Create one above.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Capacity Modal */}
      {capacityRegion && (
        <CapacityModal
          region={capacityRegion}
          onClose={() => setCapacityRegion(null)}
          onSave={handleCapacitySave}
        />
      )}
    </div>
  );
};

export default RegionsManager;
