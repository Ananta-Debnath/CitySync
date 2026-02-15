import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './style.css';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [response, setResponse] = useState('');

  const navigate = useNavigate(); // <-- for navigation

  const handleLogin = async () => {
    try {
      const res = await fetch('http://localhost:5000/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      console.log('Backend response:', data);

      if (!data.success) {
        setResponse('Login failed: ' + (data.error || 'Invalid credentials'));
        return;
      }

      // Successful login, store token and navigate based on role
      setResponse('');
      localStorage.setItem('token', data.token);
      const role = data.role;

      if (role === 'employee') {
        navigate('/employee'); // go to employee page
      } else if (role === 'consumer') {
        navigate('/consumer'); // go to consumer page
      }

    } catch (err) {
      console.error(err);
      setResponse('Error connecting to backend');
    }
  };

  const handleSignUp = () => {
    navigate('/signup');
  };

  return (
    <div className="center">
      <h1>Login Page</h1>

      <input
        type="text"
        placeholder="Username or Email"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <br />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <br />
      <button onClick={handleLogin}>Login</button>
      <br />

      <p style={{ marginTop: 12 }}>
        Don't have any account?{' '}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            handleSignUp();
          }}
          style={{ color: '#646cff', cursor: 'pointer' }}
        >
          Sign up
        </a>
      </p>

      {response && (
        <p style={{ color: 'salmon', marginTop: 12 }}>{response}</p>
      )}
    </div>
  );
}
