import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './style.css';

export default function ConsumerPage() {
  const token = localStorage.getItem('token');
  const [address, setAddress] = useState('Loading...');

  const navigate = useNavigate();

  const handleLogOut = async () => {
    localStorage.removeItem('token');
    navigate('/login');
  }

  fetch('http://localhost:5000/extra/person/address', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
    .then(res => res.json())
    .then(data => {
      setAddress(data[0]?.street_name || "Address not found");
    })
    .catch(err => console.error(err));

  return (
    <div className="center">
      <h1>Consumer Dashboard</h1>
      <p>Welcome, consumer!</p>
      <p>Your Address: {address}</p>
      <br />
      <button onClick={handleLogOut}>Logout</button>
    </div>
  );
}
