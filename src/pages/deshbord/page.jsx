import React from 'react';

export default function DashboardPage() {
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  return (
    <div style={{ padding: '24px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
      <h1 style={{ color: '#1e293b', marginBottom: '8px', fontSize: '1.8rem', fontWeight: 600 }}>Dashboard</h1>
      {user ? (
        <p style={{ color: '#475569', fontSize: '1.05rem' }}>Welcome back, <strong>{user.name}</strong>! Your role is {user.role}.</p>
      ) : (
        <p style={{ color: '#475569', fontSize: '1.05rem' }}>Welcome to your dashboard.</p>
      )}
    </div>
  );
}
