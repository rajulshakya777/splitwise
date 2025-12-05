import React, { useState } from 'react';

function App() {
  const [friends, setFriends] = useState([
    { name: '', amount: '' },
    { name: '', amount: '' },
    { name: '', amount: '' },
    { name: '', amount: '' },
  ]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (idx, field, value) => {
    const updated = [...friends];
    updated[idx][field] = value;
    setFriends(updated);
  };

  const submitExpenses = async () => {
    setLoading(true);
    setError('');
    // Check for duplicate names
    const names = friends.map(f => f.name.trim().toLowerCase());
    const nameSet = new Set(names);
    if (nameSet.size !== names.length) {
      setError('Duplicate names are not allowed.');
      setLoading(false);
      return;
    }
    try {
      // Clear previous expenses
      await fetch('http://localhost:5001/clear', { method: 'POST' });
      // Add new expenses
      for (let f of friends) {
        if (!f.name || !f.amount) {
          setError('Please enter all names and amounts.');
          setLoading(false);
          return;
        }
        if (parseFloat(f.amount) < 0) {
          setError('Negative values are not allowed.');
          setLoading(false);
          return;
        }
        await fetch('http://localhost:5001/add_expense', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: f.name, amount: parseFloat(f.amount) })
        });
      }
      const res = await fetch('http://localhost:5001/settle');
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setError('Could not connect to backend.');
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 500, margin: 'auto', padding: 20, fontFamily: 'Arial, sans-serif' }}>
      <h2 style={{ textAlign: 'center' }}>Trip Expense Splitter</h2>
      <p>Enter each friend's name and the amount they paid:</p>
      {friends.map((f, idx) => (
        <div key={idx} style={{ marginBottom: 10, display: 'flex', gap: 10 }}>
          <input
            type="text"
            placeholder={`Friend ${idx + 1} Name`}
            value={f.name}
            onChange={e => handleChange(idx, 'name', e.target.value)}
            style={{ flex: 1, padding: 6 }}
          />
          <input
            type="number"
            placeholder="Amount Paid"
            value={f.amount}
            onChange={e => handleChange(idx, 'amount', e.target.value)}
            style={{ width: 120, padding: 6 }}
          />
        </div>
      ))}
      <button onClick={submitExpenses} disabled={loading} style={{ width: '100%', padding: 10, marginTop: 10, background: '#1976d2', color: 'white', border: 'none', borderRadius: 4 }}>
        {loading ? 'Calculating...' : 'Calculate Settlement'}
      </button>
      {error && <div style={{ color: 'red', marginTop: 10 }}>{error}</div>}
      {result && !result.error && (
        <div style={{ marginTop: 20, background: '#f5f5f5', padding: 15, borderRadius: 6 }}>
          <h3>Total Expense: ₹{result.total}</h3>
          <h3>Equal Share: ₹{result.per_person}</h3>
          <h4>Settlements:</h4>
          <ul>
            {result.settlements.map((s, i) => (
              <li key={i}>{s.from} pays ₹{s.amount} to {s.to}</li>
            ))}
          </ul>
        </div>
      )}
      {result && result.error && (
        <div style={{ color: 'red', marginTop: 10 }}>{result.error}</div>
      )}
    </div>
  );
}

export default App;
