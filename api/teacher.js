import { timingSafeEqual } from 'node:crypto';
import { getSheetRows, getStudents, teacherSheetName } from '../lib/stein.js';

function validScore(value) {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const result = Number(String(value).trim());
  return Number.isFinite(result) && result >= 0 && result <= 100 ? result : null;
}

function statusFromScores(scores) {
  if (scores.hydro !== null && scores.pascal !== null && scores.archimedes !== null) return 'Telah Menyelesaikan Semua Materi';
  if (scores.hydro !== null && scores.pascal !== null) return 'Selesai Bab 2, Lanjut Bab 3';
  if (scores.hydro !== null) return 'Selesai Bab 1, Lanjut Bab 2';
  return 'Sedang Belajar (Bab 1)';
}

// Rekap memakai nilai yang tervalidasi, bukan kolom Status yang bisa tertinggal
// dari data lama di Sheet.
function studentForTeacher(row) {
  const scores = {
    hydro: validScore(row['Nilai Hidrostatis']),
    pascal: validScore(row['Nilai Pascal']),
    archimedes: validScore(row['Nilai Archimedes'])
  };
  return {
    ...row,
    Status: statusFromScores(scores),
    'Nilai Hidrostatis': scores.hydro ?? '',
    'Nilai Pascal': scores.pascal ?? '',
    'Nilai Archimedes': scores.archimedes ?? ''
  };
}

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
    if (!username || !password) return res.status(400).json({ success: false, message: 'Username dan password wajib diisi.' });

    // Tab guru harus memiliki header: Username | Password.
    const credentials = await getSheetRows(teacherSheetName());
    const authenticated = Array.isArray(credentials) && credentials.some((row) =>
      equalsSecret(value(row, ['Username', 'username']), username) &&
      equalsSecret(value(row, ['Password', 'password']), password)
    );
    if (!authenticated) return res.status(401).json({ success: false, message: 'Kombinasi username atau password tidak valid.' });

    const students = await getStudents();
    const normalizedStudents = Array.isArray(students) ? students.map(studentForTeacher) : [];
    return res.status(200).json({ success: true, data: normalizedStudents });
  } catch (error) {
    console.error('teacher API error', { status: error?.status, message: error?.message });
    const message = error?.status === 404
      ? `Tab ${teacherSheetName()} tidak ditemukan di SteinHQ.`
      : 'Login guru atau rekap nilai tidak dapat dimuat.';
    return res.status(500).json({ success: false, message });
  }
}
