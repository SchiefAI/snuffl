export default function handler(req, res) {
  if (req.method === 'POST') {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'imageUrl ontbreekt' });
    }

    return res.status(200).json({
      status: 'ok',
      message: 'Analyze API werkt 🎉',
      received: imageUrl
    });
  }

  // Andere methodes afwijzen
  res.setHeader('Allow', ['POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
