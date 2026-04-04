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
const INPUT = 'w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-3 font-outfit text-sm text-txt focus:border-elec/40 focus:outline-none';

const MeterReading = () => {
  const { authFetch } = useAuth();

  const [activeTab, setActiveTab] = useState('submit');

  // Form data
  const [meters, setMeters] = useState([]);
  const [slabs, setSlabs] = useState([]);
  const [slabsLoading, setSlabsLoading] = useState(false);
  const [selectedMeter, setSelectedMeter] = useState('');
  const [meterTariff, setMeterTariff] = useState(null);
  const [selectedSlab, setSelectedSlab] = useState('');
  const [timeFrom, setTimeFrom] = useState('');
  const [timeTo, setTimeTo] = useState('');
  const [unitsLogged, setUnitsLogged] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [submitError, setSubmitError] = useState('');

  // History data
  const [readings, setReadings] = useState([]);
  const [readingsLoading, setReadingsLoading] = useState(true);
  const [historyFilter, setHistoryFilter] = useState('all');
  const [selectedReading, setSelectedReading] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    authFetch('/api/fieldworker/meters')
      .then(r => r.json())
      .then(j => setMeters(j.data || []))
      .catch(() => {});

    authFetch('/api/fieldworker/readings')
      .then(r => r.json())
      .then(j => setReadings(j.data || []))
      .catch(() => {})
      .finally(() => setReadingsLoading(false));
  }, [authFetch]);

  const handleMeterChange = (e) => {
    const meterId = e.target.value;
    setSelectedMeter(meterId);
    setSelectedSlab('');
    setSlabs([]);

    const meter = meters.find(m => String(m.meter_id) === String(meterId));
    if (!meter || !meter.tariff_id) { setMeterTariff(null); return; }

    setMeterTariff({ tariff_id: meter.tariff_id, tariff_name: meter.tariff_name, consumer_category: meter.consumer_category, billing_method: meter.billing_method });
    setSlabsLoading(true);
    authFetch(`/api/fieldworker/tariffs/${meter.tariff_id}/slabs`)
      .then(r => r.json())
      .then(j => setSlabs(j.data || []))
      .catch(() => {})
      .finally(() => setSlabsLoading(false));
  };

  const resetForm = () => {
    setSelectedMeter('');
    setMeterTariff(null);
    setSelectedSlab('');
    setTimeFrom('');
    setTimeTo('');
    setUnitsLogged('');
    setSlabs([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitSuccess('');

    if (new Date(timeTo) <= new Date(timeFrom)) {
      setSubmitError('Time To must be after Time From.');
      return;
    }
    if (parseFloat(unitsLogged) <= 0) {
      setSubmitError('Units Logged must be greater than 0.');
      return;
    }

    if (!meterTariff) {
      setSubmitError('Selected meter has no active tariff.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await authFetch('/api/fieldworker/readings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meter_id: selectedMeter,
          tariff_id: meterTariff?.tariff_id,
          slab_num: selectedSlab,
          time_from: timeFrom,
          time_to: timeTo,
          units_logged: parseFloat(unitsLogged),
        }),
      });
      if (!res.ok) {
        const j = await res.json();
        setSubmitError(j.error || 'Failed to submit reading.');
        return;
      }
      setSubmitSuccess('Reading submitted successfully. Awaiting approval.');
      resetForm();
      authFetch('/api/fieldworker/readings')
        .then(r => r.json())
        .then(j => setReadings(j.data || []))
        .catch(() => {});
    } catch {
      setSubmitError('Failed to submit reading.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredReadings = readings.filter(r => {
    if (historyFilter === 'approved') return r.approved_by !== null;
    if (historyFilter === 'pending') return r.approved_by === null;
    return true;
  });

  const tabClass = (tab) =>
    activeTab === tab
      ? 'bg-elec/10 border border-elec/40 text-elec rounded-lg px-4 py-2 font-outfit text-sm font-medium'
      : 'bg-white/5 border border-white/10 text-sub rounded-lg px-4 py-2 font-outfit text-sm font-medium';

  const filterClass = (f) =>
    historyFilter === f
      ? 'bg-elec/10 border border-elec/40 text-elec rounded-lg px-3 py-1.5 font-outfit text-sm font-medium'
      : 'bg-white/5 border border-white/10 text-sub rounded-lg px-3 py-1.5 font-outfit text-sm font-medium';

  const formatDate = (ts) => {
    if (!ts) return '—';
    return new Date(ts).toLocaleString();
  };

  return (
    <>
      {grain}
      <div className="relative z-10 space-y-5">

        {/* Page header */}
        <div>
          <h1 className="font-outfit text-xl font-semibold text-txt">Meter Readings</h1>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-sub mt-1">
            Submit and track your readings
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2">
          <button className={tabClass('submit')} onClick={() => setActiveTab('submit')}>
            Submit Reading
          </button>
          <button className={tabClass('history')} onClick={() => setActiveTab('history')}>
            History
          </button>
        </div>

        {/* TAB 1: Submit Reading */}
        {activeTab === 'submit' && (
          <div className="bg-card border border-white/[0.07] rounded-2xl overflow-hidden">
            <div className="h-[1.5px] bg-elec/45 rounded-t-2xl" />
            <form onSubmit={handleSubmit} className="p-5 space-y-5">

              {/* Meter */}
              <div>
                <div className={LABEL}>Meter</div>
                <select
                  className={INPUT}
                  value={selectedMeter}
                  onChange={handleMeterChange}
                  required
                >
                  <option value="">Select a meter...</option>
                  {meters.map(m => (
                    <option key={m.meter_id} value={m.meter_id}>
                      Meter #{m.meter_id} — {m.meter_type} · {m.house_num} {m.street_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tariff — read-only, resolved from selected meter */}
              <div>
                <div className={LABEL}>Tariff</div>
                <div className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-3 min-h-[46px]">
                  {meterTariff ? (
                    <div>
                      <span className="font-outfit text-sm text-txt">{meterTariff.tariff_name}</span>
                      <span className="font-mono text-[10px] text-sub ml-2">
                        {meterTariff.consumer_category} · {meterTariff.billing_method}
                      </span>
                    </div>
                  ) : (
                    <span className="font-outfit text-sm text-sub">
                      {selectedMeter ? 'No active tariff for this meter' : 'Select a meter first'}
                    </span>
                  )}
                </div>
              </div>

              {/* Slab */}
              <div>
                <div className={LABEL}>Slab</div>
                <select
                  className={INPUT}
                  value={selectedSlab}
                  onChange={e => setSelectedSlab(e.target.value)}
                  disabled={!meterTariff || slabsLoading}
                  required
                >
                  <option value="">
                    {slabsLoading ? 'Loading slabs...' : 'Select a slab...'}
                  </option>
                  {slabs.map(s => (
                    <option key={s.slab_num} value={s.slab_num}>
                      Slab {s.slab_num} — {s.charge_type} · {s.unit_from} to {s.unit_to ?? '∞'} @ {s.rate_per_unit}/unit
                    </option>
                  ))}
                </select>
              </div>

              {/* Time From & Time To */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className={LABEL}>Time From</div>
                  <input
                    type="datetime-local"
                    className={INPUT}
                    value={timeFrom}
                    onChange={e => setTimeFrom(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <div className={LABEL}>Time To</div>
                  <input
                    type="datetime-local"
                    className={INPUT}
                    value={timeTo}
                    onChange={e => setTimeTo(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Units Logged */}
              <div>
                <div className={LABEL}>Units Logged</div>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={INPUT}
                  value={unitsLogged}
                  onChange={e => setUnitsLogged(e.target.value)}
                  required
                />
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-elec/10 border border-elec/40 text-elec rounded-xl hover:bg-elec/20 transition-all font-outfit text-sm font-semibold flex items-center justify-center gap-2"
              >
                {submitting && (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                )}
                {submitting ? 'Submitting...' : 'Submit Reading'}
              </button>

              {submitSuccess && (
                <p className="font-outfit text-sm text-green-400 text-center">{submitSuccess}</p>
              )}
              {submitError && (
                <p className="font-outfit text-sm text-red-400 text-center">{submitError}</p>
              )}
            </form>
          </div>
        )}

        {/* TAB 2: History */}
        {activeTab === 'history' && (
          <div className="space-y-4">

            {/* Filter bar */}
            <div className="flex gap-2">
              {['all', 'pending', 'approved'].map(f => (
                <button key={f} className={filterClass(f)} onClick={() => setHistoryFilter(f)}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            {/* Readings list */}
            {readingsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse bg-white/[0.03] rounded-xl h-16" />
                ))}
              </div>
            ) : filteredReadings.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <p className="font-outfit text-sm text-sub">No readings submitted yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredReadings.map(r => (
                  <div
                    key={r.reading_id}
                    className="bg-card border border-white/[0.07] rounded-xl p-4 hover:border-white/[0.13] transition-all cursor-pointer"
                    onClick={() => { setSelectedReading(r); setDrawerOpen(true); }}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-outfit text-sm font-semibold text-txt">Meter #{r.meter_id}</div>
                        <div className="font-mono text-[10px] text-sub mt-0.5">
                          {r.units_logged} units · Slab {r.slab_num}
                        </div>
                      </div>
                      {r.approved_by !== null ? (
                        <span className="bg-green-500/10 border border-green-500/30 text-green-400 font-mono text-[9px] uppercase tracking-widest px-2 py-1 rounded-lg">
                          Approved
                        </span>
                      ) : (
                        <span className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 font-mono text-[9px] uppercase tracking-widest px-2 py-1 rounded-lg">
                          Pending
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-[10px] text-sub mt-2">
                      {formatDate(r.time_from)} → {formatDate(r.time_to)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Reading detail drawer */}
      <SideDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        {selectedReading && (
          <>
            <div className="h-[1.5px] bg-elec/45" />
            <div className="p-6 pt-12 space-y-6">
              <div>
                <h2 className="font-outfit text-lg font-semibold text-txt">Reading Details</h2>
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-sub mt-1">
                  #{selectedReading.reading_id}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Meter ID',     value: `#${selectedReading.meter_id}` },
                  { label: 'Meter Type',   value: selectedReading.meter_type || '—' },
                  { label: 'Tariff ID',    value: selectedReading.tariff_id },
                  { label: 'Slab',         value: `Slab ${selectedReading.slab_num}` },
                  { label: 'Units Logged', value: selectedReading.units_logged },
                  { label: 'Status',       value: selectedReading.approved_by !== null ? 'Approved' : 'Pending' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-sub">{label}</div>
                    <div className="font-outfit text-sm text-txt mt-1">{value}</div>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                {[
                  { label: 'Time From',    value: formatDate(selectedReading.time_from) },
                  { label: 'Time To',      value: formatDate(selectedReading.time_to) },
                  { label: 'Reading Date', value: formatDate(selectedReading.reading_date) },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-sub">{label}</div>
                    <div className="font-outfit text-sm text-txt mt-1">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </SideDrawer>
    </>
  );
};

export default MeterReading;
