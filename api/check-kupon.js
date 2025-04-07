import { google } from 'googleapis';

const SPREADSHEET_ID = '1_fssQRK_38Ods7SW26Nmax6p5Gm1nfU0rP5JCjajlA4';
const SHEET_KUPON = 'Sheet1';
const SHEET_LOG = 'Sheet2';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, msg: 'Method not allowed' });
  }

  const { kode, user } = req.body;

  if (!kode || !user) {
    return res.status(400).json({ success: false, msg: 'Missing kode or user' });
  }

  try {
    if (!process.env.GOOGLE_SERVICE_ACCOUNT) {
      throw new Error('Missing GOOGLE_SERVICE_ACCOUNT env var');
    }

    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(
        Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT, 'base64').toString('utf-8')
      ),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_KUPON}!A:C`,
    });

    const rows = result.data.values || [];
    const dataRows = rows.slice(1);
    const rowIndex = dataRows.findIndex((row) => row[0] === kode);

    if (rowIndex === -1)
      return res.status(400).json({ success: false, msg: 'Kupon tidak ditemukan' });
    if (dataRows[rowIndex][1] === 'TERPAKAI')
      return res.status(400).json({ success: false, msg: 'Kupon sudah dipakai' });

    // Update status kupon ke "TERPAKAI" dan simpan user
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_KUPON}!B${rowIndex + 2}:C${rowIndex + 2}`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [['TERPAKAI', userId]],
      },
    });

    // Log ke Sheet2
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_LOG}!A:D`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[userId, hadiah, kode, new Date().toLocaleString('id-ID')]],
      },
    });

    res.json({ success: true });
  } catch (err) {
    console.error('🔥 SERVER ERROR', err);
    res.status(500).json({ success: false, msg: 'Server error', error: err.message });
  }
}
