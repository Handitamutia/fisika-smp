import { appendStudent, searchStudent, updateStudent } from '../lib/stein.js';

function text(value, maxLength) { return String(value || '').trim().slice(0, maxLength); }
function email(value) {
  const result = text(value, 254).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result) ? result : '';
}
const validClasses = ['IX-4', 'IX-5', 'IX-6', 'IX-7', 'IX-8', 'IX-9'];
function className(value) { return validClasses.includes(value) ? value : '-'; }
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

// Nilai hanya sah bila urutan babnya lengkap. Ini melindungi tampilan dari
// data lama yang pernah tersimpan tidak berurutan.
function sequentialScores(row) {
  const hydro = storedScore(row['Nilai Hidrostatis']);
  const pascal = hydro === null ? null : storedScore(row['Nilai Pascal']);
  const archimedes = hydro === null || pascal === null ? null : storedScore(row['Nilai Archimedes']);
  return { hydro, pascal, archimedes };
}

// Bersihkan nilai bab lanjutan yang tercatat sebelum prasyaratnya ada.
function invalidScoreCleanup(row) {
  const rawHydro = storedScore(row['Nilai Hidrostatis']);
  const rawPascal = storedScore(row['Nilai Pascal']);
  const rawArchimedes = storedScore(row['Nilai Archimedes']);
  const set = {};
  if (rawHydro === null && rawPascal !== null) set['Nilai Pascal'] = '';
  if ((rawHydro === null || rawPascal === null) && rawArchimedes !== null) set['Nilai Archimedes'] = '';
  return set;
}

function toStudent(row) {
  const scores = sequentialScores(row);
  return {
    uid: row.Email, name: row.Nama, className: row.Kelas, status: row.Status,
    scores,
    // Status selalu dihitung kembali dari tiga nilai yang valid. Dengan ini
    // teks status lama atau sel Sheet yang tidak valid tidak bisa membuka bab.
    status: learningStatus(scores)
  };
}

function matchesUpdate(row, updates) {
  return Object.entries(updates).every(([key, expected]) =>
    String(row[key] ?? '').trim() === String(expected ?? '').trim()
  );
}

async function updateAndConfirm(uid, updates) {
  await updateStudent(uid, updates);
  const rows = await searchStudent(uid);
  const saved = Array.isArray(rows) ? rows.find((row) => email(row.Email) === uid) : null;
  if (!saved || !matchesUpdate(saved, updates)) {
    const error = new Error('Excel belum mengonfirmasi penyimpanan. Silakan coba kirim kembali; nilai belum ditandai tersimpan.');
    error.code = 'PERSISTENCE_UNCONFIRMED';
    throw error;
  }
  return saved;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method tidak diizinkan.' });
  try {
    const data = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    if (!['save', 'submitQuiz'].includes(data.action)) return res.status(400).json({ success: false, message: 'Aksi tidak dikenal.' });
    const uid = email(data.uid);
    if (!uid) return res.status(400).json({ success: false, message: 'Email tidak valid.' });

    const found = await searchStudent(uid);
    if (!Array.isArray(found) || found.length === 0) {
      if (data.action === 'submitQuiz') return res.status(404).json({ success: false, message: 'Sesi siswa tidak ditemukan. Silakan masuk kembali.' });
      const row = {
        Email: uid, Nama: text(data.name, 80) || 'Siswa', Kelas: className(data.className),
        Status: 'Sedang Belajar (Bab 1)',
        'Nilai Hidrostatis': '', 'Nilai Pascal': '', 'Nilai Archimedes': '', Diperbarui: now()
      };
      await appendStudent(row);
      const savedRows = await searchStudent(uid);
      const saved = Array.isArray(savedRows) ? savedRows.find((item) => email(item.Email) === uid) : null;
      if (!saved || !matchesUpdate(saved, row)) {
        const error = new Error('Excel belum mengonfirmasi pembuatan data siswa. Silakan masuk kembali.');
        error.code = 'PERSISTENCE_UNCONFIRMED';
        throw error;
      }
      return res.status(200).json({ success: true, data: toStudent(saved) });
    }

    const current = found[0];
    const cleanup = invalidScoreCleanup(current);
    const requestedClass = className(data.className);
    const classUpdate = className(current.Kelas) === '-' && requestedClass !== '-'
      ? { Kelas: requestedClass }
      : {};

    // Login tidak menerima perubahan nilai dari cache browser. Kelas lama yang
    // tidak valid diperbaiki dari pilihan kelas pada formulir masuk.
    if (data.action === 'save') {
      const updates = { ...cleanup, ...classUpdate };
      if (Object.keys(updates).length > 0) {
        const updated = toStudent({ ...current, ...updates });
        const changes = { ...updates, Status: updated.status, Diperbarui: now() };
        const saved = await updateAndConfirm(uid, changes);
        return res.status(200).json({ success: true, data: toStudent(saved) });
      }
      return res.status(200).json({ success: true, data: toStudent(current) });
    }

    const section = String(data.section || '');
    const value = score(data.score);
    const scoreColumns = {
      hydro: 'Nilai Hidrostatis',
      pascal: 'Nilai Pascal',
      archimedes: 'Nilai Archimedes'
    };
    if (!scoreColumns[section] || value === undefined) {
      return res.status(400).json({ success: false, message: 'Nilai atau bab kuis tidak valid.' });
    }

    const currentScores = sequentialScores({ ...current, ...cleanup });
    if (currentScores[section] !== null) {
      if (currentScores[section] === value) {
        return res.status(200).json({ success: true, data: toStudent(current) });
      }
      return res.status(409).json({ success: false, message: 'Kuis bab ini sudah pernah disimpan dan tidak dapat dikirim ulang.' });
    }
    if ((section === 'pascal' && currentScores.hydro === null)
      || (section === 'archimedes' && (currentScores.hydro === null || currentScores.pascal === null))) {
      return res.status(403).json({ success: false, message: 'Selesaikan kuis bab sebelumnya terlebih dahulu.' });
    }

    const set = { ...cleanup, [scoreColumns[section]]: value, Diperbarui: now() };
    const expected = toStudent({ ...current, ...set });
    set.Status = expected.status;
    const saved = await updateAndConfirm(uid, set);
    return res.status(200).json({ success: true, data: toStudent(saved) });
  } catch (error) {
    console.error('student API error', { status: error?.status, message: error?.message });
    const message = error?.code === 'PERSISTENCE_UNCONFIRMED' ? error.message
      : error?.status === 401 ? 'SteinHQ menolak kredensial API. Periksa STEIN_USERNAME dan STEIN_PASSWORD di Vercel.'
      : error?.status === 404 ? 'Sheet DataSiswa tidak ditemukan di SteinHQ. Periksa nama tab sheet dan STEIN_SHEET_NAME.'
      : 'Data tidak dapat disimpan. Periksa SteinHQ dan konfigurasi deployment.';
    return res.status(error?.code === 'PERSISTENCE_UNCONFIRMED' ? 502 : 500).json({ success: false, message });
  }
}
