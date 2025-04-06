const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const auth = new google.auth.GoogleAuth({
  keyFile: 'credentials.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

const SPREADSHEET_ID = '1_fssQRK_38Ods7SW26Nmax6p5Gm1nfU0rP5JCjajlA4';
const SHEET_KUPON = 'Sheet1'; // berisi: Kode Kupon | Status | User ID
const SHEET_LOG = 'Sheet2';   // berisi: User ID | Hadiah | Timestamp

app.get('/generate-kupon', async (req, res) => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let kupon = '';
  for (let i = 0; i < 10; i++) kupon += chars[Math.floor(Math.random() * chars.length)];

  try {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_KUPON}!A:C`,
      valueInputOption: 'USER_ENTERED',
      resource: { values: [[kupon, 'BELUM', '']] }
    });

    res.json({ success: true, code: kupon });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/check-kupon', async (req, res) => {
  const { kode, user } = req.query;

  try {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_KUPON}!A:C`
    });    

    const rows = result.data.values || [];
    const dataRows = rows.slice(1); // lewati header
    const rowIndex = dataRows.findIndex(row => row[0] === kode);
    
    if (rowIndex === -1) return res.json({ valid: false, msg: "Kupon tidak ditemukan" });
    if (dataRows[rowIndex][1] === 'TERPAKAI') return res.json({ valid: false, msg: "Kupon sudah dipakai" });
    
    // 🛑 JANGAN pakai ini lagi:
    // if (dataRows.some(r => r[2] === user)) return res.json({ valid: false, msg: "User sudah spin" });
    
    // update kupon ke TERPAKAI + isi user ID
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_KUPON}!B${rowIndex + 2}:C${rowIndex + 2}`, // +2 krn skip header
      valueInputOption: 'USER_ENTERED',
      resource: { values: [['TERPAKAI', user]] }
    });
    
    res.json({ valid: true });    
  } catch (err) {
    res.status(500).json({ valid: false, msg: "Error server", error: err.message });
  }
});
    

app.post('/log-spin', async (req, res) => {
  const { userId, hadiah, kode } = req.body;
  const timestamp = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });

  try {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    // ✅ Cek apakah kupon sudah pernah dipakai di Sheet2
    const check = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_LOG}!C:C` // kolom Kode Kupon
    });

    const kuponDipakai = (check.data.values || []).flat().includes(kode);
    if (kuponDipakai) {
      return res.status(400).json({ success: false, msg: "Kupon sudah digunakan sebelumnya!" });
    }

    // 🔥 Simpan log spin
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_LOG}!A:D`,
      valueInputOption: 'USER_ENTERED',
      resource: { values: [[userId, hadiah, kode, timestamp]] }
    });

    console.log("✅ Log berhasil dikirim:", userId, hadiah, kode);
    res.json({ success: true });

  } catch (err) {
    console.error("❌ Gagal log:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});


app.listen(PORT, () => {
  console.log(`🚀 Server ready on http://localhost:${PORT}`);
});
