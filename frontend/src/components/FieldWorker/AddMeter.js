import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

const meterTypeBadgeClass = (type) => {
  if (type === 'Electricity') return 'bg-elec/10 border border-elec/30 text-elec';
  if (type === 'Water')       return 'bg-blue-500/10 border border-blue-500/30 text-blue-400';
  return                             'bg-orange-500/10 border border-orange-500/30 text-orange-400';
};

const AddMeter = () => {
  const { authFetch } = useAuth();
  const navigate = useNavigate();

  const [meters, setMeters]           = useState([]);
  const [stats, setStats]             = useState(null);
  const [metersLoading, setMetersLoading] = useState(true);
  const [statsLoading, setStatsLoading]   = useState(true);
  const [error, setError]             = useState(false);
  const [selectedMeter, setSelectedMeter] = useState(null);
  const [drawerOpen, setDrawerOpen]   = useState(false);

  useEffect(() => {
    authFetch('/api/fieldworker/meters')
      .then(r => r.json())
      .then(j => setMeters(j.data || []))
      .catch(() => setError(true))
      .finally(() => setMetersLoading(false));

    authFetch('/api/fieldworker/meters/stats')
      .then(r => r.json())
      .then(j => setStats(j))
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, [authFetch]);

  const openDrawer = (m) => {
    setSelectedMeter(m);
    setDrawerOpen(true);
  };

  const formatAddress = (m) =>
    `${m.house_num}, ${m.street_name}${m.landmark ? ', ' + m.landmark : ''}`;

  return (
    <>
      {grain}
      <div className="relative z-10 space-y-5">

        {/* Page header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-outfit text-xl font-semibold text-txt">Meters</h1>
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-sub mt-1">
              All meters in your region
            </p>
          </div>
          <button
            onClick={() => navigate('/fieldworker/add-meter/new')}
            className="px-4 py-2 bg-elec/10 border border-elec/40 text-elec rounded-xl hover:bg-elec/20 transition-all font-outfit text-sm font-semibold"
          >
            Add Meter
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          {statsLoading ? (
            [1, 2, 3].map(i => (
              <div key={i} className="animate-pulse bg-white/[0.03] rounded-2xl h-24" />
            ))
          ) : (
            [
              { label: 'Total Meters', value: stats?.total_meters ?? '—', color: 'text-txt' },
              { label: 'Active',       value: stats?.active_meters ?? '—', color: 'text-green-400' },
              { label: 'Inactive',     value: stats?.inactive_meters ?? '—', color: 'text-yellow-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-card border border-white/[0.07] rounded-2xl overflow-hidden">
                <div className="h-[1.5px] bg-elec/45 rounded-t-2xl" />
                <div className="p-4">
                  <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-sub mb-2">{label}</div>
                  <div className={`font-outfit text-3xl font-bold ${color}`}>{value}</div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Meters list */}
        {metersLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse bg-white/[0.03] rounded-xl h-16" />
            ))}
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-32">
            <p className="font-outfit text-sm text-sub">Failed to load meters.</p>
          </div>
        ) : meters.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="font-outfit text-sm text-sub">No meters found in your region.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {meters.map(m => (
              <div
                key={m.meter_id}
                className="bg-card border border-white/[0.07] rounded-xl overflow-hidden hover:border-white/[0.13] transition-all cursor-pointer"
                onClick={() => openDrawer(m)}
              >
                <div className="h-[1.5px] bg-elec/45 rounded-t-2xl" />
                <div className="p-4">
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-outfit text-sm font-semibold text-txt">
                      Meter #{m.meter_id}
                    </span>
                    <span className={`${meterTypeBadgeClass(m.meter_type)} ${BADGE} shrink-0`}>
                      {m.meter_type}
                    </span>
                  </div>
                  {/* Address */}
                  <p className="font-outfit text-sm text-sub mt-1">{formatAddress(m)}</p>
                  {/* Bottom row */}
                  <div className="flex items-center justify-between mt-3">
                    {m.is_active ? (
                      <span className={`bg-green-500/10 border border-green-500/30 text-green-400 ${BADGE}`}>
                        Active
                      </span>
                    ) : (
                      <span className={`bg-white/5 border border-white/10 text-sub ${BADGE}`}>
                        Inactive
                      </span>
                    )}
                    {m.has_active_connection && (
                      <span className="flex items-center gap-1.5 font-mono text-[10px] text-blue-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
                        Has Connection
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Side drawer — meter details */}
      <SideDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        {selectedMeter && (
          <>
            <div className="h-[1.5px] bg-elec/45" />
            <div className="p-6 border-b border-white/[0.05]">
              <h2 className="font-outfit text-lg font-semibold text-txt">
                Meter #{selectedMeter.meter_id}
              </h2>
              <div className="flex gap-2 mt-2">
                <span className={`${meterTypeBadgeClass(selectedMeter.meter_type)} ${BADGE}`}>
                  {selectedMeter.meter_type}
                </span>
                {selectedMeter.is_active ? (
                  <span className={`bg-green-500/10 border border-green-500/30 text-green-400 ${BADGE}`}>Active</span>
                ) : (
                  <span className={`bg-white/5 border border-white/10 text-sub ${BADGE}`}>Inactive</span>
                )}
              </div>
            </div>
            <div className="p-6 space-y-4">
              {[
                { label: 'Meter ID',        value: `#${selectedMeter.meter_id}` },
                { label: 'Meter Type',      value: selectedMeter.meter_type },
                { label: 'Status',          value: selectedMeter.is_active ? 'Active' : 'Inactive' },
                { label: 'Has Connection',  value: selectedMeter.has_active_connection ? 'Yes' : 'No' },
                { label: 'House Number',    value: selectedMeter.house_num },
                { label: 'Street',          value: selectedMeter.street_name },
                { label: 'Landmark',        value: selectedMeter.landmark || '—' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div className={LABEL}>{label}</div>
                  <div className="font-outfit text-sm text-txt">{value}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </SideDrawer>
    </>
  );
};

export default AddMeter;
