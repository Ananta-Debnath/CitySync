import { useNavigate } from 'react-router-dom';
import './style.css';

export default function EmployeePage() {

  const navigate = useNavigate();

  const handleLogOut = async () => {
    localStorage.removeItem('token');
    navigate('/login');
  }

  return (
    <div className="center">
      <h1>Employee Dashboard</h1>
      <p>Welcome, employee!</p>
      <br />
      <button onClick={handleLogOut}>Logout</button>
    </div>
  );
}
