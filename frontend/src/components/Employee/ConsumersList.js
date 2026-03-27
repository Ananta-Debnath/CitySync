import React, { useState, useEffect } from 'react';
import { getConsumers, updateConsumer } from '../../services/api';

const ConsumersList = () => {
  const [consumers, setConsumers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    fetchConsumers();
  }, []);

  const fetchConsumers = async () => {
    try {
      const res = await getConsumers();
      setConsumers(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch consumers', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (consumer) => {
    setEditingId(consumer.person_id);
    setEditForm({
      first_name: consumer.first_name,
      last_name: consumer.last_name,
      phone_number: consumer.phone_number,
      email: consumer.email
    });
  };

  const handleSave = async (id) => {
    try {
      await updateConsumer(id, editForm);
      setEditingId(null);
      fetchConsumers();
    } catch (err) {
      alert('Failed to update consumer');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="font-outfit text-sub">Loading consumers...</div>
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
        <div className="mb-6">
          <h2 className="font-outfit text-2xl font-semibold text-txt mb-2">Registered Consumers</h2>
          <p className="font-outfit text-sm text-sub">View and manage consumer accounts</p>
        </div>

        {/* Consumers Table Card */}
        <div className="bg-card border-0.5 border-white/[0.07] rounded-2xl overflow-hidden">
          <div className="h-[1.5px] bg-elec/45 rounded-t-2xl" />
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-white/[0.07]">
                <tr>
                  <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.12em] text-sub">ID</th>
                  <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.12em] text-sub">Name</th>
                  <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.12em] text-sub">Phone</th>
                  <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.12em] text-sub">Email</th>
                  <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.12em] text-sub">Registration Date</th>
                  <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.12em] text-sub">Actions</th>
                </tr>
              </thead>
              <tbody>
                {consumers.map(c => (
                  <tr key={c.person_id} className="border-b border-white/[0.05] hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 font-outfit text-sm text-txt">{c.person_id}</td>
                    
                    {editingId === c.person_id ? (
                      <>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <input 
                              value={editForm.first_name || ''} 
                              onChange={e => setEditForm({...editForm, first_name: e.target.value})} 
                              placeholder="First name"
                              className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-txt placeholder:text-sub font-outfit text-sm focus:border-elec/40 focus:bg-white/[0.07] transition-all"
                            />
                            <input 
                              value={editForm.last_name || ''} 
                              onChange={e => setEditForm({...editForm, last_name: e.target.value})} 
                              placeholder="Last name"
                              className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-txt placeholder:text-sub font-outfit text-sm focus:border-elec/40 focus:bg-white/[0.07] transition-all"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <input 
                            value={editForm.phone_number || ''} 
                            onChange={e => setEditForm({...editForm, phone_number: e.target.value})} 
                            placeholder="Phone"
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-txt placeholder:text-sub font-outfit text-sm focus:border-elec/40 focus:bg-white/[0.07] transition-all"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input 
                            value={editForm.email || ''} 
                            onChange={e => setEditForm({...editForm, email: e.target.value})} 
                            placeholder="Email"
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-txt placeholder:text-sub font-outfit text-sm focus:border-elec/40 focus:bg-white/[0.07] transition-all"
                          />
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 font-outfit text-sm text-txt">
                          {c.first_name} {c.last_name}
                        </td>
                        <td className="px-4 py-3 font-outfit text-sm text-txt">{c.phone_number}</td>
                        <td className="px-4 py-3 font-outfit text-sm text-txt">{c.email}</td>
                      </>
                    )}
                    
                    <td className="px-4 py-3 font-outfit text-sm text-txt">
                      {new Date(c.registration_date).toLocaleDateString()}
                    </td>
                    
                    <td className="px-4 py-3">
                      {editingId === c.person_id ? (
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleSave(c.person_id)}
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
                      ) : (
                        <button 
                          onClick={() => handleEdit(c)}
                          className="px-3 py-1.5 bg-elec/10 border border-elec/40 text-elec rounded-lg hover:bg-elec/20 transition-all font-outfit text-xs font-medium"
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {consumers.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center">
                      <p className="font-outfit text-sub">No consumers found</p>
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

export default ConsumersList;