import React, { useState } from 'react';

function App() {
  const [friends, setFriends] = useState([
    { name: '', expenses: [{ amount: '', desc: '' }] },
  ]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFriendChange = (idx, field, value) => {
    const updated = [...friends];
    updated[idx][field] = value;
    setFriends(updated);
  };

  const handleExpenseChange = (friendIdx, expenseIdx, field, value) => {
    const updated = [...friends];
    updated[friendIdx].expenses[expenseIdx][field] = value;
    setFriends(updated);
  };

  const addFriend = () => {
    setFriends([...friends, { name: '', expenses: [{ amount: '', desc: '' }] }]);
  };

  const removeFriend = (idx) => {
    setFriends(friends.filter((_, i) => i !== idx));
  };

  const addExpense = (friendIdx) => {
    const updated = [...friends];
    updated[friendIdx].expenses.push({ amount: '', desc: '' });
    setFriends(updated);
  };

  const removeExpense = (friendIdx, expenseIdx) => {
    const updated = [...friends];
    updated[friendIdx].expenses = updated[friendIdx].expenses.filter((_, i) => i !== expenseIdx);
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
    // Check for empty names or expenses, and negative values
    for (let f of friends) {
      if (!f.name.trim()) {
        setError('Please enter all friend names.');
        setLoading(false);
        return;
      }
      for (let exp of f.expenses) {
        if (exp.amount === '' || isNaN(exp.amount)) {
          setError('Please enter all expense values.');
          setLoading(false);
          return;
        }
        if (parseFloat(exp.amount) < 0) {
          setError('Negative values are not allowed.');
          setLoading(false);
          return;
        }
      }
    }
    try {
      // Clear previous expenses
      await fetch('http://localhost:5001/clear', { method: 'POST' });
      // Add new expenses
      for (let f of friends) {
        for (let exp of f.expenses) {
          await fetch('http://localhost:5001/add_expense', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: f.name, amount: parseFloat(exp.amount), desc: exp.desc })
          });
        }
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
    <div style={{ maxWidth: 600, margin: 'auto', padding: 20, fontFamily: 'Arial, sans-serif' }}>
      <h2 style={{ textAlign: 'center' }}>Trip Expense Splitter</h2>
      <p>Enter each friend's name and their expenses:</p>
      {friends.map((f, idx) => (
        <div key={idx} style={{ marginBottom: 20, padding: 10, border: '1px solid #ccc', borderRadius: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="text"
              placeholder={`Friend ${idx + 1} Name`}
              value={f.name}
              onChange={e => handleFriendChange(idx, 'name', e.target.value)}
              style={{ flex: 1, padding: 6 }}
            />
            <button onClick={() => removeFriend(idx)} disabled={friends.length === 1} style={{ background: '#e57373', color: 'white', border: 'none', borderRadius: 4, padding: '4px 10px' }}>Remove</button>
          </div>
          <div style={{ marginTop: 10 }}>
            <strong>Expenses:</strong>
            {f.expenses.map((exp, expIdx) => (
              <div key={expIdx} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <input
                  type="number"
                  placeholder="Amount Paid"
                  value={exp.amount}
                  onChange={e => handleExpenseChange(idx, expIdx, 'amount', e.target.value)}
                  style={{ width: 120, padding: 6 }}
                />
                <input
                  type="text"
                  placeholder="Description"
                  value={exp.desc}
                  onChange={e => handleExpenseChange(idx, expIdx, 'desc', e.target.value)}
                  style={{ flex: 1, padding: 6 }}
                />
                <button onClick={() => removeExpense(idx, expIdx)} disabled={f.expenses.length === 1} style={{ background: '#e57373', color: 'white', border: 'none', borderRadius: 4, padding: '2px 8px' }}>Remove</button>
              </div>
            ))}
            <button onClick={() => addExpense(idx)} style={{ background: '#1976d2', color: 'white', border: 'none', borderRadius: 4, padding: '4px 10px', marginTop: 4 }}>Add Expense</button>
          </div>
        </div>
      ))}
      <button onClick={addFriend} style={{ width: '100%', padding: 10, marginBottom: 10, background: '#388e3c', color: 'white', border: 'none', borderRadius: 4 }}>Add Friend</button>
      <button onClick={submitExpenses} disabled={loading} style={{ width: '100%', padding: 10, background: '#1976d2', color: 'white', border: 'none', borderRadius: 4 }}>
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
