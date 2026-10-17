import { sheetName, steinReady } from '../lib/stein.js';

export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false });
  return res.status(200).json({
    ok: true,
    configured: steinReady(),
    sheetName: sheetName(),
    teacherLoginConfigured: Boolean(process.env.TEACHER_PASSWORD)
  });
}
