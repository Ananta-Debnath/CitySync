import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Zap, Droplet, Flame, AlertCircle, Clock } from 'lucide-react';
import { getRegionalAnalytics } from '../../../services/api';
import Tooltip from './Tooltip';

const grain = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E")`;

const TABS       = ['revenue', 'productivity', 'regions'];
const TAB_LABELS = { revenue: 'Revenue', productivity: 'Productivity', regions: 'Regions' };

const statusCfg = {
  Available:  { color: '#44ff99', bg: 'rgba(68,255,153,0.08)',  stripe: '#44ff99' },
  Limited:    { color: '#FF9900', bg: 'rgba(255,153,0,0.08)',   stripe: '#FF9900' },
  Overloaded: { color: '#FF5757', bg: 'rgba(255,87,87,0.08)',   stripe: '#FF5757' },
  Closed:     { color: '#888888', bg: 'rgba(136,136,136,0.08)', stripe: '#888888' },
};

const fmtNum = (n) => Number(n) >= 1000 ? `${(Number(n) / 1000).toFixed(1)}k` : String(Number(n) || 0);

const RegionCard = ({ region, onClick }) => {
  const cfg = statusCfg[region.status] || statusCfg.Available;
  const capPct = region.capacity_pct || 0;

  return (
    <div
      onClick={onClick}
      className="bg-card border-0.5 border-white/[0.07] rounded-2xl overflow-hidden cursor-pointer hover:border-white/[0.12] transition-all hover:scale-[1.01] animate-fade-in group"
    >
      <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${cfg.stripe}, ${cfg.stripe}60, transparent)` }} />

      <div className="p-5">
        {/* Title row */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${cfg.stripe}15` }}>
              <MapPin size={15} style={{ color: cfg.stripe }} />
            </div>
            <div>
              <div className="font-outfit text-sm font-semibold text-txt leading-none">{region.name}</div>
              <div className="font-mono text-[9px] text-muted mt-0.5 uppercase tracking-wider">{region.postal_code}</div>
            </div>
          </div>
          <span
            className="font-mono text-[9px] uppercase tracking-wider px-2 py-1 rounded-lg"
            style={{ color: cfg.color, background: cfg.bg }}
          >
            {region.status}
          </span>
        </div>

        {/* Capacity bar */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1">
            <Tooltip text="Current active+pending connections vs the configured max capacity for this region">
              <span className="font-mono text-[8px] text-muted uppercase tracking-wider">Capacity</span>
            </Tooltip>
            <span className="font-mono text-[9px]" style={{ color: cfg.color }}>
              {region.current_connections}/{region.max_connections}
            </span>
          </div>
          <div className="h-1 w-full rounded-full bg-white/[0.05] overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.min(capPct, 100)}%`, background: cfg.stripe, opacity: 0.7 }}
            />
          </div>
        </div>

        {/* Connection counts */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="flex flex-col items-center gap-1 bg-white/[0.03] rounded-xl p-2.5">
            <Zap size={12} className="text-elec" />
            <span className="font-barlow text-base font-bold text-txt leading-none">{fmtNum(region.electricity)}</span>
            <span className="font-mono text-[8px] text-muted uppercase tracking-wider">Elec</span>
          </div>
          <div className="flex flex-col items-center gap-1 bg-white/[0.03] rounded-xl p-2.5">
            <Droplet size={12} className="text-water" />
            <span className="font-barlow text-base font-bold text-txt leading-none">{fmtNum(region.water)}</span>
            <span className="font-mono text-[8px] text-muted uppercase tracking-wider">Water</span>
          </div>
          <div className="flex flex-col items-center gap-1 bg-white/[0.03] rounded-xl p-2.5">
            <Flame size={12} className="text-gas" />
            <span className="font-barlow text-base font-bold" style={{ color: Number(region.gas) === 0 ? 'rgba(232,232,232,0.2)' : '#E8E8E8' }}>
              {Number(region.gas) === 0 ? '—' : fmtNum(region.gas)}
            </span>
            <span className="font-mono text-[8px] text-muted uppercase tracking-wider">Gas</span>
          </div>
        </div>

        {/* Pending + Complaints */}
        <div className="flex gap-3">
          <div className="flex-1 flex items-center gap-2 bg-white/[0.03] rounded-lg px-3 py-2">
            <Clock size={11} className="text-status-warning flex-shrink-0" />
            <Tooltip text="Pending new connection requests in this region">
              <span className="font-mono text-[9px] text-muted flex-1">Pending</span>
            </Tooltip>
            <span className="font-barlow text-sm font-bold" style={{ color: Number(region.pending) > 20 ? '#FF9900' : '#E8E8E8' }}>
              {region.pending}
            </span>
          </div>
          <div className="flex-1 flex items-center gap-2 bg-white/[0.03] rounded-lg px-3 py-2">
            <AlertCircle size={11} className="text-status-error flex-shrink-0" />
            <Tooltip text="Open (unresolved) complaints in this region">
              <span className="font-mono text-[9px] text-muted flex-1">Open</span>
            </Tooltip>
            <span className="font-barlow text-sm font-bold" style={{ color: Number(region.complaints) > 10 ? '#FF5757' : '#E8E8E8' }}>
              {region.complaints}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const RegionalHeatmap = () => {
  const navigate = useNavigate();
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRegionalAnalytics()
      .then(res => setRegions(res.data.regions || []))
      .catch(err => console.error('Regional analytics:', err))
      .finally(() => setLoading(false));
  }, []);

  const counts = {
    available:  regions.filter(r => r.status === 'Available').length,
    limited:    regions.filter(r => r.status === 'Limited').length,
    overloaded: regions.filter(r => r.status === 'Overloaded' || r.status === 'Closed').length,
  };

  return (
    <div className="relative">
      <div className="fixed inset-0 z-[1] pointer-events-none opacity-[0.04]" style={{ backgroundImage: grain }} />

      <div className="relative z-10 space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-elec mb-2">Employee Portal</div>
            <h1 className="font-outfit text-2xl font-semibold text-txt tracking-tight">Regional Overview</h1>
            <p className="font-outfit text-sm text-sub mt-1">Capacity status and service load across all regions</p>
          </div>
          <div className="flex gap-1 bg-card border-0.5 border-white/[0.07] rounded-xl p-1 w-fit">
            {TABS.map(tab => (
              <button key={tab} onClick={() => navigate(`/employee/analytics/${tab}`)}
                className={`px-4 py-1.5 rounded-lg font-mono text-[10px] uppercase tracking-wider transition-all ${
                  tab === 'regions' ? 'bg-white/[0.08] text-txt' : 'text-muted hover:text-sub'
                }`}>
                {TAB_LABELS[tab]}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-4 animate-pulse">
            <div className="grid grid-cols-3 gap-4">
              {[1,2,3].map(i => <div key={i} className="h-20 bg-card border-0.5 border-white/[0.07] rounded-2xl" />)}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1,2,3,4,5,6].map(i => <div key={i} className="h-56 bg-card border-0.5 border-white/[0.07] rounded-2xl" />)}
            </div>
          </div>
        ) : (
          <>
            {/* Status summary */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Available',        count: counts.available,  color: '#44ff99',
                  tooltip: 'Regions with capacity below 70% and accepting connections' },
                { label: 'Limited',          count: counts.limited,    color: '#FF9900',
                  tooltip: 'Regions at 70–89% capacity — connections may be slow to process' },
                { label: 'Overloaded/Closed', count: counts.overloaded, color: '#FF5757',
                  tooltip: 'Regions at ≥90% capacity or manually closed to new connections' },
              ].map(({ label, count, color, tooltip }) => (
                <div key={label} className="bg-card border-0.5 border-white/[0.07] rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-2 h-8 rounded-full" style={{ background: color, opacity: 0.7 }} />
                  <div>
                    <div className="font-barlow text-2xl font-bold text-txt leading-none">{count}</div>
                    <Tooltip text={tooltip}>
                      <div className="font-mono text-[9px] uppercase tracking-wider text-muted mt-0.5">{label}</div>
                    </Tooltip>
                  </div>
                </div>
              ))}
            </div>

            {/* Overview stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Total Regions',     value: regions.length,                                                   tooltip: 'Total number of service regions' },
                { label: 'Elec Connections',  value: regions.reduce((s, r) => s + Number(r.electricity || 0), 0).toLocaleString(), tooltip: 'Total active electricity connections across all regions' },
                { label: 'Water Connections', value: regions.reduce((s, r) => s + Number(r.water || 0), 0).toLocaleString(),       tooltip: 'Total active water connections across all regions' },
                { label: 'Gas Connections',   value: regions.reduce((s, r) => s + Number(r.gas || 0), 0).toLocaleString(),         tooltip: 'Total active gas connections across all regions' },
              ].map(({ label, value, tooltip }) => (
                <div key={label} className="bg-card border-0.5 border-white/[0.07] rounded-2xl p-4">
                  <Tooltip text={tooltip}>
                    <div className="font-mono text-[9px] uppercase tracking-wider text-muted mb-1">{label}</div>
                  </Tooltip>
                  <div className="font-barlow text-2xl font-bold text-txt">{value}</div>
                </div>
              ))}
            </div>

            {/* Region grid */}
            {regions.length === 0 ? (
              <div className="bg-card border-0.5 border-white/[0.07] rounded-2xl p-12 text-center">
                <p className="font-outfit text-sub">No regions found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {regions.map(r => (
                  <RegionCard
                    key={r.id}
                    region={r}
                    onClick={() => navigate('/employee/regions')}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default RegionalHeatmap;
