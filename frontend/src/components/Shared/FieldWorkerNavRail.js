import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Gauge,
  PlusCircle,
  Briefcase,
  UserCircle,
  LogOut,
} from 'lucide-react';

const FieldWorkerNavRail = () => {
  const [expanded, setExpanded] = useState(false);
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { label: 'Dashboard',      path: '/fieldworker/dashboard',  Icon: LayoutDashboard },
    { label: 'Meter Readings', path: '/fieldworker/readings',   Icon: Gauge },
    { label: 'Add Meter',      path: '/fieldworker/add-meter',  Icon: PlusCircle },
    { label: 'My Jobs',        path: '/fieldworker/jobs',       Icon: Briefcase },
    { label: 'Profile',        path: '/fieldworker/profile',    Icon: UserCircle },
  ];

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside
      className={`fixed left-3 top-3 bottom-3 z-50 bg-bg/[0.88] backdrop-blur-glass border-0.5 border-white/[0.07] rounded-2xl transition-all duration-300 ease-out flex flex-col ${
        expanded ? 'w-[220px]' : 'w-14'
      }`}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-3 border-b border-white/[0.05] shrink-0">
        <div className="w-9 h-9 rounded-xl bg-elec flex items-center justify-center shadow-lg shadow-elec/10 shrink-0">
          <span className="text-bg text-lg font-bold">C</span>
        </div>
        {expanded && (
          <div className="ml-3 animate-fade-in">
            <span className="font-barlow text-lg font-bold tracking-tight text-txt">
              City<span className="text-elec">Sync</span>
            </span>
          </div>
        )}
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto scrollbar-hide">
        {navItems.map((item) => {
          const active = isActive(item.path);
          const Icon = item.Icon;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative group ${
                active
                  ? 'bg-white/[0.05] text-elec'
                  : 'text-txt/40 hover:bg-white/[0.02] hover:text-txt/80'
              } ${expanded ? '' : 'justify-center'}`}
            >
              {/* Active stripe */}
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-elec rounded-r-full" />
              )}

              {/* Icon */}
              <Icon
                className={`w-5 h-5 transition-transform ${
                  active ? 'scale-110' : 'group-hover:scale-110'
                }`}
                strokeWidth={active ? 2.5 : 2}
              />

              {/* Label */}
              {expanded && (
                <span className={`font-outfit text-[13px] font-semibold tracking-tight animate-fade-in ${
                  active ? 'text-txt' : ''
                }`}>
                  {item.label}
                </span>
              )}

              {/* Tooltip (when collapsed) */}
              {!expanded && (
                <div className="absolute left-full ml-4 px-3 py-2 bg-card border border-white/10 rounded-xl font-mono text-[9px] uppercase tracking-widest text-elec opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-2xl">
                  {item.label}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-2 border-t border-white/[0.05] shrink-0">
        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-status-error/60 hover:text-status-error hover:bg-status-error/5 transition-all group ${
            expanded ? '' : 'justify-center'
          }`}
        >
          <LogOut
            className="w-5 h-5 transition-transform group-hover:scale-110"
            strokeWidth={2}
          />
          {expanded && (
            <span className="font-outfit text-[13px] font-semibold tracking-tight animate-fade-in">
              Sign Out
            </span>
          )}
        </button>
      </div>
    </aside>
  );
};

export default FieldWorkerNavRail;
