const fs = require('fs');
const Database = require('better-sqlite3');
const { parsePdf } = require('./parser');

(async () => {
  const file = process.argv[2];
  if (!file) {
    console.error('Kullanım: node dev-check.js <pdf>');
    process.exit(1);
  }
  const rows = await parsePdf(file);
  console.log('Parse edilen kayıt sayısı:', rows.length);

  const db = new Database('hesap.db');
  if (!fs.existsSync('schema.sql')) {
    console.error('schema.sql bulunamadı');
    process.exit(1);
  }
  const schema = fs.readFileSync('./schema.sql', 'utf8');
  db.exec(schema);

  const cnt = db.prepare('SELECT COUNT(*) as c FROM transactions').get().c;
  console.log('DB mevcut kayıt sayısı:', cnt);
})();
