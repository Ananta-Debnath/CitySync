import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import SideDrawer from '../Employee/Shared/SideDrawer';

const grain = (
  <div
    className="fixed inset-0 z-[1] pointer-events-none opacity-[0.04]"
    style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E")`
    }}
  />
);

const LABEL = 'font-mono text-[10px] uppercase tracking-[0.12em] text-sub mb-1';
const BADGE = 'font-mono text-[9px] uppercase tracking-widest px-2 py-1 rounded-lg';

const priorityBadgeClass = (priority) => {
  if (priority === 'Urgent') return 'bg-red-500/10 border border-red-500/30 text-red-400';
  if (priority === 'Normal') return 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400';
  return 'bg-white/5 border border-white/10 text-sub';
};

const statusBadgeClass = (status) => {
  if (status === 'Pending') return 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400';
  if (status === 'In Progress') return 'bg-blue-500/10 border border-blue-500/30 text-blue-400';
  return 'bg-green-500/10 border border-green-500/30 text-green-400';
};

const priorityBorderClass = (priority) => {
  if (priority === 'Urgent') return 'border-red-500/30';
  if (priority === 'Normal') return 'border-yellow-500/30';
  return 'border-white/[0.07]';
};

const Spinner = () => (
  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
  </svg>
);

const formatDate = (ts) => {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const MyJobs = () => {
  const { authFetch } = useAuth();

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    authFetch('/api/fieldworker/complaints')
      .then(r => r.json())
      .then(j => setComplaints(j.data || []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [authFetch]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const openDrawer = (c) => {
    setSelectedComplaint(c);
    setRemarks('');
    setDrawerOpen(true);
  };

  const handleUpdateStatus = async (complaintId, newStatus) => {
    setUpdating(true);
    try {
      const body = { status: newStatus };
      if (newStatus === 'Resolved') body.remarks = remarks;

      const res = await authFetch(`/api/fieldworker/complaints/${complaintId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      const j = await res.json();

      setComplaints(prev =>
        prev.map(c => c.complaint_id === complaintId ? { ...c, ...j.data } : c)
      );
      setSelectedComplaint(prev => ({ ...prev, ...j.data }));
      showToast('Complaint updated successfully.');
      setDrawerOpen(false);
      setRemarks('');
    } catch {
      showToast('Failed to update complaint.');
    } finally {
      setUpdating(false);
    }
  };

  const filterBtnClass = (active) =>
    active
      ? 'bg-elec/10 border border-elec/40 text-elec rounded-lg px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.08em]'
      : 'bg-white/5 border border-white/10 text-sub rounded-lg px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.08em]';

  const filteredComplaints = complaints.filter(c => {
    const statusMatch = statusFilter === 'All' || c.status === statusFilter;
    const priorityMatch = priorityFilter === 'All' || c.priority === priorityFilter;
    return statusMatch && priorityMatch;
  });

  return (
    <>
      {grain}
      <div className="relative z-10 space-y-5">

        {/* Page header */}
        <div>
          <h1 className="font-outfit text-xl font-semibold text-txt">My Jobs</h1>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-sub mt-1">
            Assigned complaints and tasks
          </p>
        </div>

        {/* Filter bar */}
        <div className="space-y-2">
          <div className="flex gap-2 flex-wrap">
            {['All', 'Pending', 'In Progress', 'Resolved'].map(f => (
              <button key={f} className={filterBtnClass(statusFilter === f)} onClick={() => setStatusFilter(f)}>
                {f}
              </button>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap">
            {['All', 'Urgent', 'Normal', 'Low'].map(f => (
              <button key={f} className={filterBtnClass(priorityFilter === f)} onClick={() => setPriorityFilter(f)}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse bg-white/[0.03] rounded-xl h-20" />
            ))}
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-32">
            <p className="font-outfit text-sm text-sub">Failed to load complaints.</p>
          </div>
        ) : complaints.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="font-outfit text-sm text-sub">No complaints assigned yet.</p>
          </div>
        ) : filteredComplaints.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="font-outfit text-sm text-sub">No complaints match the selected filters.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredComplaints.map(c => (
              <div
                key={c.complaint_id}
                className={`bg-card border ${priorityBorderClass(c.priority)} rounded-xl overflow-hidden hover:brightness-110 transition-all cursor-pointer`}
                onClick={() => openDrawer(c)}
              >
                <div className="h-[1.5px] bg-elec/45 rounded-t-2xl" />
                <div className="p-4">
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-outfit text-sm font-semibold text-txt">
                      {c.consumer_first_name} {c.consumer_last_name}
                    </span>
                    <span className={`${priorityBadgeClass(c.priority)} ${BADGE} shrink-0`}>
                      {c.priority}
                    </span>
                  </div>
                  {/* Description */}
                  <p className="font-outfit text-sm text-sub line-clamp-2 mt-1">{c.description}</p>
                  {/* Bottom row */}
                  <div className="flex items-center justify-between mt-3">
                    <span className={`${statusBadgeClass(c.status)} ${BADGE}`}>
                      {c.status}
                    </span>
                    <span className="font-mono text-[10px] text-sub">{formatDate(c.complaint_date)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[2000] bg-card border border-white/[0.1] rounded-xl px-4 py-3 font-outfit text-sm text-txt shadow-lg">
          {toast}
        </div>
      )}

      {/* Side drawer */}
      <SideDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        {selectedComplaint && (
          <>
            <div className="h-[1.5px] bg-elec/45" />

            {/* Drawer header */}
            <div className="p-6 border-b border-white/[0.05]">
              <h2 className="font-outfit text-lg font-semibold text-txt">
                Complaint #{selectedComplaint.complaint_id}
              </h2>
              <div className="flex gap-2 mt-2">
                <span className={`${priorityBadgeClass(selectedComplaint.priority)} ${BADGE}`}>
                  {selectedComplaint.priority}
                </span>
                <span className={`${statusBadgeClass(selectedComplaint.status)} ${BADGE}`}>
                  {selectedComplaint.status}
                </span>
              </div>
            </div>

            {/* Drawer details */}
            <div className="p-6 space-y-4">
              {[
                { label: 'Consumer', value: `${selectedComplaint.consumer_first_name} ${selectedComplaint.consumer_last_name}` },
                { label: 'Connection', value: selectedComplaint.connection_name || (selectedComplaint.connection_id ? `#${selectedComplaint.connection_id}` : '—') },
                { label: 'Description', value: selectedComplaint.description },
                { label: 'Complaint Date', value: formatDate(selectedComplaint.complaint_date) },
                { label: 'Assignment Date', value: selectedComplaint.assignment_date ? formatDate(selectedComplaint.assignment_date) : 'Not yet assigned' },
                { label: 'Resolution Date', value: selectedComplaint.resolution_date ? formatDate(selectedComplaint.resolution_date) : 'Not yet resolved' },
                { label: 'Remarks', value: selectedComplaint.remarks || 'None' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div className={LABEL}>{label}</div>
                  <div className="font-outfit text-sm text-txt">{value}</div>
                </div>
              ))}
            </div>

            {/* Drawer actions */}
            <div className="p-6 border-t border-white/[0.05]">
              {selectedComplaint.status === 'Pending' && (
                <button
                  disabled={updating}
                  onClick={() => handleUpdateStatus(selectedComplaint.complaint_id, 'In Progress')}
                  className="w-full py-3 bg-elec/10 border border-elec/40 text-elec rounded-xl hover:bg-elec/20 transition-all font-outfit text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {updating && <Spinner />}
                  {updating ? 'Updating...' : 'Start Work'}
                </button>
              )}

              {selectedComplaint.status === 'In Progress' && (
                <div className="space-y-3">
                  <div>
                    <div className={LABEL}>Remarks (Optional)</div>
                    <textarea
                      value={remarks}
                      onChange={e => setRemarks(e.target.value)}
                      placeholder="Describe what was done..."
                      className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-3 font-outfit text-sm text-txt focus:border-elec/40 focus:outline-none resize-none h-24"
                    />
                  </div>
                  <button
                    disabled={updating}
                    onClick={() => handleUpdateStatus(selectedComplaint.complaint_id, 'Resolved')}
                    className="w-full py-3 bg-green-500/10 border border-green-500/30 text-green-400 rounded-xl hover:bg-green-500/20 transition-all font-outfit text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {updating && <Spinner />}
                    {updating ? 'Updating...' : 'Mark Resolved'}
                  </button>
                </div>
              )}

              {selectedComplaint.status === 'Resolved' && (
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-green-400 text-center">
                  This complaint has been resolved
                </p>
              )}
            </div>
          </>
        )}
      </SideDrawer>
    </>
  );
};

export default MyJobs;
