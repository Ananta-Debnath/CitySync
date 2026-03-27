import React, { useState, useEffect } from 'react';
import { getRegions, createRegion, updateRegion, deleteRegion } from '../../services/api';

const RegionsManager = () => {
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState(null);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="font-outfit text-sub">Loading regions...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Grain texture overlay */}
      <div 
        className="fixed inset-0 z-[1] pointer-events-none opacity-[0.04]" 
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E")`
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="font-outfit text-2xl font-semibold text-txt mb-2">Regions</h2>
            <p className="font-outfit text-sm text-sub">Manage service regions and postal codes</p>
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
              <h3 className="font-mono text-[10px] uppercase tracking-[0.12em] text-sub mb-4">
                New Region
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-[0.12em] text-sub mb-2">
                    Region Name
                  </label>
                  <input
                    placeholder="e.g. North District"
                    value={form.region_name}
                    onChange={e => setForm({ ...form, region_name: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-txt placeholder:text-sub focus:border-elec/40 focus:bg-white/[0.07] transition-all font-outfit text-sm"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-[0.12em] text-sub mb-2">
                    Postal Code
                  </label>
                  <input
                    placeholder="e.g. 12345"
                    value={form.postal_code}
                    onChange={e => setForm({ ...form, postal_code: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-txt placeholder:text-sub focus:border-elec/40 focus:bg-white/[0.07] transition-all font-outfit text-sm"
                  />
                </div>
              </div>
              {error && (
                <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/40 rounded-lg">
                  <p className="font-outfit text-sm text-red-400">{error}</p>
                </div>
              )}
              <div className="flex gap-3">
                <button 
                  onClick={handleCreate}
                  className="px-4 py-2 bg-elec/10 border border-elec/40 text-elec rounded-lg hover:bg-elec/20 transition-all font-outfit text-sm font-medium"
                >
                  Create Region
                </button>
                <button 
                  onClick={() => { setShowCreate(false); setError(''); }}
                  className="px-4 py-2 bg-white/5 border border-white/10 text-txt rounded-lg hover:border-white/20 transition-all font-outfit text-sm"
                >
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
              <thead className="border-b border-white/[0.07]">
                <tr>
                  <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.12em] text-sub">ID</th>
                  <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.12em] text-sub">Region Name</th>
                  <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.12em] text-sub">Postal Code</th>
                  <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.12em] text-sub">Actions</th>
                </tr>
              </thead>
              <tbody>
                {regions.map(r => (
                  <tr key={r.region_id} className="border-b border-white/[0.05] hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 font-mono text-sm text-sub">
                      #{r.region_id}
                    </td>
                    {editingId === r.region_id ? (
                      <>
                        <td className="px-4 py-3">
                          <input
                            value={editForm.region_name}
                            onChange={e => setEditForm({ ...editForm, region_name: e.target.value })}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-txt font-outfit text-sm focus:border-elec/40 focus:bg-white/[0.07] transition-all"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            value={editForm.postal_code}
                            onChange={e => setEditForm({ ...editForm, postal_code: e.target.value })}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-txt font-outfit text-sm focus:border-elec/40 focus:bg-white/[0.07] transition-all"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleUpdate(r.region_id)}
                              className="px-3 py-1.5 bg-elec/10 border border-elec/40 text-elec rounded-lg hover:bg-elec/20 transition-all font-outfit text-xs font-medium"
                            >
                              Save
                            </button>
                            <button 
                              onClick={() => setEditingId(null)}
                              className="px-3 py-1.5 bg-white/5 border border-white/10 text-txt rounded-lg hover:border-white/20 transition-all font-outfit text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 font-outfit text-sm text-txt font-medium">
                          {r.region_name}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-3 py-1 bg-white/5 rounded-lg font-mono text-sm text-txt">
                            {r.postal_code}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
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
                ))}
                {regions.length === 0 && (
                  <tr>
                    <td colSpan="4" className="px-4 py-8 text-center">
                      <p className="font-outfit text-sub">No regions found. Create one above.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegionsManager;