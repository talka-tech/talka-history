export default function handler(req: any, res: any) {
  if (req.method === 'GET') {
    res.status(200).json({ status: 'OK', message: 'GET working' });
  } else if (req.method === 'POST') {
    res.status(200).json({ status: 'OK', message: 'POST working' });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
