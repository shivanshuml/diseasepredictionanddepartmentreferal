import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';

function AdminDashboard() {
  const [appointments, setAppointments] = useState([]);
  const adminToken = localStorage.getItem("adminToken");

  const authHeader = {
    headers: { Authorization: `Bearer ${adminToken}` }
  };

  useEffect(() => {
    fetchAllAppointments();
    // eslint-disable-next-line
  }, []);

  const fetchAllAppointments = async () => {
    try {
      const res = await axios.get(
        'http://localhost:5000/admin/appointments',
        authHeader
      );
      setAppointments(res.data.appointments || []);
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Access Denied',
        text: 'Unable to fetch appointments'
      });
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const todayAppointments = appointments.filter(a => a.date === today);

  return (
    <div>
      <h2 style={{ textAlign: 'center' }}>Admin Dashboard</h2>

      {/* 🔹 STATS */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
        <div className="card" style={{ flex: 1 }}>
          <h3>Total Appointments</h3>
          <p style={{ fontSize: '24px', fontWeight: 'bold' }}>
            {appointments.length}
          </p>
        </div>

        <div className="card" style={{ flex: 1 }}>
          <h3>Today’s Appointments</h3>
          <p style={{ fontSize: '24px', fontWeight: 'bold' }}>
            {todayAppointments.length}
          </p>
        </div>
      </div>

      {/* 🔹 TABLE */}
      <div className="card">
        <h3>All Appointments</h3>

        {appointments.length === 0 ? (
          <p>No appointments found.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>User</th>
                <th>Disease</th>
                <th>Department</th>
                <th>Doctor</th>
                <th>Date</th>
                <th>Time</th>
              </tr>
            </thead>

            <tbody>
              {appointments.map((a, i) => (
                <tr key={i}>
                  <td>{a.username}</td>
                  <td>{a.disease}</td>
                  <td>{a.department}</td>
                  <td>{a.doctor}</td>
                  <td>{a.date}</td>
                  <td>{a.time_slot}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;
