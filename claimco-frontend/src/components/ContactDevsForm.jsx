import { useState } from 'react';
import { API_BASE } from '../api/client';

export default function ContactDevsForm() {
    const [form, setForm] = useState({ name: '', email: '', message: '' });
    const [status, setStatus] = useState('idle'); // idle | sending | sent | error

    function handleChange(e) {
        setForm({ ...form, [e.target.name]: e.target.value });
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!form.message.trim()) return;

        setStatus('sending');
        try {
            const res = await fetch(`${API_BASE}/api/support`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            if (!res.ok) throw new Error('Request failed');
            setStatus('sent');
            setForm({ name: '', email: '', message: '' });
        } catch (err) {
            console.error(err);
            setStatus('error');
        }
    }

    if (status === 'sent') {
        return (
            <div style={styles.card}>
                <p style={styles.sentText}>Got it — the devs will see this shortly.</p>
                <button style={styles.linkBtn} onClick={() => setStatus('idle')}>
                    Send another message
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} style={styles.card}>
            <h3 style={styles.heading}>Text the devs</h3>
            <p style={styles.sub}>Bug, idea, or something broken? Tell us directly.</p>

            <input
                style={styles.input}
                name="name"
                placeholder="Your name (optional)"
                value={form.name}
                onChange={handleChange}
            />
            <input
                style={styles.input}
                name="email"
                type="email"
                placeholder="Your email (optional, so we can reply)"
                value={form.email}
                onChange={handleChange}
            />
            <textarea
                style={{ ...styles.input, minHeight: 100, resize: 'vertical' }}
                name="message"
                placeholder="What's going on?"
                value={form.message}
                onChange={handleChange}
                required
            />

            <button style={styles.button} type="submit" disabled={status === 'sending'}>
                {status === 'sending' ? 'Sending…' : 'Send message'}
            </button>

            {status === 'error' && (
                <p style={styles.errorText}>Something went wrong — try again in a moment.</p>
            )}
        </form>
    );
}

const styles = {
    card: {
        maxWidth: 380,
        padding: 24,
        border: '1px solid #ddd6c4',
        borderRadius: 6,
        background: '#fbf9f3',
        fontFamily: 'system-ui, sans-serif',
    },
    heading: { margin: '0 0 4px', fontSize: 18, color: '#3d2b1f' },
    sub: { margin: '0 0 16px', fontSize: 13, color: '#6b6154' },
    input: {
        width: '100%',
        padding: '10px 12px',
        marginBottom: 10,
        border: '1px solid #ddd6c4',
        borderRadius: 4,
        fontSize: 14,
        fontFamily: 'inherit',
        boxSizing: 'border-box',
    },
    button: {
        width: '100%',
        padding: 12,
        background: '#9b2226',
        color: '#fbf9f3',
        border: 'none',
        borderRadius: 4,
        fontWeight: 600,
        cursor: 'pointer',
    },
    linkBtn: {
        background: 'none',
        border: 'none',
        color: '#9b2226',
        fontWeight: 600,
        cursor: 'pointer',
        padding: 0,
    },
    sentText: { fontSize: 14, color: '#3d2b1f', marginBottom: 8 },
    errorText: { fontSize: 13, color: '#9b2226', marginTop: 8 },
};
