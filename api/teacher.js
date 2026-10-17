import { timingSafeEqual } from 'node:crypto';
import { getStudents } from '../lib/stein.js';

function validPassword(value) {
  const expected = process.env.TEACHER_PASSWORD || '';
  const received = String(value || '');
  if (!expected || expected.length !== received.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method tidak diizinkan.' });
  if (!process.env.TEACHER_PASSWORD) return res.status(500).json({ success: false, message: 'TEACHER_PASSWORD belum diatur di Vercel.' });
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  if (!validPassword(body.password)) return res.status(401).json({ success: false, message: 'Kode guru tidak valid.' });
  try {
    const rows = await getStudents();
    return res.status(200).json({ success: true, data: Array.isArray(rows) ? rows : [] });
  } catch (error) {
    console.error('teacher API error', { status: error?.status, message: error?.message });
    return res.status(500).json({ success: false, message: 'Rekap nilai tidak dapat dimuat dari SteinHQ.' });
  }
}
