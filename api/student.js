import { google } from 'googleapis';

const SHEET_NAME = 'DataSiswa';
const HEADERS = ['Email', 'Nama', 'Kelas', 'Status', 'Nilai Hidrostatis', 'Nilai Pascal', 'Nilai Archimedes', 'Diperbarui'];

function cors(req, res) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN;
  const origin = req.headers.origin;
  // Deploy Vercel satu domain tidak perlu CORS. Ini hanya untuk opsi GitHub Pages.
  if (allowedOrigin && origin === allowedOrigin) res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function text(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}
function email(value) {
  const result = text(value, 254).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result) ? result : '';
}
function className(value) {
  return ['9A', '9B', '9C', '9D'].includes(value) ? value : '-';
}
function score(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const result = Number(value);
  return Number.isFinite(result) && result >= 0 && result <= 100 ? result : undefined;
}
function studentFromRow(row) {
  return {
    uid: row[0], name: row[1], className: row[2], status: row[3],
    scores: { hydro: row[4] === '' ? null : row[4], pascal: row[5] === '' ? null : row[5], archimedes: row[6] === '' ? null : row[6] }
  };
}

async function sheetsClient() {
  if (!process.env.GOOGLE_SHEETS_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    throw new Error('Konfigurasi Google Sheets belum lengkap.');
  }
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  return google.sheets({ version: 'v4', auth });
}

async function ensureSheet(sheets, spreadsheetId) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId, fields: 'sheets.properties' });
  const exists = (meta.data.sheets || []).some((sheet) => sheet.properties.title === SHEET_NAME);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: SHEET_NAME } } }] }
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEET_NAME}!A1:H1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [HEADERS] }
    });
  }
}

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method tidak diizinkan.' });

  try {
    const data = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    if (data.action !== 'save') return res.status(400).json({ success: false, message: 'Aksi tidak dikenal.' });
    const uid = email(data.uid);
    if (!uid) return res.status(400).json({ success: false, message: 'Email tidak valid.' });

    const sheets = await sheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
    await ensureSheet(sheets, spreadsheetId);
    const existing = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${SHEET_NAME}!A2:H` });
    const rows = existing.data.values || [];
    const foundAt = rows.findIndex((row) => email(row[0]) === uid);
    const now = new Intl.DateTimeFormat('id-ID', { dateStyle: 'short', timeStyle: 'medium', timeZone: 'Asia/Jakarta' }).format(new Date());

    if (foundAt === -1) {
      const row = [uid, text(data.name, 80) || 'Siswa', className(data.className), text(data.status, 100) || 'Sedang Belajar (Bab 1)', '', '', '', now];
      await sheets.spreadsheets.values.append({ spreadsheetId, range: `${SHEET_NAME}!A:H`, valueInputOption: 'USER_ENTERED', requestBody: { values: [row] } });
      return res.status(200).json({ success: true, data: studentFromRow(row) });
    }

    const row = [...rows[foundAt]];
    while (row.length < 8) row.push('');
    if (data.status) row[3] = text(data.status, 100);
    const incoming = data.scores || {};
    const hydro = score(incoming.hydro); if (hydro !== undefined) row[4] = hydro;
    const pascal = score(incoming.pascal); if (pascal !== undefined) row[5] = pascal;
    const archimedes = score(incoming.archimedes); if (archimedes !== undefined) row[6] = archimedes;
    row[7] = now;
    const rowNumber = foundAt + 2;
    await sheets.spreadsheets.values.update({ spreadsheetId, range: `${SHEET_NAME}!A${rowNumber}:H${rowNumber}`, valueInputOption: 'USER_ENTERED', requestBody: { values: [row] } });
    return res.status(200).json({ success: true, data: studentFromRow(row) });
  } catch (error) {
    console.error('student API error', error);
    return res.status(500).json({ success: false, message: 'Data tidak dapat disimpan. Coba lagi.' });
  }
}
