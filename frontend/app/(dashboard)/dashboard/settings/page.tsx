'use client';

import { useSession } from 'next-auth/react';

export default function SettingsPage() {
  const { data: session } = useSession();

  return (
    <div className="dash-page">
      <div className="dash-card">
        <div className="dash-card-header">
          <h3>Profile</h3>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="field">
            <label htmlFor="s-name">Nama</label>
            <input id="s-name" type="text" defaultValue={session?.user?.name ?? ''} style={{
              font: 'inherit', fontSize: '0.88rem', background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--border-2)', padding: '10px 12px', color: 'var(--ink)', width: '100%',
            }} />
          </div>
          <div className="field">
            <label htmlFor="s-email">Email</label>
            <input id="s-email" type="email" defaultValue={session?.user?.email ?? ''} style={{
              font: 'inherit', fontSize: '0.88rem', background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--border-2)', padding: '10px 12px', color: 'var(--ink)', width: '100%',
            }} />
          </div>
          <button className="dash-action-btn dash-action-primary" style={{ alignSelf: 'flex-start' }}>
            Save Changes
          </button>
        </div>
      </div>

      <div className="dash-card">
        <div className="dash-card-header">
          <h3>Connected Platforms</h3>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { name: 'Dicoding', connected: false },
            { name: 'Coursera', connected: false },
            { name: 'Udemy', connected: false },
          ].map((p) => (
            <div key={p.name} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 0', borderBottom: '1px solid var(--border)',
            }}>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{p.name}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--ink-3)', fontFamily: 'var(--mono)' }}>
                  {p.connected ? 'Connected' : 'Not connected'}
                </div>
              </div>
              <button className="dash-action-btn" style={{ padding: '6px 14px', fontSize: '0.75rem' }}>
                {p.connected ? 'Disconnect' : 'Connect'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
