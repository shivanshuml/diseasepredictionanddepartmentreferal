import React, { useState } from 'react';

function AuthForm({ onAuth }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const endpoint = isLogin ? 'http://localhost:5000/login' : 'http://localhost:5000/signup';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        onAuth(data.access_token);// Save token after login/signup success
      } else {
        alert(data.message || 'Authentication failed!');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Something went wrong. Please try again.');
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial' }}>
      <h2>{isLogin ? 'Login' : 'Signup'}</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            style={{ padding: '8px', width: '300px' }}
          />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ padding: '8px', width: '300px' }}
          />
        </div>
        <button type="submit" style={{ padding: '8px 16px' }}>
          {isLogin ? 'Login' : 'Signup'}
        </button>
      </form>

      <div style={{ marginTop: '1rem' }}>
        {isLogin ? (
          <p>
            Don't have an account?{' '}
            <button onClick={() => setIsLogin(false)} style={{ color: 'blue', background: 'none', border: 'none', cursor: 'pointer' }}>
              Sign up here
            </button>
          </p>
        ) : (
          <p>
            Already have an account?{' '}
            <button onClick={() => setIsLogin(true)} style={{ color: 'blue', background: 'none', border: 'none', cursor: 'pointer' }}>
              Login here
            </button>
          </p>
        )}
      </div>
    </div>
  );
}

export default AuthForm;
