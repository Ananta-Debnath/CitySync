import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { getReadings, getReadingById, approveReading } from '../../services/api';

const grain = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E")`;

const fmt = (dateStr) =>
  new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const EmployeeReadings = () => {
  const [readings, setReadings]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [selectedReading, setSelectedReading] = useState(null);
  const [showModal, setShowModal]         = useState(false);
  const [approving, setApproving]         = useState(false);
  const [filters, setFilters] = useState({
    status: 'pending',
    utilityType: 'all',
    dateFrom: '',
    dateTo: '',
  });

  useEffect(() => {
    fetchReadings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const fetchReadings = async () => {
    try {
      setLoading(true);
      const params = { status: filters.status };
      if (filters.utilityType !== 'all') params.utility_type = filters.utilityType;
      if (filters.dateFrom) params.date_from = filters.dateFrom;
      if (filters.dateTo)   params.date_to   = filters.dateTo;

      const res = await getReadings(params);
      setReadings(res.data.data.readings || []);
    } catch (err) {
      console.error('Failed to fetch readings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (readingId) => {
    try {
      const res = await getReadingById(readingId);
      setSelectedReading(res.data.data);
      setShowModal(true);
    } catch (err) {
      console.error('Failed to fetch reading details:', err);
    }
  };

  const handleApprove = async (readingId) => {
    if (!window.confirm('Approve this meter reading? This will create usage records.')) return;
    try {
      setApproving(true);
      await approveReading(readingId);
      alert('Reading approved successfully!');
      setShowModal(false);
      setSelectedReading(null);
      fetchReadings();
    } catch (err) {
      alert('Failed to approve reading: ' + (err.response?.data?.error || err.message));
    } finally {
      setApproving(false);
    }
  };

  const selectStyle = "w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-txt font-outfit text-sm focus:border-elec/40 focus:bg-white/[0.07] transition-all";
  const inputStyle  = "w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-txt font-outfit text-sm focus:border-elec/40 focus:bg-white/[0.07] transition-all";

  return (
    <div className="space-y-6">
      {/* Grain texture */}
      <div className="fixed inset-0 z-[1] pointer-events-none opacity-[0.04]"
           style={{ backgroundImage: grain }} />

      <div className="relative z-10">
        {/* Header */}
        <div className="mb-6">
          <h2 className="font-outfit text-2xl font-semibold text-txt mb-2">Meter Readings</h2>
          <p className="font-outfit text-sm text-sub">Review and approve meter readings from field workers</p>
        </div>

        {/* Filters */}
        <div className="bg-card border-0.5 border-white/[0.07] rounded-2xl overflow-hidden mb-6">
          <div className="h-[1.5px] bg-elec/45 rounded-t-2xl" />
          <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-[0.12em] text-sub mb-2">Status</label>
              <select value={filters.status}
                      onChange={e => setFilters({ ...filters, status: e.target.value })}
                      className={selectStyle}>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="all">All</option>
              </select>
            </div>

            <div>
              <label className="block font-mono text-[10px] uppercase tracking-[0.12em] text-sub mb-2">Utility Type</label>
              <select value={filters.utilityType}
                      onChange={e => setFilters({ ...filters, utilityType: e.target.value })}
                      className={selectStyle}>
                <option value="all">All</option>
                <option value="Electricity">Electricity</option>
                <option value="Water">Water</option>
                <option value="Gas">Gas</option>
              </select>
            </div>

            <div>
              <label className="block font-mono text-[10px] uppercase tracking-[0.12em] text-sub mb-2">From Date</label>
              <input type="date" value={filters.dateFrom}
                     onChange={e => setFilters({ ...filters, dateFrom: e.target.value })}
                     className={inputStyle} />
            </div>

            <div>
              <label className="block font-mono text-[10px] uppercase tracking-[0.12em] text-sub mb-2">To Date</label>
              <input type="date" value={filters.dateTo}
                     onChange={e => setFilters({ ...filters, dateTo: e.target.value })}
                     className={inputStyle} />
            </div>
          </div>
        </div>

        {/* Readings Table */}
        <div className="bg-card border-0.5 border-white/[0.07] rounded-2xl overflow-hidden">
          <div className="h-[1.5px] bg-elec/45 rounded-t-2xl" />
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <p className="font-outfit text-sm text-sub">Loading readings...</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="border-b border-white/[0.07]">
                  <tr>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.12em] text-sub">ID</th>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.12em] text-sub">Consumer</th>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.12em] text-sub">Meter ID</th>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.12em] text-sub">Field Worker</th>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.12em] text-sub">Period</th>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.12em] text-sub">Units</th>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.12em] text-sub">Date</th>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.12em] text-sub">Status</th>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.12em] text-sub">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {readings.map(r => (
                    <tr key={r.reading_id} className="border-b border-white/[0.05] hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 font-mono text-sm text-sub">#{String(r.reading_id).padStart(3, '0')}</td>
                      <td className="px-4 py-3">
                        <div className="font-outfit text-sm text-txt">{r.consumer_name}</div>
                        <div className="font-outfit text-xs text-sub">{r.consumer_phone}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-sm text-txt">{r.meter_id}</td>
                      <td className="px-4 py-3">
                        <div className="font-outfit text-sm text-txt">{r.field_worker_name}</div>
                        <div className="font-outfit text-xs text-sub">{r.field_worker_region}</div>
                      </td>
                      <td className="px-4 py-3 font-outfit text-sm text-txt">
                        {fmt(r.time_from)} – {fmt(r.time_to)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-outfit text-sm text-txt font-medium">{r.units_logged}</div>
                        <div className="font-outfit text-xs text-sub">{r.unit_of_measurement}</div>
                      </td>
                      <td className="px-4 py-3 font-outfit text-sm text-txt">{fmt(r.reading_date)}</td>
                      <td className="px-4 py-3">
                        {r.approved_by ? (
                          <span className="px-3 py-1 bg-green-500/10 border border-green-500/40 text-green-400 rounded-full text-xs font-mono uppercase tracking-wider">
                            Approved
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-yellow-500/10 border border-yellow-500/40 text-yellow-400 rounded-full text-xs font-mono uppercase tracking-wider">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {!r.approved_by && (
                            <button
                              onClick={() => handleApprove(r.reading_id)}
                              className="px-3 py-1.5 bg-elec/10 border border-elec/40 text-elec rounded-lg hover:bg-elec/20 transition-all font-outfit text-xs font-medium"
                            >
                              Approve
                            </button>
                          )}
                          <button
                            onClick={() => handleViewDetails(r.reading_id)}
                            className="px-3 py-1.5 bg-white/5 border border-white/10 text-txt rounded-lg hover:border-white/20 transition-all font-outfit text-xs"
                          >
                            Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {readings.length === 0 && (
                    <tr>
                      <td colSpan="9" className="px-4 py-12 text-center">
                        <p className="font-outfit text-sub">No readings found</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Details Modal */}
        {showModal && selectedReading && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card border-0.5 border-white/[0.07] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="h-[1.5px] bg-elec/45 rounded-t-2xl" />

              {/* Modal Header */}
              <div className="p-6 border-b border-white/[0.07] flex justify-between items-center">
                <h3 className="font-outfit text-lg font-semibold text-txt">Reading Details</h3>
                <button onClick={() => { setShowModal(false); setSelectedReading(null); }}
                        className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                  <X className="w-5 h-5 text-sub" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6">
                {/* Consumer */}
                <div>
                  <h4 className="font-mono text-[10px] uppercase tracking-[0.12em] text-sub mb-3">Consumer</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-outfit text-sm text-sub">Name</span>
                      <span className="font-outfit text-sm text-txt font-medium">{selectedReading.consumer_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-outfit text-sm text-sub">Phone</span>
                      <span className="font-outfit text-sm text-txt">{selectedReading.consumer_phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-outfit text-sm text-sub">Connection ID</span>
                      <span className="font-mono text-sm text-txt">{selectedReading.consumer_id}</span>
                    </div>
                  </div>
                </div>

                {/* Meter */}
                <div>
                  <h4 className="font-mono text-[10px] uppercase tracking-[0.12em] text-sub mb-3">Meter</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-outfit text-sm text-sub">Meter ID</span>
                      <span className="font-mono text-sm text-txt">{selectedReading.meter_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-outfit text-sm text-sub">Utility Type</span>
                      <span className="font-outfit text-sm text-txt">{selectedReading.utility_type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-outfit text-sm text-sub">Meter Type</span>
                      <span className="font-outfit text-sm text-txt">{selectedReading.meter_type}</span>
                    </div>
                  </div>
                </div>

                {/* Reading */}
                <div>
                  <h4 className="font-mono text-[10px] uppercase tracking-[0.12em] text-sub mb-3">Reading</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-outfit text-sm text-sub">Period</span>
                      <span className="font-outfit text-sm text-txt">
                        {fmt(selectedReading.time_from)} – {fmt(selectedReading.time_to)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-outfit text-sm text-sub">Units Logged</span>
                      <span className="font-outfit text-2xl text-txt font-semibold">
                        {selectedReading.units_logged} {selectedReading.unit_of_measurement}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Previous Reading Comparison */}
                {selectedReading.previous_reading_units != null && (() => {
                  const prev   = parseFloat(selectedReading.previous_reading_units);
                  const curr   = parseFloat(selectedReading.units_logged);
                  const change = prev > 0 ? ((curr - prev) / prev) * 100 : null;
                  return (
                    <div>
                      <h4 className="font-mono text-[10px] uppercase tracking-[0.12em] text-sub mb-3">Comparison</h4>
                      <div className="px-4 py-3 bg-blue-500/10 border border-blue-500/40 rounded-lg mb-3">
                        <p className="font-outfit text-sm text-blue-400">
                          Previous reading: {prev} {selectedReading.unit_of_measurement}
                        </p>
                      </div>
                      {change !== null && change > 50 && (
                        <div className="px-4 py-3 bg-yellow-500/10 border border-yellow-500/40 rounded-lg">
                          <p className="font-outfit text-sm text-yellow-400">
                            ⚠ High increase detected (+{change.toFixed(1)}%)
                          </p>
                        </div>
                      )}
                      {change !== null && change < 0 && (
                        <div className="px-4 py-3 bg-red-500/10 border border-red-500/40 rounded-lg">
                          <p className="font-outfit text-sm text-red-400">
                            ⚠ Usage decrease detected ({change.toFixed(1)}%)
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Field Worker */}
                <div>
                  <h4 className="font-mono text-[10px] uppercase tracking-[0.12em] text-sub mb-3">Field Worker</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-outfit text-sm text-sub">Name</span>
                      <span className="font-outfit text-sm text-txt">{selectedReading.field_worker_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-outfit text-sm text-sub">Phone</span>
                      <span className="font-outfit text-sm text-txt">{selectedReading.field_worker_phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-outfit text-sm text-sub">Region</span>
                      <span className="font-outfit text-sm text-txt">{selectedReading.field_worker_region}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              {!selectedReading.approved_by && (
                <div className="p-6 border-t border-white/[0.07] flex justify-end gap-3">
                  <button
                    onClick={() => { setShowModal(false); setSelectedReading(null); }}
                    className="px-4 py-2 bg-white/5 border border-white/10 text-txt rounded-lg hover:border-white/20 transition-all font-outfit text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleApprove(selectedReading.reading_id)}
                    disabled={approving}
                    className="px-4 py-2 bg-elec/10 border border-elec/40 text-elec rounded-lg hover:bg-elec/20 transition-all font-outfit text-sm font-medium disabled:opacity-50"
                  >
                    {approving ? 'Approving...' : 'Approve Reading'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeReadings;
