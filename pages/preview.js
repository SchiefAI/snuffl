// pages/preview.js
import { useState } from 'react';

/**
 *  Snuffl demo-UI
 *  – ondersteunt URL-analyse én image-upload
 */
export default function Preview() {
  const [imageUrl, setImageUrl]   = useState('');
  const [file, setFile]           = useState(null);          // <input type="file">
  const [previewSrc, setPreview]  = useState('');
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState(null);

  // helper: Unsplash-URL automatisch downgraden naar 512 px
  const normalizeUrl = (raw) => {
    try {
      const u = new URL(raw);
      if (u.hostname.includes('unsplash.com') && !u.searchParams.has('w')) {
        u.searchParams.set('w', '512');
      }
      return u.toString();
    } catch {
      return raw;
    }
  };

  /**  Converts an image File to base64 (dataURL w/out prefix) */
  const fileToBase64 = (f) =>
    new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () =>
        res(r.result.replace(/^data:image\/[a-z+]+;base64,/, ''));
      r.onerror = rej;
      r.readAsDataURL(f);
    });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      let body;
      if (file) {
        // upload pad
        const fileB64 = await fileToBase64(file);
        body = { fileB64 };                    // ← server accepteert dit veld
      } else {
        // URL-pad
        body = { imageUrl: normalizeUrl(imageUrl) };
      }

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      setResult(await res.json());
    } catch (err) {
      setResult({ error: err.message || 'Client error' });
    } finally {
      setLoading(false);
    }
  };

  // =========  UI  ========= //
  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: 800 }}>
      <h1>Snuffl Preview</h1>

      {/* ----  URL invoer + upload  ------ */}
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Plak afbeelding-URL"
          value={imageUrl}
          onChange={(e) => {
            setImageUrl(e.target.value);
            setFile(null);
            setPreview(e.target.value);
          }}
          style={{ width: '100%', padding: '.5rem', fontSize: '1rem' }}
        />

        <div style={{ marginTop: '.5rem' }}>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files[0];
              if (f) {
                setFile(f);
                setImageUrl('');
                setPreview(URL.createObjectURL(f)); // local preview
              }
            }}
          />
        </div>

        <button
          type="submit"
          disabled={(!imageUrl && !file) || loading}
          style={{ marginTop: '1rem' }}
        >
          {loading ? 'Analyzing…' : 'Analyze'}
        </button>
      </form>

      {/* ----  Voorbeeldplaatje  ---- */}
      {previewSrc && (
        <div style={{ marginTop: '2rem' }}>
          <img
            src={previewSrc}
            alt="preview"
            style={{ maxWidth: '100%', maxHeight: 300 }}
          />
        </div>
      )}

      {/* ----  Resultaat  ---- */}
      {result && (
        <div style={{ marginTop: '2rem' }}>
          {result.status === 'success' ? (
            <>
              <h3>Top match: {result.label}</h3>
              <p>Confidence: {(result.confidence * 100).toFixed(2)}%</p>
              <ul>
                {result.top5?.map((x) => (
                  <li key={x.label}>
                    {x.label} – {(x.confidence * 100).toFixed(1)}%
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p style={{ color: 'red' }}>
              Error: {result.error || 'unknown error'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
