// /api/analyze.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { imageUrl, userId, email } = req.body;

  if (!imageUrl) {
    return res.status(400).json({ error: 'imageUrl is required' });
  }

  try {
    // Vertex AI endpoint en je modelgegevens
    const endpoint = 'https://us-central1-aiplatform.googleapis.com/v1/projects/elated-pathway-441608-i1/locations/us-central1/publishers/google/models/imagen:predict';

    const body = {
      instances: [
        {
          prompt: `Wat is het ras van dit dier?`,
          image: { imageUri: imageUrl }
        }
      ]
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.VERTEX_API_TOKEN}` // zie stap 2
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorData = await response.text();
      return res.status(response.status).json({ error: 'Vertex AI error', details: errorData });
    }

    const vertexResult = await response.json();

    // Dit kun je straks verrijken (bijv. beste ras + score extraheren)
    return res.status(200).json({
      status: 'success',
      received: imageUrl,
      prediction: vertexResult
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server Error', details: err.message });
  }
}
