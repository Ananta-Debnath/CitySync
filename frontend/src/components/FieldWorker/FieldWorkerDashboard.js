import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import StatusPipeline from '../Employee/Shared/StatusPipeline';

const FieldWorkerDashboard = () => {
  const { authFetch } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    authFetch('/api/fieldworker/dashboard')
      .then(res => res.json())
      .then(json => setData(json.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const grain = (
    <div
      className="fixed inset-0 z-[1] pointer-events-none opacity-[0.04]"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E")`
      }}
    />
  );

  if (loading) {
    return (
      <>
        {grain}
        <div className="relative z-10 space-y-5">
          <div className="h-10 animate-pulse bg-white/[0.03] rounded-2xl" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 animate-pulse bg-white/[0.03] rounded-2xl" />
            ))}
          </div>
          <div className="h-20 animate-pulse bg-white/[0.03] rounded-2xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-64 animate-pulse bg-white/[0.03] rounded-2xl" />
            <div className="h-64 animate-pulse bg-white/[0.03] rounded-2xl" />
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        {grain}
        <div className="relative z-10 flex items-center justify-center h-64">
          <p className="font-outfit text-sm text-sub">Failed to load dashboard.</p>
        </div>
      </>
    );
  }

  const { worker, stats, urgent_complaints, recent_readings } = data;

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const complaintItems = urgent_complaints.map(c => ({
    title: c.description,
    subtitle: `${c.priority} · ${c.complaint_date}`,
  }));

  const readingItems = recent_readings.map(r => ({
    title: `Meter #${r.meter_id}`,
    subtitle: `${r.units_logged} units · ${r.reading_date}`,
    id: r.approved_by !== null
      ? <span className="font-mono text-[9px] text-[#4ade80]">Approved</span>
      : <span className="font-mono text-[9px] text-[#fbbf24]">Pending</span>,
  }));

  return (
    <>
      {grain}
      <div className="relative z-10 space-y-5">

        {/* Page header */}
        <div className="flex items-center justify-between">
          <h1 className="font-outfit text-xl font-semibold text-txt">
            Hey, {worker.first_name}
          </h1>
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-sub">
            {today}
          </span>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Readings Submitted',  value: stats.readings_submitted },
            { label: 'Pending Approval',    value: stats.readings_pending_approval },
            { label: 'Complaints Assigned', value: stats.complaints_assigned },
            { label: 'Resolution Rate',     value: `${stats.resolution_rate}%` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-card border border-white/[0.07] rounded-2xl overflow-hidden">
              <div className="h-[1.5px] bg-elec/45 rounded-t-2xl" />
              <div className="p-5">
                <div className="font-outfit text-2xl font-semibold text-txt">{value}</div>
                <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-sub mt-1">
                  {label}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Region info card */}
        <div className="bg-card border border-white/[0.07] rounded-2xl overflow-hidden">
          <div className="h-[1.5px] bg-elec/45 rounded-t-2xl" />
          <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Region',      value: worker.region_name },
              { label: 'Postal Code', value: worker.postal_code },
              { label: 'Expertise',   value: worker.expertise },
              { label: 'Skillset',    value: worker.skillset },
            ].map(({ label, value }) => (
              <div key={label}>
                <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-sub">
                  {label}
                </div>
                <div className="font-outfit text-sm text-txt mt-1">{value || '—'}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatusPipeline
            title="Urgent Complaints"
            count={urgent_complaints.length}
            items={complaintItems}
            accent="elec"
            onCardClick={() => navigate('/fieldworker/jobs')}
            viewAllPath="/fieldworker/jobs"
          />
          <StatusPipeline
            title="Recent Readings"
            count={recent_readings.length}
            items={readingItems}
            accent="elec"
            onCardClick={() => navigate('/fieldworker/readings')}
            viewAllPath="/fieldworker/readings"
          />
        </div>

      </div>
    </>
  );
};

export default FieldWorkerDashboard;
