import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { MapPin } from 'lucide-react';

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

const Spinner = () => (
  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
  </svg>
);

const AddMeterForm = () => {
  const { authFetch } = useAuth();
  const navigate = useNavigate();

  const [meterType, setMeterType]   = useState('');
  const [houseNum, setHouseNum]     = useState('');
  const [streetName, setStreetName] = useState('');
  const [landmark, setLandmark]     = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]       = useState('');
  const [error, setError]           = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const res = await authFetch('/api/fieldworker/meters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meter_type:  meterType,
          house_num:   houseNum,
          street_name: streetName,
          landmark:    landmark.trim() || null,
        }),
      });

      if (!res.ok) {
        const j = await res.json();
        setError(j.error || 'Failed to register meter. Please try again.');
        return;
      }

      setSuccess('Meter registered successfully! Redirecting...');
      setTimeout(() => navigate('/fieldworker/add-meter'), 1500);
    } catch {
      setError('Failed to register meter. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {grain}
      <div className="relative z-10 space-y-5">

        {/* Page header */}
        <div>
          <button
            onClick={() => navigate('/fieldworker/add-meter')}
            className="flex items-center gap-2 text-sub hover:text-txt transition-colors font-outfit text-sm mb-3"
          >
            ← Back
          </button>
          <h1 className="font-outfit text-2xl font-semibold text-txt">Add New Meter</h1>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-sub mt-1">
            Register a new meter in your region
          </p>
        </div>

        {/* Form card */}
        <div className="bg-card border border-white/[0.07] rounded-2xl overflow-hidden">
          <div className="h-[1.5px] bg-elec/45 rounded-t-2xl" />
          <form onSubmit={handleSubmit} className="p-6 space-y-5">

            {/* Meter Type */}
            <div>
              <div className={LABEL}>Meter Type</div>
              <select
                className={INPUT}
                value={meterType}
                onChange={e => setMeterType(e.target.value)}
                required
              >
                <option value="">Select a type...</option>
                <option value="Electricity">Electricity</option>
                <option value="Water">Water</option>
                <option value="Gas">Gas</option>
              </select>
            </div>

            {/* House Number */}
            <div>
              <div className={LABEL}>House Number</div>
              <input
                type="text"
                className={INPUT}
                value={houseNum}
                onChange={e => setHouseNum(e.target.value)}
                placeholder="e.g. 42A"
                required
              />
            </div>

            {/* Street Name */}
            <div>
              <div className={LABEL}>Street Name</div>
              <input
                type="text"
                className={INPUT}
                value={streetName}
                onChange={e => setStreetName(e.target.value)}
                placeholder="e.g. Mirpur Road"
                required
              />
            </div>

            {/* Landmark */}
            <div>
              <div className={LABEL}>Landmark (Optional)</div>
              <input
                type="text"
                className={INPUT}
                value={landmark}
                onChange={e => setLandmark(e.target.value)}
                placeholder="e.g. Near City Hospital"
              />
            </div>

            {/* Region notice */}
            <div className="flex items-center gap-3 bg-elec/5 border border-elec/20 rounded-xl px-4 py-3">
              <MapPin className="text-elec w-4 h-4 shrink-0" />
              <p className="font-outfit text-sm text-sub">
                This meter will be registered in your assigned region.
              </p>
            </div>

            {/* Feedback messages */}
            {success && (
              <div className="bg-green-500/10 border border-green-500/30 text-green-400 rounded-xl px-4 py-3 font-outfit text-sm">
                {success}
              </div>
            )}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 font-outfit text-sm">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-elec/10 border border-elec/40 text-elec rounded-xl hover:bg-elec/20 transition-all font-outfit text-sm font-semibold mt-2 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {submitting && <Spinner />}
              {submitting ? 'Registering...' : 'Register Meter'}
            </button>

          </form>
        </div>

      </div>
    </>
  );
};

export default AddMeterForm;
