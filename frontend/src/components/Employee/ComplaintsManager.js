import React, { useState, useEffect } from 'react';
import { getComplaintsAdmin, getFieldWorkers, updateComplaintStatusAdmin, assignComplaint } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const ComplaintsManager = () => {
  const { user } = useAuth();
  
  const [complaints, setComplaints] = useState([]);
  const [fieldWorkers, setFieldWorkers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [compRes, fwRes] = await Promise.all([
        getComplaintsAdmin(),
        getFieldWorkers()
      ]);
      setComplaints(compRes.data.data || []);
      setFieldWorkers(fwRes.data.data || []);
    } catch (err) {
      console.error('Failed to fetch complaints/workers', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (complaintId, workerId) => {
    if (!workerId) return;
    try {
      await assignComplaint(complaintId, { assigned_to: workerId, assigned_by: user.userId });
      fetchData();
    } catch (err) {
      alert('Failed to assign complaint');
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

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="mb-6">
          <h2 className="font-outfit text-2xl font-semibold text-txt mb-2">Manage Complaints</h2>
          <p className="font-outfit text-sm text-sub">Assign and resolve customer complaints</p>
        </div>

        {/* Complaints Table Card */}
        <div className="bg-card border-0.5 border-white/[0.07] rounded-2xl overflow-hidden">
          {/* Top accent stripe */}
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
                      {c.status === 'Pending' ? (
                        <select 
                          onChange={(e) => handleAssign(c.complaint_id, e.target.value)}
                          defaultValue=""
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-txt text-sm font-outfit focus:border-elec/40 focus:bg-white/[0.07] transition-all"
                        >
                          <option value="" disabled>Assign to...</option>
                          {fieldWorkers.map(fw => (
                            <option key={fw.person_id} value={fw.person_id}>
                              {fw.first_name} {fw.last_name} ({fw.region_name || 'No Region'})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="font-outfit text-sm text-txt">
                          {c.assigned_to_name || 'N/A'}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {c.status !== 'Resolved' && (
                        <button 
                          onClick={() => handleResolve(c.complaint_id)}
                          className="px-4 py-2 bg-elec/10 border border-elec/40 text-elec rounded-lg hover:bg-elec/20 transition-all font-outfit text-sm font-medium"
                        >
                          Mark Resolved
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {complaints.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center">
                      <p className="font-outfit text-sub">No complaints found</p>
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

export default ComplaintsManager;