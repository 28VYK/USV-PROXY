export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userid } = req.body;
  if (!userid) {
    return res.status(400).json({ error: 'Missing userid' });
  }

  try {
    const helperName = 'session-validator';
    const validator = await import(`../../utils/${helperName}`);
    validator.touchSession(userid);
  } catch (error) {
    // Fail silently if session-validator is not present (e.g. on clean GitHub clone)
  }

  return res.status(200).json({ success: true });
}
