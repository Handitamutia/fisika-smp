import { timingSafeEqual } from 'node:crypto';
import { getSheetRows, getStudents, teacherSheetName } from '../lib/stein.js';

function value(row, keys) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null) return String(row[key]);
  }
  return '';
}

function equalsSecret(actual, expected) {
  const left = Buffer.from(String(actual));
  const right = Buffer.from(String(expected));
  return left.length === right.length && left.length > 0 && timingSafeEqual(left, right);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method tidak diizinkan.' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const username = String(body.username || '').trim();
    const password = String(body.password || '');
    if (!username || !password) return res.status(400).json({ success: false, message: 'Sandi dan password wajib diisi.' });

    // Tab guru harus memiliki header: Sandi | Password.
    const credentials = await getSheetRows(teacherSheetName());
    const authenticated = Array.isArray(credentials) && credentials.some((row) =>
      equalsSecret(value(row, ['Sandi', 'sandi', 'Username', 'username']), username) &&
      equalsSecret(value(row, ['Password', 'password']), password)
    );
    if (!authenticated) return res.status(401).json({ success: false, message: 'Kombinasi sandi atau password tidak valid.' });

    const students = await getStudents();
    return res.status(200).json({ success: true, data: Array.isArray(students) ? students : [] });
  } catch (error) {
    console.error('teacher API error', { status: error?.status, message: error?.message });
    const message = error?.status === 404
      ? `Tab ${teacherSheetName()} tidak ditemukan di SteinHQ.`
      : 'Login guru atau rekap nilai tidak dapat dimuat.';
    return res.status(500).json({ success: false, message });
  }
}
