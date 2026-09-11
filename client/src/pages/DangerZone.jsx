// export default function DangerZone() {
//   return <div><h1 className="page-title">Danger Zone</h1><div className="card">Coming soon...</div></div>;
// }


import { useState } from 'react';
import api from '../api';

export default function DangerZone() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');

  const softDelete = async () => {
    if (!confirm('Archive ALL messages and inquiries? They will be hidden but recoverable.')) return;
    setLoading(true);
    try {
      const res = await api.post('/admin/soft-delete');
      setMessage(`Archived ${res.data.archived_messages} messages and ${res.data.archived_inquiries} inquiries.`);
    } catch (err) {
      setMessage('Action failed.');
    } finally {
      setLoading(false);
    }
  };

  const recover = async () => {
    if (!confirm('Recover ALL archived messages and inquiries?')) return;
    setLoading(true);
    try {
      const res = await api.post('/admin/recover-archived');
      setMessage(`Recovered ${res.data.recovered_messages} messages and ${res.data.recovered_inquiries} inquiries.`);
    } catch (err) {
      setMessage('Action failed.');
    } finally {
      setLoading(false);
    }
  };

  const requestOtp = async () => {
    setLoading(true);
    try {
      const res = await api.post('/admin/hard-delete/request-otp');
      setOtpSent(true);
      setMessage(res.data.sent ? 'OTP sent to configured email.' : 'SMTP not configured. Cannot send OTP.');
    } catch (err) {
      setMessage('Failed to request OTP.');
    } finally {
      setLoading(false);
    }
  };

  const confirmHardDelete = async () => {
    if (!confirm('PERMANENTLY DELETE ALL messages, inquiries, and events? This CANNOT be undone.')) return;
    setLoading(true);
    try {
      const res = await api.post('/admin/hard-delete/confirm', { otp });
      setMessage(`Permanently deleted ${res.data.deleted_messages} messages, ${res.data.deleted_inquiries} inquiries, and ${res.data.deleted_events} events.`);
      setOtpSent(false);
      setOtp('');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Hard delete failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="page-title">Danger Zone</h1>

      {message && (
        <div className="card" style={{ background: 'var(--light-gray)', marginBottom: '16px' }}>
          {message}
        </div>
      )}

      <div className="card" style={{ borderColor: 'var(--amber)' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>Soft Delete (Archive)</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
          Hides all messages and inquiries from the portal. Data remains in the database and can be recovered.
        </p>
        <div className="row">
          <button className="secondary" onClick={softDelete} disabled={loading}>Archive All</button>
          <button className="secondary" onClick={recover} disabled={loading}>Recover Archived</button>
        </div>
      </div>

      <div className="card" style={{ borderColor: 'var(--red)', marginTop: '16px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px', color: 'var(--red)' }}>Hard Delete (Permanent)</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
          Permanently deletes ALL messages, inquiries, and events. A confirmation code will be emailed to the configured admin mail and must be entered below.
          <br />
          <strong>Team roster, settings, and phrases are preserved.</strong>
        </p>
        
        {!otpSent ? (
          <button className="danger" onClick={requestOtp} disabled={loading}>
            Request OTP
          </button>
        ) : (
          <div className="col" style={{ gap: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500' }}>Enter OTP Code</label>
              <input 
                value={otp} 
                onChange={(e) => setOtp(e.target.value)} 
                placeholder="6-digit code" 
                style={{ maxWidth: '200px' }}
              />
            </div>
            <div className="row">
              <button className="danger" onClick={confirmHardDelete} disabled={loading || !otp}>
                Confirm Hard Delete
              </button>
              <button className="secondary" onClick={() => setOtpSent(false)}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
