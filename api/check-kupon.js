export default async function handler(req, res) {
  const { kode, user } = req.query;

  try {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    const result = await sheets.spreadsheets.values.get({
      const SPREADSHEET_ID = '1_fssQRK_38Ods7SW26Nmax6p5Gm1nfU0rP5JCjajlA4';
      const SHEET_KUPON = 'Sheet1';
    });

    const rows = result.data.values || [];
    const dataRows = rows.slice(1);
    const rowIndex = dataRows.findIndex(row => row[0] === kode);

    if (rowIndex === -1) return res.json({ valid: false, msg: "Kupon tidak ditemukan" });
    if (dataRows[rowIndex][1] === 'TERPAKAI') return res.json({ valid: false, msg: "Kupon sudah dipakai" });

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_KUPON}!B${rowIndex + 2}:C${rowIndex + 2}`,
      valueInputOption: 'USER_ENTERED',
      resource: { values: [['TERPAKAI', user]] }
    });

    res.json({ valid: true });
  } catch (err) {
    console.error("🔥 SERVER ERROR", err); // <--- ini penting!
    res.status(500).json({ valid: false, msg: "Server error", error: err.message });
  }
}
