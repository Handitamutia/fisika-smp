const DEFAULT_STEIN_API_URL = 'https://api.steinhq.com/v1/storages/6ad38b9d92b1163e975592e3';

export function steinReady() {
  return Boolean(process.env.STEIN_API_URL || DEFAULT_STEIN_API_URL);
}

export function sheetName() {
  return process.env.STEIN_SHEET_NAME || 'DataSiswa';
}

export function teacherSheetName() {
  return process.env.STEIN_TEACHER_SHEET_NAME || 'guru';
}

function baseUrl() {
  return (process.env.STEIN_API_URL || DEFAULT_STEIN_API_URL).replace(/\/$/, '');
}

function headers() {
  const result = { 'Content-Type': 'application/json' };
  const username = process.env.STEIN_USERNAME;
  const password = process.env.STEIN_PASSWORD;
  if (username || password) {
    if (!username || !password) throw new Error('STEIN_USERNAME dan STEIN_PASSWORD harus diisi bersamaan.');
    result.Authorization = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
  }
  return result;
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl()}/${path}`, { ...options, headers: { ...headers(), ...(options.headers || {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.error || body.message || `SteinHQ merespons HTTP ${response.status}.`);
    error.status = response.status;
    throw error;
  }
  return body;
}

export function searchStudent(email) {
  const query = encodeURIComponent(JSON.stringify({ Email: email }));
  return request(`${encodeURIComponent(sheetName())}?search=${query}`);
}

export function getSheetRows(name) {
  return request(encodeURIComponent(name));
}

export function getStudents() {
  return getSheetRows(sheetName());
}

export function appendStudent(row) {
  return request(encodeURIComponent(sheetName()), { method: 'POST', body: JSON.stringify([row]) });
}

export function updateStudent(email, set) {
  return request(encodeURIComponent(sheetName()), {
    method: 'PUT',
    body: JSON.stringify({ condition: { Email: email }, set, limit: 1 })
  });
}
