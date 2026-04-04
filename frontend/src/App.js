import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AvatarProvider } from './context/AvatarContext';
import { ThemeProvider } from './components/Layout';
import { Layout } from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

//import TailwindTest from './TailwindTest';

// Auth
import Login    from './components/Auth/Login';
import Register from './components/Auth/Register';

import Profile                 from './components/Profile';

// Consumer pages
import ConsumerDashboard       from './components/Consumer/ConsumerDashboard';
import MyBills                 from './components/Consumer/MyBills';
import BillDetail              from './components/Consumer/BillDetail';
import UsageHistory            from './components/Consumer/UsageHistory';
import Complaints              from './components/Consumer/Complaints';
import ConnectionApplications  from './components/Consumer/ConnectionApplications';
import MyConnections           from './components/Consumer/Myconnections';
import ConnectionDetail        from './components/Consumer/ConnectionDetail';
import Payments                from './components/Consumer/Payments';
import Notifications           from './components/Consumer/Notifications';
import LandingPage             from './components/LandingPage/LandingPage';

// Employee pages
import RegionList            from './components/Regions/RegionList';
import RegionForm            from './components/Regions/RegionForm';
import RegionEdit            from './components/Regions/RegionEdit';
import EmployeeDashboard     from './components/Employee/EmployeeDashboard';
import ConnectionsManager    from './components/Employee/ConnectionsManager';
import ConsumersList         from './components/Employee/ConsumersList';
import ApplicationsManager   from './components/Employee/ApplicationsManager';
import ComplaintsManager     from './components/Employee/ComplaintsManager';
import FieldWorkersList      from './components/Employee/FieldWorkersList';
import TariffsManager        from './components/Employee/TariffsManager';
import BillingManager        from './components/Employee/BillingManager';
import EmployeeReadings      from './components/Employee/EmployeeReadings';
import RevenueAnalytics      from './components/Employee/Analytics/RevenueAnalytics';
import ProductivityDashboard from './components/Employee/Analytics/ProductivityDashboard';
import RegionalHeatmap       from './components/Employee/Analytics/RegionalHeatmap';

// Field Worker pages
import MyJobs              from './components/FieldWorker/MyJobs';
import MeterReading        from './components/FieldWorker/MeterReading';
import FieldWorkerDashboard from './components/FieldWorker/FieldWorkerDashboard';
import AddMeter            from './components/FieldWorker/AddMeter';
import AddMeterForm        from './components/FieldWorker/AddMeterForm';

const RootRedirect = () => {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  const home = {
    employee:     '/employee/dashboard',
    field_worker: '/fieldworker/dashboard',
    consumer:     '/consumer/dashboard',
  };
  return <Navigate to={home[user?.role] || '/login'} replace />;
};



// function App() {
//   return <TailwindTest />;
// }

function App() {
  return (
    <AuthProvider>
      <AvatarProvider>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/login"    element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/"         element={<LandingPage />} />

            {/* ── Consumer ── */}
            <Route path="/consumer/*" element={
              <ProtectedRoute roles={['consumer']}>
                <Layout>
                  <Routes>
                    <Route path="dashboard"    element={<ConsumerDashboard />} />
                    <Route path="connections"  element={<MyConnections />} />
                    <Route path="connections/:id" element={<ConnectionDetail />} />
                    <Route path="bills"      element={<MyBills />} />
                    <Route path="bills/:id"  element={<BillDetail />} />
                    <Route path="usage"      element={<UsageHistory />} />
                    <Route path="complaints"   element={<Complaints />} />
                    <Route path="applications" element={<ConnectionApplications />} />
                    <Route path="payments"     element={<Payments />} />
                    <Route path="profile"      element={<Profile />} />
                    <Route path="notifications" element={<Notifications />} />
                    {/* TODO: payments */}
                    <Route path="*" element={<Navigate to="/consumer/dashboard" replace />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            } />

            {/* ── Field Worker ── */}
            <Route path="/fieldworker/*" element={
              <ProtectedRoute roles={['field_worker']}>
                <Layout>
                  <Routes>
                    <Route path="dashboard"       element={<FieldWorkerDashboard />} />
                    <Route path="jobs"            element={<MyJobs />} />
                    <Route path="readings"        element={<MeterReading />} />
                    <Route path="add-meter"       element={<AddMeter />} />
                    <Route path="add-meter/new"   element={<AddMeterForm />} />
                    <Route path="profile"         element={<Profile />} />
                    <Route path="*" element={<Navigate to="/fieldworker/dashboard" replace />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            } />

            {/* ── Employee ── */}
            <Route path="/employee/*" element={
              <ProtectedRoute roles={['employee']}>
                <Layout>
                  <Routes>
                    <Route path="dashboard"        element={<EmployeeDashboard />} />
                    <Route path="regions"          element={<RegionList />} />
                    <Route path="regions/new"      element={<RegionForm />} />
                    <Route path="regions/edit/:id" element={<RegionEdit />} />
                    <Route path="connections"      element={<ConnectionsManager />} />
                    <Route path="consumers"        element={<ConsumersList />} />
                    <Route path="applications"     element={<ApplicationsManager />} />
                    <Route path="complaints"       element={<ComplaintsManager />} />
                    <Route path="field-workers"    element={<FieldWorkersList />} />
                    <Route path="tariffs"          element={<TariffsManager />} />
                    <Route path="readings"         element={<EmployeeReadings />} />
                    <Route path="billing"          element={<BillingManager />} />
                    <Route path="analytics"        element={<Navigate to="/employee/analytics/revenue" replace />} />
                    <Route path="analytics/revenue"      element={<RevenueAnalytics />} />
                    <Route path="analytics/productivity" element={<ProductivityDashboard />} />
                    <Route path="analytics/regions"      element={<RegionalHeatmap />} />
                    <Route path="profile"      element={<Profile />} />
                    <Route path="*" element={<Navigate to="/employee/dashboard" replace />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
      </AvatarProvider>
    </AuthProvider>
  );
}

export default App;