import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, Lock, Mail, ShieldCheck, UserCheck, Stethoscope } from 'lucide-react';
import '../styles/forms.css';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
        backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)',
        backgroundSize: '24px 24px'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 460,
          backgroundColor: '#ffffff',
          borderRadius: '1.25rem',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
          border: '1px solid #e2e8f0',
          padding: '2.5rem 2rem'
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '1rem',
              background: 'linear-gradient(135deg, #0284c7, #0d9488)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              boxShadow: '0 10px 15px -3px rgba(2, 132, 199, 0.3)'
            }}
          >
            <Activity size={30} />
          </div>
          <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            MedPulse Hospital
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.35rem' }}>
            Enterprise Clinical Management & Administrative Portal
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#fef2f2',
              color: '#b91c1c',
              border: '1px solid #fecaca',
              borderRadius: '0.5rem',
              fontSize: '0.85rem',
              marginBottom: '1.5rem',
              lineHeight: 1.4
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div className="input-addon-wrapper">
              <Mail size={18} className="input-addon-icon" />
              <input
                type="email"
                className="form-input input-with-icon"
                placeholder="name@hospital.demo"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1.75rem' }}>
            <label className="form-label">Password</label>
            <div className="input-addon-wrapper">
              <Lock size={18} className="input-addon-icon" />
              <input
                type="password"
                className="form-input input-with-icon"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem' }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Sign In to Portal'}
          </button>

          <p
            style={{
              textAlign: 'center',
              marginTop: '1.25rem',
              fontSize: '0.825rem',
              color: '#64748b',
              lineHeight: 1.4
            }}
          >
            New staff member? Contact your hospital administrator to get an account.
          </p>
        </form>

        {/* 1-Click Demo Accounts Selector */}
        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px dashed #e2e8f0' }}>
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              color: '#94a3b8',
              letterSpacing: '0.05em',
              marginBottom: '0.75rem',
              textAlign: 'center'
            }}
          >
            Fast Demo Login Credentials
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ justifyContent: 'flex-start', padding: '0.5rem 0.75rem' }}
              onClick={() => handleDemoFill('admin@hospital.demo', 'Hospital@123')}
            >
              <ShieldCheck size={16} color="#be185d" />
              <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
                <span style={{ fontWeight: 700, color: '#be185d' }}>Admin</span>
                <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '0.5rem' }}>
                  admin@hospital.demo
                </span>
              </div>
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ justifyContent: 'flex-start', padding: '0.5rem 0.75rem' }}
              onClick={() => handleDemoFill('doctor@hospital.demo', 'Hospital@123')}
            >
              <Stethoscope size={16} color="#15803d" />
              <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
                <span style={{ fontWeight: 700, color: '#15803d' }}>Doctor</span>
                <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '0.5rem' }}>
                  doctor@hospital.demo (Cardiology)
                </span>
              </div>
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ justifyContent: 'flex-start', padding: '0.5rem 0.75rem' }}
              onClick={() => handleDemoFill('reception@hospital.demo', 'Hospital@123')}
            >
              <UserCheck size={16} color="#0369a1" />
              <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
                <span style={{ fontWeight: 700, color: '#0369a1' }}>Front Desk</span>
                <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '0.5rem' }}>
                  reception@hospital.demo (Triage & Billing)
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

