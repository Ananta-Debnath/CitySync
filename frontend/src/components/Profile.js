import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAvatar } from '../context/AvatarContext';

const API_BASE = {
  consumer:     '/api/consumer',
  field_worker: '/api/fieldworker',
  employee:     '/api/admin',
};

const fmtDate  = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
const initials = (f, l) => `${f?.[0] || ''}${l?.[0] || ''}`.toUpperCase();

const Section = ({ title, subtitle, icon, action, children }) => (
  <div className="bg-card border-0.5 border-white/[0.07] rounded-2xl overflow-hidden">
    <div className="h-[1.5px] bg-elec/45 rounded-t-2xl" />
    <div className="px-6 py-4 border-b border-white/[0.07] flex items-center justify-between">
      <div className="flex items-center gap-3">
        {icon && <span className="text-elec">{icon}</span>}
        <div>
          <h3 className="font-outfit text-base font-semibold text-txt">{title}</h3>
          {subtitle && <p className="font-outfit text-xs text-sub mt-1">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
    <div className="p-6">{children}</div>
  </div>
);

const InfoRow = ({ label, value, locked, onRequest }) => (
  <div className="flex flex-col md:flex-row md:items-center justify-between py-3 border-b border-white/[0.05] last:border-0">
    <div className="flex items-center gap-2 min-w-[180px]">
      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-sub">{label}</span>
      {locked && (
        <span className="px-2 py-0.5 bg-red-500/10 border border-red-500/40 text-red-400 rounded-full text-[8px] font-mono uppercase tracking-wider">
          Admin Only
        </span>
      )}
    </div>
    <div className="flex items-center gap-3 flex-1 md:justify-end mt-2 md:mt-0">
      <span className={`font-outfit text-sm font-medium ${locked ? 'text-sub' : 'text-txt'}`}>
        {value || '—'}
      </span>
      {onRequest && (
        <button
          onClick={onRequest}
          className="px-3 py-1 bg-elec/10 border border-elec/40 text-elec rounded-lg hover:bg-elec/20 transition-all font-outfit text-xs"
        >
          Request Change
        </button>
      )}
    </div>
  </div>
);

const StatPill = ({ label, value, colorClass = 'elec' }) => (
  <div className="bg-card border-0.5 border-white/[0.07] rounded-2xl overflow-hidden">
    <div className={`h-[1.5px] bg-${colorClass}/45 rounded-t-2xl`} />
    <div className="p-4 text-center">
      <div className="font-outfit text-3xl font-bold text-txt mb-1">{value ?? 0}</div>
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-sub">{label}</div>
    </div>
  </div>
);

const Profile = () => {
  const { authFetch, logout, user } = useAuth();
  const { setAvatar: setGlobalAvatar } = useAvatar();
  const navigate = useNavigate();

  const apiBase       = API_BASE[user?.role] || API_BASE.consumer;
  const isConsumer    = user?.role === 'consumer';
  const isFieldWorker = user?.role === 'field_worker';
  const isEmployee    = user?.role === 'employee';

  const [profile, setProfile]           = useState(null);
  const [loading, setLoading]           = useState(true);
  const [avatar, setAvatar]             = useState(null);
  const [avatarLoading, setAvtLoad]     = useState(false);
  const [modal, setModal]               = useState(null);
  const [requestField, setRequestField] = useState(null);
  const [toast, setToast]               = useState('');
  const fileRef = useRef(null);
  const [pwdForm, setPwdForm]           = useState({ current: '', next: '', confirm: '', error: '', loading: false });
  const [deactivateForm, setDeactivateForm] = useState({ password: '', error: '', loading: false });
  const [requestValue, setRequestValue] = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await authFetch(`${apiBase}/profile`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProfile(data);
      if (data.avatar_url) setAvatar(data.avatar_url);
    } catch (err) { console.error(err); }
    finally       { setLoading(false); }
  }, [authFetch, apiBase]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5_000_000) { showToast('Image too large. Max 5MB.'); return; }
    setAvtLoad(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET);

      const cloudRes  = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.REACT_APP_CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: 'POST', body: formData }
      );
      const cloudData = await cloudRes.json();
      if (!cloudRes.ok || cloudData.error)
        throw new Error(cloudData.error?.message || 'Upload to Cloudinary failed');

      const imageUrl = cloudData.secure_url;

      const res  = await authFetch(`${apiBase}/avatar`, {
        method: 'PUT',
        body: JSON.stringify({ avatar_url: imageUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setAvatar(imageUrl);
      setGlobalAvatar(imageUrl);
      showToast('Profile photo updated!');
    } catch (err) {
      showToast(err.message || 'Upload failed');
    } finally {
      setAvtLoad(false);
    }
  };

  const handlePasswordSubmit = async () => {
    if (!pwdForm.current || !pwdForm.next)
      return setPwdForm(f => ({ ...f, error: 'All fields are required.' }));
    if (pwdForm.next.length < 8)
      return setPwdForm(f => ({ ...f, error: 'New password must be at least 8 characters.' }));
    if (pwdForm.next !== pwdForm.confirm)
      return setPwdForm(f => ({ ...f, error: 'New passwords do not match.' }));
    setPwdForm(f => ({ ...f, loading: true, error: '' }));
    try {
      const res  = await authFetch(`${apiBase}/password`, {
        method: 'PUT',
        body: JSON.stringify({ current_password: pwdForm.current, new_password: pwdForm.next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update password.');
      setModal(null);
      setPwdForm({ current: '', next: '', confirm: '', error: '', loading: false });
      showToast('Password updated successfully!');
    } catch (err) {
      setPwdForm(f => ({ ...f, error: err.message, loading: false }));
    }
  };

  const handleDeactivate = async () => {
    if (!deactivateForm.password)
      return setDeactivateForm(f => ({ ...f, error: 'Password is required to confirm.' }));
    setDeactivateForm(f => ({ ...f, loading: true, error: '' }));
    try {
      const res  = await authFetch(`${apiBase}/deactivate`, {
        method: 'PUT',
        body: JSON.stringify({ password: deactivateForm.password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to deactivate account.');
      setModal(null);
      showToast('Account deactivated. Logging out...');
      setTimeout(() => logout(), 1800);
    } catch (err) {
      setDeactivateForm(f => ({ ...f, error: err.message, loading: false }));
    }
  };

  if (loading) return (
    <div className="max-w-[820px] mx-auto animate-pulse space-y-4">
      <div className="h-[200px] bg-white/5 rounded-2xl" />
      <div className="h-[300px] bg-white/5 rounded-2xl" />
    </div>
  );

  if (!profile) return (
    <div className="text-center py-20 font-outfit text-sm text-sub">Failed to load profile.</div>
  );

  const consumerStats = [
    { label: 'Connections',   value: profile.total_connections,   colorClass: 'elec' },
    { label: 'Bills',         value: profile.total_bills,         colorClass: 'orange-400' },
    { label: 'Applications',  value: profile.total_applications,  colorClass: 'cyan-400' },
    { label: 'Complaints',    value: profile.total_complaints,    colorClass: 'red-400' },
  ];

  const fieldWorkerStats = [
    { label: 'Total Jobs',  value: profile.total_jobs,    colorClass: 'elec' },
    { label: 'Resolved',    value: profile.resolved_jobs, colorClass: 'cyan-400' },
    { label: 'Pending',     value: profile.pending_jobs,  colorClass: 'orange-400' },
    { label: 'Readings',    value: profile.total_readings,colorClass: 'elec' },
  ];

  const employeeStats = [
    { label: 'Applications Reviewed', value: profile.applications_reviewed, colorClass: 'elec' },
    { label: 'Readings Approved',     value: profile.readings_approved,     colorClass: 'cyan-400' },
    { label: 'Complaints Assigned',   value: profile.complaints_assigned,   colorClass: 'red-400' },
    { label: 'Connections Created',   value: profile.connections_created,   colorClass: 'elec' },
  ];

  const roleText = isConsumer
    ? (profile.consumer_type || user?.role)
    : (profile.job_role || user?.role?.replace('_', ' ') || 'Staff');

  return (
    <div className="space-y-6">
      {/* Grain texture overlay */}
      <div
        className="fixed inset-0 z-[1] pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E")`
        }}
      />

      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-[100] bg-elec/10 border border-elec/40 text-elec px-6 py-3 rounded-lg shadow-lg backdrop-blur-sm">
          <p className="font-outfit text-sm font-medium">{toast}</p>
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 max-w-[820px] mx-auto pb-20">

        {/* Page header */}
        <div className="mb-6">
          <h2 className="font-outfit text-2xl font-semibold text-txt mb-2">Profile</h2>
          <p className="font-outfit text-sm text-sub">Manage your account settings and information</p>
        </div>

        {/* Profile Hero Card */}
        <div className="bg-card border-0.5 border-white/[0.07] rounded-2xl overflow-hidden mb-6">
          <div className="h-[1.5px] bg-elec/45 rounded-t-2xl" />
          <div className="p-6">
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">

              {/* Avatar */}
              <div className="relative group">
                <div className="w-24 h-24 rounded-2xl bg-elec/10 border-2 border-elec/40 flex items-center justify-center overflow-hidden">
                  {avatar
                    ? <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
                    : <span className="font-outfit text-3xl font-bold text-elec">{initials(profile?.first_name, profile?.last_name)}</span>
                  }
                </div>
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={avatarLoading}
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  <span className="font-outfit text-xs text-white font-medium">
                    {avatarLoading ? 'Uploading...' : 'Change Photo'}
                  </span>
                </button>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                {avatar && (
                  <button
                    onClick={async () => {
                      setAvtLoad(true);
                      try {
                        const res = await authFetch(`${apiBase}/avatar`, { method: 'DELETE' });
                        if (!res.ok) throw new Error('Failed to remove photo');
                        setAvatar(null);
                        setGlobalAvatar(null);
                        showToast('Profile photo removed');
                      } catch (err) {
                        showToast(err.message || 'Remove failed');
                      } finally {
                        setAvtLoad(false);
                      }
                    }}
                    title="Remove photo"
                    className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-bg border border-white/10 flex items-center justify-center font-outfit text-[10px] text-sub hover:text-red-400 hover:border-red-500/30 transition-all shadow-lg"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Name / email / role badges */}
              <div className="flex-1">
                <h1 className="font-outfit text-2xl font-bold text-txt mb-1">
                  {profile?.first_name} {profile?.last_name}
                </h1>
                <p className="font-outfit text-sm text-sub mb-3">{profile?.email}</p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-elec/10 border border-elec/40 text-elec rounded-full text-xs font-mono uppercase tracking-wider">
                    {roleText}
                  </span>
                  {profile?.is_active !== undefined && (
                    <span className={`px-3 py-1 rounded-full text-xs font-mono uppercase tracking-wider ${
                      profile.is_active
                        ? 'bg-green-500/10 border border-green-500/40 text-green-400'
                        : 'bg-red-500/10 border border-red-500/40 text-red-400'
                    }`}>
                      {profile.is_active ? 'Active' : 'Inactive'}
                    </span>
                  )}
                </div>
              </div>

              {/* Quick actions */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setModal('password')}
                  className="px-4 py-2 bg-elec/10 border border-elec/40 text-elec rounded-lg hover:bg-elec/20 transition-all font-outfit text-sm font-medium whitespace-nowrap"
                >
                  Change Password
                </button>
                {isConsumer && (
                  <button
                    onClick={() => setModal('deactivate')}
                    className="px-4 py-2 bg-red-500/10 border border-red-500/40 text-red-400 rounded-lg hover:bg-red-500/20 transition-all font-outfit text-sm font-medium whitespace-nowrap"
                  >
                    Deactivate Account
                  </button>
                )}
              </div>
            </div>

            {/* Consumer financial summary */}
            {isConsumer && (
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-6 border-t border-white/[0.07]">
                <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5 flex items-center justify-between">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-sub mb-1">Total Out-goings</div>
                    <div className="font-outfit text-2xl font-bold text-elec">৳ {parseFloat(profile.total_paid || 0).toLocaleString()}</div>
                  </div>
                  <svg className="w-8 h-8 text-elec/20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                </div>
                <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5 flex items-center justify-between">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-sub mb-1">Current Balance</div>
                    <div className="font-outfit text-2xl font-bold text-cyan-400">৳ {parseFloat(profile.total_outstanding || 0).toLocaleString()}</div>
                  </div>
                  <svg className="w-8 h-8 text-cyan-400/20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">

          {/* Identity & Personal */}
          <Section
            title="Identity & Personal"
            subtitle="Registered primary details"
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
            action={
              <button
                onClick={() => setModal('edit')}
                className="px-4 py-2 bg-white/5 border border-white/10 text-txt rounded-lg hover:border-white/20 transition-all font-outfit text-sm"
              >
                Edit Profile
              </button>
            }
          >
            <InfoRow label="Full Name" value={`${profile.first_name} ${profile.last_name}`} />
            <InfoRow label="Gender" value={profile.gender} />
            <InfoRow label="Primary Phone" value={profile.phone_number} />
            <InfoRow label="National ID (NID)" value={profile.national_id} locked />
            <InfoRow label="Date of Birth" value={fmtDate(profile.date_of_birth)} locked />
            <InfoRow
              label="Email"
              value={profile.email}
              locked={!isConsumer}
              onRequest={isConsumer ? () => setRequestField({ field: 'Email', currentValue: profile.email }) : undefined}
            />
          </Section>

          {/* Consumer stats */}
          {isConsumer && (
            <Section
              title="Activity Summary"
              subtitle="Your connections and billing overview"
              icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {consumerStats.map(s => <StatPill key={s.label} {...s} />)}
              </div>
            </Section>
          )}

          {/* Field worker stats */}
          {isFieldWorker && (
            <Section
              title="Activity Summary"
              subtitle="Your job and field activity"
              icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {fieldWorkerStats.map(s => <StatPill key={s.label} {...s} />)}
              </div>
            </Section>
          )}

          {/* Consumer billing quick-links */}
          {isConsumer && (
            <Section
              title="Billing & Payments"
              subtitle="Methods and transaction history"
              icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              action={
                <button
                  onClick={() => navigate('/consumer/payments')}
                  className="px-4 py-2 bg-white/5 border border-white/10 text-txt rounded-lg hover:border-white/20 transition-all font-outfit text-sm"
                >
                  Open Payments
                </button>
              }
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => navigate('/consumer/payments')}
                  className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5 text-left hover:border-white/[0.12] transition-all"
                >
                  <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-sub mb-1">Payment Methods</div>
                  <div className="font-outfit text-sm font-semibold text-txt">Manage saved methods</div>
                  <div className="font-outfit text-xs text-sub mt-1">Set default, add bank/mobile/Google Pay</div>
                </button>
                <button
                  onClick={() => navigate('/consumer/payments')}
                  className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5 text-left hover:border-white/[0.12] transition-all"
                >
                  <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-sub mb-1">Payment History</div>
                  <div className="font-outfit text-sm font-semibold text-txt">View transactions</div>
                  <div className="font-outfit text-xs text-sub mt-1">Tap a row to open the related bill</div>
                </button>
              </div>
            </Section>
          )}

          {/* Location & Address */}
          <Section
            title="Location & Address"
            subtitle="Utility connection root"
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
          >
            <InfoRow
              label="Address"
              value={`${profile.house_num}, ${profile.street_name}${profile.landmark ? `, ${profile.landmark}` : ''}`}
              onRequest={isConsumer ? () => setRequestField({ field: 'Address', currentValue: `${profile.house_num}, ${profile.street_name}` }) : undefined}
            />
            <InfoRow
              label="Region / Cluster"
              value={`${profile.region_name} — (P.C ${profile.postal_code})`}
              onRequest={isConsumer ? () => setRequestField({ field: 'Region', currentValue: `${profile.region_name} (${profile.postal_code})` }) : undefined}
            />
          </Section>

          {/* Employment Info */}
          {(isFieldWorker || isEmployee) && (
            <Section
              title="Employment Information"
              subtitle="Official staff records"
              icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
            >
              <InfoRow label="Designation" value={profile.job_role} locked />
              <InfoRow label="Employee Number" value={profile.employee_num} locked />
              <InfoRow label="Onboarded Date" value={fmtDate(profile.hire_date)} locked />
              <InfoRow label="Employment Status" value={profile.employment_status} locked />
              {isFieldWorker && (
                <>
                  <InfoRow label="Assigned Area" value={profile.assigned_region || 'Unassigned'} locked />
                  <InfoRow label="Specialization" value={profile.expertise || 'Generalist'} locked />
                </>
              )}
              {isEmployee && profile.assigned_region_name && (
                <InfoRow label="Assigned Region" value={profile.assigned_region_name} locked />
              )}
            </Section>
          )}

          {/* Employee activity summary */}
          {isEmployee && (
            <Section
              title="Activity Summary"
              subtitle="Your recent actions and contributions"
              icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {employeeStats.map(s => <StatPill key={s.label} {...s} />)}
              </div>
            </Section>
          )}

          {/* Security & Access */}
          <Section
            title="Security & Access"
            subtitle="Account integrity settings"
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>}
          >
            <div className="flex flex-col gap-3">
              <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5 flex items-center justify-between">
                <div>
                  <div className="font-outfit text-sm font-semibold text-txt">Account Password</div>
                  <div className="font-outfit text-xs text-sub mt-0.5">Keep your account secure with a strong password</div>
                </div>
                <button
                  onClick={() => setModal('password')}
                  className="px-4 py-2 bg-elec/10 border border-elec/40 text-elec rounded-lg hover:bg-elec/20 transition-all font-outfit text-sm font-medium"
                >
                  Update Password
                </button>
              </div>

              {isConsumer && (
                <div className="bg-red-500/[0.03] border border-red-500/[0.15] rounded-2xl p-5 flex items-center justify-between">
                  <div>
                    <div className="font-outfit text-sm font-semibold text-red-400">Deactivate Account</div>
                    <div className="font-outfit text-xs text-sub mt-0.5">Requires admin reactivation</div>
                  </div>
                  <button
                    onClick={() => setModal('deactivate')}
                    className="px-4 py-2 bg-red-500/10 border border-red-500/40 text-red-400 rounded-lg hover:bg-red-500/20 transition-all font-outfit text-sm font-medium"
                  >
                    Terminate Access
                  </button>
                </div>
              )}
            </div>
          </Section>
        </div>

        {/* ── Modals ── */}

        {/* Edit Profile modal */}
        {modal === 'edit' && (
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setModal(null)}
          >
            <div className="bg-card border-0.5 border-white/[0.07] rounded-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
              <div className="h-[1.5px] bg-elec/45 rounded-t-2xl" />
              <div className="p-6 border-b border-white/[0.07]">
                <h3 className="font-outfit text-lg font-semibold text-txt">Edit Basic Info</h3>
                <p className="font-outfit text-xs text-sub mt-1">View your profile details</p>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-mono text-[10px] uppercase tracking-[0.12em] text-sub mb-2 block">First Name</label>
                    <input value={profile.first_name} readOnly className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 font-outfit text-sm text-txt" />
                  </div>
                  <div>
                    <label className="font-mono text-[10px] uppercase tracking-[0.12em] text-sub mb-2 block">Last Name</label>
                    <input value={profile.last_name} readOnly className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 font-outfit text-sm text-txt" />
                  </div>
                </div>
                <div className="font-outfit text-xs text-sub leading-relaxed bg-white/5 p-4 rounded-xl border border-white/[0.07]">
                  Real-time editing is limited to avatar. For field changes, use the 'Request Change' flow to ensure data integrity through admin review.
                </div>
              </div>
              <div className="p-6 border-t border-white/[0.07] flex justify-end">
                <button
                  onClick={() => setModal(null)}
                  className="px-4 py-2 bg-elec/10 border border-elec/40 text-elec rounded-lg hover:bg-elec/20 transition-all font-outfit text-sm font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Request field change modal */}
        {requestField && (
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => { setRequestField(null); setRequestValue(''); }}
          >
            <div className="bg-card border-0.5 border-white/[0.07] rounded-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
              <div className="h-[1.5px] bg-elec/45 rounded-t-2xl" />
              <div className="p-6 border-b border-white/[0.07]">
                <h3 className="font-outfit text-lg font-semibold text-txt">Request {requestField.field} Change</h3>
                <p className="font-outfit text-xs text-sub mt-1">An employee will review and update your records.</p>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-white/5 p-4 rounded-xl border border-white/[0.07]">
                  <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-sub mb-1">Current Value</div>
                  <div className="font-outfit text-sm font-medium text-txt">{requestField.currentValue}</div>
                </div>
                <div>
                  <label className="font-mono text-[10px] uppercase tracking-[0.12em] text-elec mb-2 block">Proposed Change</label>
                  <textarea
                    rows="2"
                    placeholder="Type new value here..."
                    value={requestValue}
                    onChange={e => setRequestValue(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 font-outfit text-sm text-txt outline-none focus:border-elec/40 transition-all placeholder:text-sub"
                  />
                </div>
              </div>
              <div className="p-6 border-t border-white/[0.07] flex justify-end gap-3">
                <button
                  onClick={() => { setRequestField(null); setRequestValue(''); }}
                  className="px-4 py-2 bg-white/5 border border-white/10 text-txt rounded-lg hover:border-white/20 transition-all font-outfit text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { setRequestField(null); setRequestValue(''); showToast('Change request submitted!'); }}
                  className="px-4 py-2 bg-elec/10 border border-elec/40 text-elec rounded-lg hover:bg-elec/20 transition-all font-outfit text-sm font-medium"
                >
                  Send Request
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Password modal */}
        {modal === 'password' && (
          <div
            role="dialog"
            aria-label="Update password"
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => { setModal(null); setPwdForm({ current: '', next: '', confirm: '', error: '', loading: false }); }}
          >
            <div className="bg-card border-0.5 border-white/[0.07] rounded-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
              <div className="h-[1.5px] bg-elec/45 rounded-t-2xl" />
              <div className="p-6 border-b border-white/[0.07]">
                <h3 className="font-outfit text-lg font-semibold text-txt">Update Password</h3>
                <p className="font-outfit text-xs text-sub mt-1">Choose a strong password of at least 8 characters.</p>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="font-mono text-[10px] uppercase tracking-[0.12em] text-sub mb-2 block">Current Password</label>
                  <input
                    type="password"
                    placeholder="Current password"
                    value={pwdForm.current}
                    onChange={e => setPwdForm(f => ({ ...f, current: e.target.value, error: '' }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 font-outfit text-sm text-txt outline-none focus:border-elec/40 transition-all placeholder:text-sub"
                  />
                </div>
                <div>
                  <label className="font-mono text-[10px] uppercase tracking-[0.12em] text-sub mb-2 block">New Password</label>
                  <input
                    type="password"
                    placeholder="New password"
                    value={pwdForm.next}
                    onChange={e => setPwdForm(f => ({ ...f, next: e.target.value, error: '' }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 font-outfit text-sm text-txt outline-none focus:border-elec/40 transition-all placeholder:text-sub"
                  />
                </div>
                <div>
                  <label className="font-mono text-[10px] uppercase tracking-[0.12em] text-sub mb-2 block">Confirm New Password</label>
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    value={pwdForm.confirm}
                    onChange={e => setPwdForm(f => ({ ...f, confirm: e.target.value, error: '' }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 font-outfit text-sm text-txt outline-none focus:border-elec/40 transition-all placeholder:text-sub"
                  />
                </div>
                {pwdForm.error && (
                  <div className="font-outfit text-xs text-red-400 bg-red-500/10 border border-red-500/40 rounded-xl px-4 py-2.5">
                    {pwdForm.error}
                  </div>
                )}
              </div>
              <div className="p-6 border-t border-white/[0.07] flex justify-end gap-3">
                <button
                  onClick={() => { setModal(null); setPwdForm({ current: '', next: '', confirm: '', error: '', loading: false }); }}
                  className="px-4 py-2 bg-white/5 border border-white/10 text-txt rounded-lg hover:border-white/20 transition-all font-outfit text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePasswordSubmit}
                  disabled={pwdForm.loading}
                  className="px-4 py-2 bg-elec/10 border border-elec/40 text-elec rounded-lg hover:bg-elec/20 transition-all font-outfit text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {pwdForm.loading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Deactivate modal */}
        {modal === 'deactivate' && (
          <div
            role="dialog"
            aria-label="Deactivate account"
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => { setModal(null); setDeactivateForm({ password: '', error: '', loading: false }); }}
          >
            <div className="bg-card border-0.5 border-red-500/[0.15] rounded-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
              <div className="h-[1.5px] bg-red-500/45 rounded-t-2xl" />
              <div className="p-6 border-b border-white/[0.07]">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/40 flex items-center justify-center">
                    <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                  </div>
                  <h3 className="font-outfit text-lg font-semibold text-red-400">Deactivate Account</h3>
                </div>
                <p className="font-outfit text-xs text-sub mt-1">
                  This will suspend all active utility connections and requires admin reactivation.
                </p>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="font-mono text-[10px] uppercase tracking-[0.12em] text-sub mb-2 block">Confirm Password</label>
                  <input
                    type="password"
                    placeholder="Your current password"
                    value={deactivateForm.password}
                    onChange={e => setDeactivateForm(f => ({ ...f, password: e.target.value, error: '' }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 font-outfit text-sm text-txt outline-none focus:border-red-500/40 transition-all placeholder:text-sub"
                  />
                </div>
                {deactivateForm.error && (
                  <div className="font-outfit text-xs text-red-400 bg-red-500/10 border border-red-500/40 rounded-xl px-4 py-2.5">
                    {deactivateForm.error}
                  </div>
                )}
              </div>
              <div className="p-6 border-t border-white/[0.07] flex justify-end gap-3">
                <button
                  onClick={() => { setModal(null); setDeactivateForm({ password: '', error: '', loading: false }); }}
                  className="px-4 py-2 bg-white/5 border border-white/10 text-txt rounded-lg hover:border-white/20 transition-all font-outfit text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeactivate}
                  disabled={deactivateForm.loading || !deactivateForm.password}
                  className="px-4 py-2 bg-red-500/10 border border-red-500/40 text-red-400 rounded-lg hover:bg-red-500/20 transition-all font-outfit text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {deactivateForm.loading ? 'Deactivating...' : 'Confirm Deactivation'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Profile;
