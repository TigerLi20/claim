import { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || '';

export default function AdminInbox() {
    const [adminKey, setAdminKey] = useState(
        () => sessionStorage.getItem('claim_admin_key') || ''
    );
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function loadMessages(key) {
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${API_BASE}/api/support/admin`, {
                headers: { 'x-admin-key': key },
            });
            if (!res.ok) throw new Error('Unauthorized or server error');
            const data = await res.json();
            setMessages(data);
            sessionStorage.setItem('claim_admin_key', key);
        } catch (err) {
            setError(err.message);
            setMessages([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (adminKey) loadMessages(adminKey);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    async function toggleResolved(id, resolved) {
        await fetch(`${API_BASE}/api/support/admin/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
            body: JSON.stringify({ resolved: !resolved }),
        });
        loadMessages(adminKey);
    }

    function handleLogout() {
        setAdminKey('');
        setMessages([]);
        sessionStorage.removeItem('claim_admin_key');
    }

    return (
        <div style={{ maxWidth: 720, margin: '40px auto', fontFamily: 'system-ui, sans-serif' }}>
            <h2 style={{ color: '#3d2b1f' }}>Support inbox</h2>

            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                <input
                    type="password"
                    placeholder="Admin key"
                    value={adminKey}
                    onChange={(e) => setAdminKey(e.target.value)}
                    style={{ flex: 1, padding: 10, border: '1px solid #ddd6c4', borderRadius: 4 }}
                />
                <button
                    onClick={() => loadMessages(adminKey)}
                    style={{
                        padding: '10px 18px',
                        background: '#3d2b1f',
                        color: '#fbf9f3',
                        border: 'none',
                        borderRadius: 4,
                        cursor: 'pointer',
                    }}
                >
                    Load
                </button>
                {adminKey && (
                    <button
                        onClick={handleLogout}
                        style={{
                            padding: '10px 18px',
                            background: '#9b2226',
                            color: '#fbf9f3',
                            border: 'none',
                            borderRadius: 4,
                            cursor: 'pointer',
                        }}
                    >
                        Logout
                    </button>
                )}
            </div>

            {error && <p style={{ color: '#9b2226' }}>{error}</p>}
            {loading && <p>Loading…</p>}

            {messages.map((m) => (
                <div
                    key={m.id}
                    style={{
                        padding: 16,
                        marginBottom: 12,
                        border: '1px solid #ddd6c4',
                        borderRadius: 6,
                        background: m.resolved ? '#f2f0e9' : '#fbf9f3',
                        opacity: m.resolved ? 0.6 : 1,
                    }}
                >
                    <div style={{ fontSize: 12, color: '#6b6154', marginBottom: 6 }}>
                        {m.name || 'Anonymous'} {m.email ? `· ${m.email}` : ''} · {m.created_at}
                    </div>
                    <div style={{ fontSize: 14, color: '#211a15', marginBottom: 10 }}>{m.message}</div>
                    <button
                        onClick={() => toggleResolved(m.id, m.resolved)}
                        style={{
                            fontSize: 12,
                            padding: '6px 12px',
                            border: '1px solid #9b2226',
                            color: '#9b2226',
                            background: 'transparent',
                            borderRadius: 4,
                            cursor: 'pointer',
                        }}
                    >
                        {m.resolved ? 'Mark unresolved' : 'Mark resolved'}
                    </button>
                </div>
            ))}

            {!loading && messages.length === 0 && !error && (
                <p style={{ color: '#6b6154' }}>No messages yet.</p>
            )}
        </div>
    );
}
