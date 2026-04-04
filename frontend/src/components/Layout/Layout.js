import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import AIAssistant from '../AIAssistant';
import ConsumerHeader from './ConsumerHeader';
import FloatingNavRail from '../Employee/Shared/FloatingNavRail';
import FieldWorkerNavRail from '../Shared/FieldWorkerNavRail';
import DotGrid from './DotGrid';

const Layout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuth();

  const isConsumer    = user?.role === 'consumer';
  const isEmployee    = user?.role === 'employee';
  const isFieldWorker = user?.role === 'field_worker';
  const sidebarWidth  = collapsed ? 68 : 240;

  const showAI = isConsumer || isEmployee;

  // margin: consumer=0, employee/fieldworker=80px (rail 56px + 12px left offset + 12px gap), others=sidebarWidth
  const marginLeft = isConsumer ? 0 : (isEmployee || isFieldWorker) ? 80 : sidebarWidth;

  return (
    <div className="flex min-h-screen bg-bg relative overflow-hidden transition-colors duration-500">
      {isConsumer && <DotGrid />}

      {/* Navigation */}
      {isEmployee ? (
        <FloatingNavRail />
      ) : isFieldWorker ? (
        <FieldWorkerNavRail />
      ) : !isConsumer ? (
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      ) : null}

      {/* Main Content Area */}
      <div
        className="flex-1 flex flex-col transition-all duration-300 min-w-0 relative z-10"
        style={{ marginLeft }}
      >
        {isConsumer ? (
          <ConsumerHeader />
        ) : (!isEmployee && !isFieldWorker) ? (
          <Navbar sidebarWidth={sidebarWidth} />
        ) : null}

        <main className={`flex-1 p-6 md:p-8 max-w-full ${isConsumer ? 'mt-20' : (isEmployee || isFieldWorker) ? 'mt-4' : 'mt-16'}`}>
          {children}
        </main>
      </div>

      {showAI && <AIAssistant role={user.role} />}
    </div>
  );
};

export default Layout;
