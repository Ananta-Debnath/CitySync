import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import InfoPage from './pages/InfoPage';
import LoginPage from './pages/LoginPage';
import ConsumerPage from './pages/ConsumerPage';
import EmployeePage from './pages/EmployeePage';
import SignUpPage from './pages/SignUpPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<InfoPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/consumer" element={<ConsumerPage />} />
        <Route path="/employee" element={<EmployeePage />} />
        <Route path="/signup" element={<SignUpPage />} />
      </Routes>
    </Router>
  );
}

export default App;
