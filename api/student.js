import { appendStudent, searchStudent, updateStudent } from '../lib/stein.js';

function text(value, maxLength) { return String(value || '').trim().slice(0, maxLength); }
function email(value) {
  const result = text(value, 254).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result) ? result : '';
}
function className(value) { return ['9A', '9B', '9C', '9D'].includes(value) ? value : '-'; }
function score(value) {
  // SteinHQ dapat mengembalikan sel kosong sebagai string berisi spasi.
  // Jangan mengubahnya menjadi Number(' ') === 0, karena 0 adalah nilai kuis
  // yang sah dan berarti bab sudah benar-benar dikerjakan.
  if (value === undefined || value === null || String(value).trim() === '') return undefined;
  const result = Number(String(value).trim());
  return Number.isFinite(result) && result >= 0 && result <= 100 ? result : undefined;
}
function now() { return new Intl.DateTimeFormat('id-ID', { dateStyle: 'short', timeStyle: 'medium', timeZone: 'Asia/Jakarta' }).format(new Date()); }
function storedScore(value) {
  const result = score(value);
  return result === undefined ? null : result;
}
function learningStatus(scores) {
  const hydroDone = scores.hydro !== null;
  const pascalDone = scores.pascal !== null;
  const archimedesDone = scores.archimedes !== null;
  if (hydroDone && pascalDone && archimedesDone) return 'Telah Menyelesaikan Semua Materi';
  if (hydroDone && pascalDone) return 'Selesai Bab 2, Lanjut Bab 3';
  if (hydroDone) return 'Selesai Bab 1, Lanjut Bab 2';
  return 'Sedang Belajar (Bab 1)';
}
function toStudent(row) {
  const scores = {
    hydro: storedScore(row['Nilai Hidrostatis']),
    pascal: storedScore(row['Nilai Pascal']),
    archimedes: storedScore(row['Nilai Archimedes'])
  };
  return {
    uid: row.Email, name: row.Nama, className: row.Kelas, status: row.Status,
    scores,
    // Status selalu dihitung kembali dari tiga nilai yang valid. Dengan ini
    // teks status lama atau sel Sheet yang tidak valid tidak bisa membuka bab.
    status: learningStatus(scores)
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
        Status: 'Sedang Belajar (Bab 1)',
        'Nilai Hidrostatis': '', 'Nilai Pascal': '', 'Nilai Archimedes': '', Diperbarui: now()
      };
      await appendStudent(row);
      return res.status(200).json({ success: true, data: toStudent(row) });
    }

    const current = found[0];
    const set = { Diperbarui: now() };
    const incoming = data.scores || {};
    const hydro = score(incoming.hydro); if (hydro !== undefined) set['Nilai Hidrostatis'] = hydro;
    const pascal = score(incoming.pascal); if (pascal !== undefined) set['Nilai Pascal'] = pascal;
    const archimedes = score(incoming.archimedes); if (archimedes !== undefined) set['Nilai Archimedes'] = archimedes;
    const saved = toStudent({ ...current, ...set });
    set.Status = saved.status;
    await updateStudent(uid, set);
    return res.status(200).json({ success: true, data: saved });
  } catch (error) {
    console.error('student API error', { status: error?.status, message: error?.message });
    const message = error?.status === 401 ? 'SteinHQ menolak kredensial API. Periksa STEIN_USERNAME dan STEIN_PASSWORD di Vercel.'
      : error?.status === 404 ? 'Sheet DataSiswa tidak ditemukan di SteinHQ. Periksa nama tab sheet dan STEIN_SHEET_NAME.'
      : 'Data tidak dapat disimpan. Periksa SteinHQ dan konfigurasi deployment.';
    return res.status(500).json({ success: false, message });
  }
}
