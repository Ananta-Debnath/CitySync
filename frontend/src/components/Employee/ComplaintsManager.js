import React, { useState, useEffect } from 'react';
import { getComplaintsAdmin, assignComplaintAuto, updateComplaintStatusAdmin, approveComplaintChange } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const ComplaintsManager = () => {
  const { user } = useAuth();

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState(null);
  const [showPriorityModal, setShowPriorityModal] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await getComplaintsAdmin();
      setComplaints(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch complaints', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignClick = (complaint) => {
    setShowPriorityModal(complaint);
  };

  const handleAssignConfirm = async (priority) => {
    if (!showPriorityModal) return;

    setAssigningId(showPriorityModal.complaint_id);

    try {
      const res = await assignComplaintAuto(showPriorityModal.complaint_id, {
        priority
      });

      const data = res.data;
      alert(
        `Assigned: ${data.message}\n` +
        `Region: ${data.data.region}\n` +
        `Priority: ${priority}`
      );

      setShowPriorityModal(null);
      fetchData();
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Assignment failed';
      alert(`Failed to assign: ${msg}`);
    } finally {
      setAssigningId(null);
    }
  };

  const handleResolve = async (id) => {
    try {
      await updateComplaintStatusAdmin(id, { status: 'Resolved' });
      fetchData();
    } catch (err) {
      alert('Failed to resolve complaint');
    }
  };

  const handleChange = async (id) => {
    try {
      const res = await approveComplaintChange(id);
      if (res.data) {
        alert('Change approved successfully.');
        fetchData();
      }
    } catch (err) {
      const status = err.response?.status;
      const serverData = err.response?.data;
      const serverMsg = serverData ? (serverData.error || JSON.stringify(serverData)) : err.message;
      console.error('approveComplaintChange error:', err);
      alert(`Failed to approve change${status ? ` (HTTP ${status})` : ''}.\n${serverMsg}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="font-outfit text-sub">Loading complaints...</div>
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

      <div className="relative z-10">
        {/* Header */}
        <div className="mb-6">
          <h2 className="font-outfit text-2xl font-semibold text-txt mb-2">Manage Complaints</h2>
          <p className="font-outfit text-sm text-sub">Smart auto-assignment to field workers</p>
        </div>

        {/* Complaints Table Card */}
        <div className="bg-card border-0.5 border-white/[0.07] rounded-2xl overflow-hidden">
          <div className="h-[1.5px] bg-elec/45 rounded-t-2xl" />

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-white/[0.07]">
                <tr>
                  <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.12em] text-sub">
                    ID / Date
                  </th>
                  <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.12em] text-sub">
                    Consumer
                  </th>
                  <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.12em] text-sub">
                    Region
                  </th>
                  <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.12em] text-sub">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.12em] text-sub">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.12em] text-sub">
                    Assigned To
                  </th>
                  <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.12em] text-sub">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {complaints.map(c => (
                  <tr key={c.complaint_id} className="border-b border-white/[0.05] hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-outfit text-sm text-txt">#{c.complaint_id}</div>
                      <div className="font-outfit text-xs text-sub">
                        {new Date(c.complaint_date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-outfit text-sm text-txt">
                        {c.consumer_first_name} {c.consumer_last_name}
                      </div>
                      <div className="font-outfit text-xs text-sub">{c.consumer_phone}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-outfit text-sm text-txt">{c.region_name || '—'}</div>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <div className="font-outfit text-sm text-txt line-clamp-2" title={c.description}>
                        {c.description}
                      </div>
                      {c.remarks && (
                        <div className="font-outfit text-xs text-elec mt-1">
                          Note: {c.remarks}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`
                        px-3 py-1 rounded-full text-xs font-mono uppercase tracking-wider
                        ${c.status === 'Resolved'
                          ? 'bg-green-500/10 border border-green-500/40 text-green-400'
                          : c.status === 'In Progress'
                          ? 'bg-blue-500/10 border border-blue-500/40 text-blue-400'
                          : 'bg-yellow-500/10 border border-yellow-500/40 text-yellow-400'
                        }
                      `}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {c.assigned_to_name ? (
                        <div className="font-outfit text-sm text-txt">{c.assigned_to_name}</div>
                      ) : (
                        <span className="font-outfit text-xs text-sub italic">Not assigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {((c.description || '').trim().toUpperCase().startsWith('CHANGE REQUEST')) ? (
                          <button
                            onClick={() => handleChange(c.complaint_id)}
                            className="px-4 py-2 bg-yellow-500/10 border border-yellow-500/40 text-yellow-400 rounded-lg hover:bg-yellow-500/20 transition-all font-outfit text-sm font-medium"
                          >
                            Change
                          </button>
                        ) : (
                          <>
                            {c.status === 'Pending' && (
                              <button
                                onClick={() => handleAssignClick(c)}
                                disabled={assigningId === c.complaint_id}
                                className="px-4 py-2 bg-elec/10 border border-elec/40 text-elec rounded-lg hover:bg-elec/20 transition-all font-outfit text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {assigningId === c.complaint_id ? 'Assigning...' : 'Auto-Assign'}
                              </button>
                            )}
                            <button
                              onClick={() => handleResolve(c.complaint_id)}
                              className="px-4 py-2 bg-green-500/10 border border-green-500/40 text-green-400 rounded-lg hover:bg-green-500/20 transition-all font-outfit text-sm font-medium"
                            >
                              Mark Resolved
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {complaints.length === 0 && (
                  <tr>
                    <td colSpan="7" className="px-4 py-8 text-center">
                      <p className="font-outfit text-sub">No complaints found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Priority Selection Modal */}
        {showPriorityModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card border-0.5 border-white/[0.07] rounded-2xl max-w-md w-full">
              <div className="h-[1.5px] bg-elec/45 rounded-t-2xl" />

              <div className="p-6 border-b border-white/[0.07]">
                <h3 className="font-outfit text-lg font-semibold text-txt">Select Priority</h3>
                <p className="font-outfit text-xs text-sub mt-1">
                  Complaint #{showPriorityModal.complaint_id}
                  {showPriorityModal.region_name ? ` — ${showPriorityModal.region_name}` : ''}
                </p>
              </div>

              <div className="p-6 space-y-3">
                <button
                  onClick={() => handleAssignConfirm('Urgent')}
                  disabled={!!assigningId}
                  className="w-full px-4 py-3 bg-red-500/10 border border-red-500/40 text-red-400 rounded-lg hover:bg-red-500/20 transition-all font-outfit text-sm font-medium text-left disabled:opacity-50"
                >
                  <div className="font-semibold">Urgent</div>
                  <div className="text-xs mt-1 opacity-70">Assign to most productive worker</div>
                </button>

                <button
                  onClick={() => handleAssignConfirm('Normal')}
                  disabled={!!assigningId}
                  className="w-full px-4 py-3 bg-elec/10 border border-elec/40 text-elec rounded-lg hover:bg-elec/20 transition-all font-outfit text-sm font-medium text-left disabled:opacity-50"
                >
                  <div className="font-semibold">Normal</div>
                  <div className="text-xs mt-1 opacity-70">Assign to least loaded worker</div>
                </button>

                <button
                  onClick={() => handleAssignConfirm('Low')}
                  disabled={!!assigningId}
                  className="w-full px-4 py-3 bg-blue-500/10 border border-blue-500/40 text-blue-400 rounded-lg hover:bg-blue-500/20 transition-all font-outfit text-sm font-medium text-left disabled:opacity-50"
                >
                  <div className="font-semibold">Low</div>
                  <div className="text-xs mt-1 opacity-70">Assign to least loaded worker</div>
                </button>
              </div>

              <div className="p-6 border-t border-white/[0.07] flex justify-end">
                <button
                  onClick={() => setShowPriorityModal(null)}
                  disabled={!!assigningId}
                  className="px-4 py-2 bg-white/5 border border-white/10 text-txt rounded-lg hover:border-white/20 transition-all font-outfit text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ComplaintsManager;
