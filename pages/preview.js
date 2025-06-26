// pages/preview.js
import { useState } from 'react';

export default function Preview() {
  const [imageUrl, setImageUrl] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl }),
    });

    const data = await res.json();
    setResult(data);
    setLoading(false);
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Snuffl Preview</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Paste image URL"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          style={{ width: '100%', padding: '0.5rem', fontSize: '1rem' }}
        />
        <button type="submit" disabled={!imageUrl || loading} style={{ marginTop: '1rem' }}>
          {loading ? 'Analyzing...' : 'Analyze'}
        </button>
      </form>

      {imageUrl && (
        <div style={{ marginTop: '2rem' }}>
          <img src={imageUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: 300 }} />
        </div>
      )}

      {result && (
        <div style={{ marginTop: '2rem' }}>
          {result.status === 'success' ? (
            <div>
              <h3>Top match: {result.label}</h3>
              <p>Confidence: {(result.confidence * 100).toFixed(2)}%</p>
              <ul>
                {result.top5?.map((item, idx) => (
                  <li key={idx}>
                    {item.label} - {(item.confidence * 100).toFixed(1)}%
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p style={{ color: 'red' }}>Error: {result.error}</p>
          )}
        </div>
      )}
    </div>
  );
}
