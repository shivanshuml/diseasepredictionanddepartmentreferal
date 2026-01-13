import React from 'react';

function Navbar({ onLogout }) {
  return (
    <nav style={styles.nav}>
      <h2 style={styles.logo}>🏥 HealthCare Portal</h2>
      <button style={styles.logout} onClick={onLogout}>
        Logout
      </button>
    </nav>
  );
}

const styles = {
  nav: {
    backgroundColor: '#0d47a1',
    padding: '12px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: 'white',
    borderRadius: '10px',
    marginBottom: '25px'
  },
  logo: {
    margin: 0,
    fontSize: '20px'
  },
  logout: {
    backgroundColor: '#d32f2f',
    color: 'white',
    border: 'none',
    padding: '8px 14px',
    borderRadius: '6px',
    cursor: 'pointer'
  }
};

export default Navbar;
