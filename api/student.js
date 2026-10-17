import { appendStudent, searchStudent, updateStudent } from '../lib/stein.js';

function text(value, maxLength) { return String(value || '').trim().slice(0, maxLength); }
function email(value) {
  const result = text(value, 254).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result) ? result : '';
}
function className(value) { return ['9A', '9B', '9C', '9D'].includes(value) ? value : '-'; }
function score(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const result = Number(value);
  return Number.isFinite(result) && result >= 0 && result <= 100 ? result : undefined;
}
function now() { return new Intl.DateTimeFormat('id-ID', { dateStyle: 'short', timeStyle: 'medium', timeZone: 'Asia/Jakarta' }).format(new Date()); }
function toStudent(row) {
  return {
    uid: row.Email, name: row.Nama, className: row.Kelas, status: row.Status,
    scores: { hydro: row['Nilai Hidrostatis'] ?? null, pascal: row['Nilai Pascal'] ?? null, archimedes: row['Nilai Archimedes'] ?? null }
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method tidak diizinkan.' });
  try {
    const data = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    if (data.action !== 'save') return res.status(400).json({ success: false, message: 'Aksi tidak dikenal.' });
    const uid = email(data.uid);
    if (!uid) return res.status(400).json({ success: false, message: 'Email tidak valid.' });

    const found = await searchStudent(uid);
    if (!Array.isArray(found) || found.length === 0) {
      const row = {
        Email: uid, Nama: text(data.name, 80) || 'Siswa', Kelas: className(data.className),
        Status: text(data.status, 100) || 'Sedang Belajar (Bab 1)',
        'Nilai Hidrostatis': '', 'Nilai Pascal': '', 'Nilai Archimedes': '', Diperbarui: now()
      };
      await appendStudent(row);
      return res.status(200).json({ success: true, data: toStudent(row) });
    }

    const current = found[0];
    const set = { Diperbarui: now() };
    if (data.status) set.Status = text(data.status, 100);
    const incoming = data.scores || {};
    const hydro = score(incoming.hydro); if (hydro !== undefined) set['Nilai Hidrostatis'] = hydro;
    const pascal = score(incoming.pascal); if (pascal !== undefined) set['Nilai Pascal'] = pascal;
    const archimedes = score(incoming.archimedes); if (archimedes !== undefined) set['Nilai Archimedes'] = archimedes;
    await updateStudent(uid, set);
    return res.status(200).json({ success: true, data: toStudent({ ...current, ...set }) });
  } catch (error) {
    console.error('student API error', { status: error?.status, message: error?.message });
    const message = error?.status === 401 ? 'SteinHQ menolak kredensial API. Periksa STEIN_USERNAME dan STEIN_PASSWORD di Vercel.'
      : error?.status === 404 ? 'Sheet DataSiswa tidak ditemukan di SteinHQ. Periksa nama tab sheet dan STEIN_SHEET_NAME.'
      : 'Data tidak dapat disimpan. Periksa SteinHQ dan konfigurasi deployment.';
    return res.status(500).json({ success: false, message });
  }
}
