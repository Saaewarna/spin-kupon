import { google } from 'googleapis';

const SPREADSHEET_ID = '1_fssQRK_38Ods7SW26Nmax6p5Gm1nfU0rP5JCjajlA4';
const SHEET_LOG = 'Sheet2';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, msg: "Method not allowed" });

  const { userId, hadiah, kode } = req.body;

  try {
    if (!process.env.GOOGLE_SERVICE_ACCOUNT) {
      throw new Error("Missing GOOGLE_SERVICE_ACCOUNT env var");
    }

    if (!userId || !hadiah || !kode) {
      return res.status(400).json({ success: false, msg: "Missing data" });
    }

    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT, 'base64').toString('utf-8')),
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    // ✅ Logging data
    const timestamp = new Date().toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour12: false
    });
    const values = [[userId, hadiah, kode, timestamp]];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_LOG}!A:D`,
      valueInputOption: 'USER_ENTERED',
      resource: { values }
    });

    console.log("✅ LOG SPIN MASUK:", { userId, hadiah, kode, timestamp });

    res.json({ success: true });
  } catch (err) {
    console.error("🔥 SERVER ERROR:", err);
    res.status(500).json({ success: false, msg: "Server error", error: err.message });
  }
}
