const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3000;

// Daftar kupon valid
const kuponValid = ['ABC123', 'XYZ789', 'WIN456'];

app.use(cors());

app.get('/check-kupon', (req, res) => {
  const { kode } = req.query;
  const valid = kuponValid.includes(kode);
  res.json({ valid });
});

app.listen(PORT, () => {
  console.log(`✅ API jalan di http://localhost:${PORT}`);
});
