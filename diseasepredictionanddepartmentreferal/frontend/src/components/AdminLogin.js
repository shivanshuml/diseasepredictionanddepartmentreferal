import React, { useState } from 'react';
import axios from 'axios';

function AdminLogin({ onAdminLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      const res = await axios.post('http://localhost:5000/admin/login', {
        username,
        password
      });

      onAdminLogin(res.data.token);
      localStorage.setItem("adminToken", res.data.token);
    } catch {
      alert('Invalid admin credentials');
    }
  };

  return (
    <div>
      <h2>Admin Login</h2>
      <input placeholder="Username" onChange={e => setUsername(e.target.value)} />
      <br /><br />
      <input type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} />
      <br /><br />
      <button onClick={handleLogin}>Login</button>
    </div>
  );
}

export default AdminLogin;
