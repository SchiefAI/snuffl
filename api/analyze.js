import { GoogleAuth } from "google-auth-library";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { imageUrl } = req.body;

  if (!imageUrl) {
    return res.status(400).json({ error: "Missing imageUrl" });
  }

  try {
    const imageResponse = await fetch(imageUrl);
    const arrayBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString("base64");

    const instance = {
      image: {
        bytesBase64Encoded: base64Image,
      },
    };

    const endpoint = "https://us-central1-aiplatform.googleapis.com/v1/projects/snuffl-ai/locations/us-central1/endpoints/2508657824561627136:predict";

    const auth = new GoogleAuth({
      scopes: "https://www.googleapis.com/auth/cloud-platform",
    });

    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken.token || accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ instances: [instance] }),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(500).json({ error: "Vertex AI error", details: err });
    }

    const prediction = await response.json();
    res.status(200).json({ status: "success", prediction });
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
}
