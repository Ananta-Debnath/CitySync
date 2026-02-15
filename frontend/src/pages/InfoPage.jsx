import { Link } from 'react-router-dom';
import './style.css';

export default function InfoPage() {
  return (
    <div className="center">
      <h1>Welcome to CitySync</h1>
      <Link to="/login">
        <button>Login</button>
      </Link>
    </div>
  );
}
