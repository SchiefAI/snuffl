// /pages/api/analyze.js
import { GoogleAuth } from 'google-auth-library';
import sharp from 'sharp';

const ENDPOINT =
  'https://us-central1-aiplatform.googleapis.com/v1/projects/elated-pathway-441608-i1/locations/us-central1/endpoints/7431481444393811968:predict';
const WIDTH = 512;                 // max breedte
const JPEG_QUALITY = 80;           // compressie-kwaliteit

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { imageUrl, fileB64 } = req.body;
  if (!imageUrl && !fileB64) {
    return res
      .status(400)
      .json({ error: 'imageUrl or fileB64 required in body' });
  }

  if (!process.env.VERTEX_SERVICE_ACCOUNT_JSON) {
    return res
      .status(500)
      .json({ error: 'Missing ENV variable VERTEX_SERVICE_ACCOUNT_JSON' });
  }

  try {
    /* ─────────────────────────  Auth  ───────────────────────── */
    const serviceAccount = JSON.parse(process.env.VERTEX_SERVICE_ACCOUNT_JSON);
    const auth = new GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
    const client = await auth.getClient();
    const tokenResult = await client.getAccessToken();
    const accessToken = tokenResult?.token || tokenResult; // soms string, soms object

    /* ───────────────────  Afbeelding ophalen  ───────────────── */
    const rawBuffer = imageUrl
      ? // URL-pad
        await (await fetch(imageUrl)).arrayBuffer()
      : // upload-pad (base64 zonder prefix)
        Buffer.from(fileB64, 'base64');

    // resize + compressie
    const processedBuffer = await sharp(Buffer.from(rawBuffer))
      .resize({ width: WIDTH })
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer();

    const base64 = processedBuffer.toString('base64');

    /* ───────────────────  Vertex-request  ──────────────────── */
    const payload = { instances: [{ content: base64 }] };

    const vertexRes = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!vertexRes.ok) {
      const errText = await vertexRes.text();
      console.error('❌ Vertex AI error:', errText);
      return res
        .status(vertexRes.status)
        .json({ error: 'Vertex AI error', details: errText });
    }

    const vertexJson = await vertexRes.json();
    const prediction = vertexJson.predictions?.[0];

    /* ──────────────────  Resultaat mappen  ─────────────────── */
    if (prediction?.confidences && prediction?.displayNames) {
      const { confidences: scores, displayNames: labels } = prediction;
      const maxIdx = scores.indexOf(Math.max(...scores));

      return res.status(200).json({
        status: 'success',
        label: labels[maxIdx] || 'Unknown',
        confidence: scores[maxIdx],
        top5: labels
          .map((l, i) => ({ label: l, confidence: scores[i] }))
          .sort((a, b) => b.confidence - a.confidence)
          .slice(0, 5),
      });
    }

    // fallback – onbekend formaat
    return res.status(200).json({ status: 'success', prediction });
  } catch (err) {
    console.error('❌ Server Error:', err);
    return res
      .status(500)
      .json({ error: 'Server Error', details: err.message });
  }
}
