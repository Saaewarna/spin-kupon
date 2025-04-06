export default async function handler(req, res) {
  const { kode, user } = req.query;

  try {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_KUPON}!A:C`,
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

    // ⬇️ Simpan log ke Sheet2
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet2!A:D',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[user, '', kode, new Date().toLocaleString('id-ID')]]
      }
    });

    res.json({ valid: true });
  } catch (err) {
    console.error("🔥 SERVER ERROR", err);
    res.status(500).json({ valid: false, msg: "Server error", error: err.message });
  }
}
