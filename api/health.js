export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false });
  return res.status(200).json({
    ok: true,
    configured: Boolean(process.env.GOOGLE_SHEETS_ID && process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
    message: process.env.GOOGLE_SHEETS_ID && process.env.GOOGLE_SERVICE_ACCOUNT_JSON
      ? 'API siap menerima data.'
      : 'Environment variable Google Sheets belum lengkap.'
  });
}
