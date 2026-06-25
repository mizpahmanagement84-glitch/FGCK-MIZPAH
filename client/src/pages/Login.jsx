import { useState } from 'react';
import client from '../api';

function Login({ onLogin }) {
  const [selectedRole, setSelectedRole] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [needPasswordChange, setNeedPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [forgotPassword, setForgotPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [resetStage, setResetStage] = useState('request');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      const response = await client.post('/auth/login', {
        username: username.trim(),
        password: password.trim(),
        role: selectedRole
      });
      const { token, user, needPasswordChange: needChange } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('username', user.username);
      localStorage.setItem('role', user.role || 'pastor');
      if (needChange) {
        setNeedPasswordChange(true);
      } else {
        onLogin(user);
      }
    } catch (err) {
      const status = err.response?.status;
      const message = err.response?.data?.error || err.message || 'Login failed';
      setError(status ? `${status}: ${message}` : message);
    }
  };

  const handleSetPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (!recoveryEmail.trim()) {
      return setError('Recovery email is required');
    }
    if (!newPassword.trim() || !confirmPassword.trim()) {
      return setError('Please enter and confirm your new password');
    }
    if (newPassword !== confirmPassword) {
      return setError('Passwords do not match');
    }
    try {
      await client.post('/auth/set-password', { newPassword, confirmPassword, recoveryEmail: recoveryEmail.trim() });
      // retrieve user info from token (we stored username/role already)
      const user = { username: localStorage.getItem('username'), role: localStorage.getItem('role') };
      setNeedPasswordChange(false);
      onLogin(user);
    } catch (err) {
      const status = err.response?.status;
      const message = err.response?.data?.error || err.message || 'Failed to set password';
      setError(status ? `${status}: ${message}` : message);
    }
  };

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setError('');
    setUsername('');
    setPassword('');
    setForgotPassword(false);
    setResetStage('request');
    setRecoveryEmail('');
    setOtp('');
    setConfirmPassword('');
  };

  const getPasswordPlaceholder = () => {
    if (selectedRole === 'member') {
      return 'Last 3 digits of member number';
    }
    return 'password';
  };

  const handleForgotPasswordRequest = async (event) => {
    event.preventDefault();
    setError('');
    if (!username.trim() || !recoveryEmail.trim()) {
      return setError('Username and recovery email are required');
    }
    try {
      await client.post('/auth/forgot-password', { username: username.trim(), email: recoveryEmail.trim() });
      setResetStage('confirm');
      setError('OTP sent to your recovery email. Enter it below to reset your password.');
    } catch (err) {
      const status = err.response?.status;
      const message = err.response?.data?.error || err.message || 'Unable to send OTP';
      setError(status ? `${status}: ${message}` : message);
    }
  };

  const handleResendOtp = async (e) => {
    e?.preventDefault?.();
    setError('');
    if (!username.trim() || !recoveryEmail.trim()) {
      return setError('Username and recovery email are required');
    }
    try {
      await client.post('/auth/forgot-password', { username: username.trim(), email: recoveryEmail.trim() });
      setError('OTP resent to your recovery email.');
    } catch (err) {
      const status = err.response?.status;
      const message = err.response?.data?.error || err.message || 'Unable to resend OTP';
      setError(status ? `${status}: ${message}` : message);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (!otp.trim() || !newPassword.trim() || !confirmPassword.trim() || !recoveryEmail.trim()) {
      return setError('Please fill in all fields');
    }
    if (newPassword !== confirmPassword) {
      return setError('Passwords do not match');
    }
    try {
      await client.post('/auth/reset-password', {
        username: username.trim(),
        email: recoveryEmail.trim(),
        otp: otp.trim(),
        newPassword,
        confirmPassword
      });
      setForgotPassword(false);
      setResetStage('request');
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
      setError('Password reset successful. You may now sign in with your new password.');
    } catch (err) {
      const status = err.response?.status;
      const message = err.response?.data?.error || err.message || 'Unable to reset password';
      setError(status ? `${status}: ${message}` : message);
    }
  };

  const getUsernamePlaceholder = () => {
    if (selectedRole === 'member') {
      return 'Member first name or number';
    }
    return 'Username';
  };

  return (
    <div className="page-content" style={{ maxWidth: 420, margin: '80px auto' }}>
      <div className="section-card">
        <h1 className="page-title">Login</h1>
        {error && <div className="alert">{error}</div>}

        {!needPasswordChange ? (
          <>
            {!selectedRole ? (
              <div>
                <p style={{ marginBottom: '24px', textAlign: 'center', fontSize: '16px' }}>Select your role to continue:</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <button
                    type="button"
                    className="button-primary"
                    onClick={() => handleRoleSelect('pastor')}
                    style={{ padding: '12px 24px', fontSize: '16px' }}
                  >
                    Pastor
                  </button>
                  <button
                    type="button"
                    className="button-primary"
                    onClick={() => handleRoleSelect('member')}
                    style={{ padding: '12px 24px', fontSize: '16px' }}
                  >
                    Member
                  </button>
                </div>
              </div>
            ) : (
              <>
                {!forgotPassword ? (
                  <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#e3f2fd', borderRadius: '4px', textAlign: 'center' }}>
                      <strong>Logging in as:</strong> {selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}
                    </div>
                    <div className="form-field">
                      <label>Username</label>
                      <input 
                        value={username} 
                        onChange={(e) => setUsername(e.target.value)} 
                        placeholder={getUsernamePlaceholder()}
                        required
                      />
                    </div>
                    <div className="form-field">
                      <label>Password</label>
                      <input 
                        type="password" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        placeholder={getPasswordPlaceholder()}
                        required
                      />
                      {selectedRole === 'member' && (
                        <small style={{ display: 'block', marginTop: 4, color: '#6b7280' }}>
                          Use the last 3 digits of your membership number for first-time login.
                        </small>
                      )}
                    </div>
                    <button className="button-primary" type="submit">Sign in</button>
                    {selectedRole !== 'pastor' && (
                      <button
                        type="button"
                        className="button-secondary"
                        onClick={() => { setForgotPassword(true); setError(''); }}
                        style={{ marginTop: '12px', width: '100%' }}
                      >
                        Forgot password?
                      </button>
                    )}
                    <button 
                      type="button" 
                      className="button-secondary"
                      onClick={() => handleRoleSelect('')}
                      style={{ marginTop: '12px', width: '100%' }}
                    >
                      Back to role selection
                    </button>
                  </form>
                ) : (
                  <form onSubmit={resetStage === 'request' ? handleForgotPasswordRequest : handleResetPassword}>
                    <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#e3f2fd', borderRadius: '4px', textAlign: 'center' }}>
                      <strong>Password recovery</strong>
                    </div>
                    <div className="form-field">
                      <label>Username</label>
                      <input 
                        value={username} 
                        onChange={(e) => setUsername(e.target.value)} 
                        placeholder={getUsernamePlaceholder()}
                        required
                      />
                    </div>
                    <div className="form-field">
                      <label>Recovery email</label>
                      <input 
                        type="email"
                        value={recoveryEmail}
                        onChange={(e) => setRecoveryEmail(e.target.value)}
                        placeholder="email@example.com"
                        required
                      />
                    </div>
                    {resetStage === 'confirm' && (
                      <>
                        <div className="form-field">
                          <label>OTP</label>
                          <input 
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            placeholder="Enter OTP"
                            required
                          />
                        </div>
                        <div className="form-field">
                          <label>New password</label>
                          <input 
                            type="password" 
                            value={newPassword} 
                            onChange={(e) => setNewPassword(e.target.value)} 
                            required
                          />
                        </div>
                        <div className="form-field">
                          <label>Confirm password</label>
                          <input 
                            type="password" 
                            value={confirmPassword} 
                            onChange={(e) => setConfirmPassword(e.target.value)} 
                            required
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
                          <button className="button-primary" type="submit">Reset password</button>
                          <button
                            type="button"
                            className="button-secondary"
                            onClick={handleResendOtp}
                            style={{ width: '100%' }}
                          >
                            Resend OTP
                          </button>
                        </div>
                      </>
                    )}
                    {resetStage === 'request' && (
                      <button className="button-primary" type="submit">Send OTP</button>
                    )}
                    <button 
                      type="button" 
                      className="button-secondary"
                      onClick={() => { setForgotPassword(false); setResetStage('request'); setOtp(''); setNewPassword(''); setConfirmPassword(''); }}
                      style={{ marginTop: '12px', width: '100%' }}
                    >
                      Cancel
                    </button>
                  </form>
                )}
              </>
            )}
          </>
        ) : (
          <form onSubmit={handleSetPassword}>
            <p>Please set a new password for your account.</p>
            <div className="form-field">
              <label>Recovery email</label>
              <input
                type="email"
                value={recoveryEmail}
                onChange={(e) => setRecoveryEmail(e.target.value)}
                placeholder="email@example.com"
                required
              />
            </div>
            <div className="form-field">
              <label>New password</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
            </div>
            <div className="form-field">
              <label>Confirm password</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>
            <button className="button-primary" type="submit">Set password</button>
          </form>
        )}
      </div>
    </div>
  );
}

export default Login;
