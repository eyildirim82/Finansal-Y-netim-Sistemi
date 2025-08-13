const fs = require('fs');
const pdf = require('pdf-parse');
const { parsePdf } = require('./parser');

(async () => {
  const file = process.argv[2];
  if (!file) {
    console.error('Kullanım: node debug-parse.js <pdf>');
    process.exit(1);
  }
  const buf = fs.readFileSync(file);
  const { text } = await pdf(buf);
  const lines = text.split(/\r?\n/).filter(Boolean);
  const amountRe = /-?\d{1,3}(?:\.\d{3})*,\d{2}/g;
  const dateRe = /^(\d{2}\/\d{2}\/\d{4})\s*(\d{2}:\d{2}:\d{2})\b/;

  console.log('--- İlk 40 satır ---');
  console.log(lines.slice(0, 40).join('\n'));
  console.log('--- Son 10 satır ---');
  console.log(lines.slice(-10).join('\n'));

  // Stitch
  const normalize = s => s.replace(/\u00a0/g,' ').replace(/[\t ]+/g,' ').trim();
  const stitched = [];
  let current = '';
  for (const l of lines) {
    const line = normalize(l);
    if (!line) continue;
    if (/^\d+\/\d+$/.test(line)) continue;
    if (/(Tarih Aralığı|Müşteri Adı|IBAN\/Hesap No|Kullanılabilir Bakiye|TarihSaatİşlemKanalAçıklamaİşlem TutarıBakiye|Yapı ve Kredi Bankası|www\.yapikredi\.com\.tr)/.test(line)) continue;
    if (/^----BLOKE BAKİYESİ|^----Diğer Bekleyen İşlemler/.test(line)) continue;

    const hasDt = /\d{2}\/\d{2}\/\d{4}\s*\d{2}:\d{2}:\d{2}/.test(line);
    if (hasDt) {
      if (current) stitched.push(current);
      current = line;
    } else {
      current += (current?' ':'') + line;
    }
  }
  if (current) stitched.push(current);

  console.log(`stitched count: ${stitched.length}`);
  stitched.slice(0, 8).forEach((row, i)=>{
    const am = row.match(amountRe) || [];
    const hasDateAtStart = dateRe.test(row);
    console.log(`\n[${i}] row: ${row}`);
    console.log(` amounts(${am.length}): ${am.join(' | ')}`);
    console.log(` dateAtStart: ${hasDateAtStart}`);
  });

  const rows = await parsePdf(file);
  console.log(`\nParser çıktı sayısı: ${rows.length}`);
  if (rows[0]) {
    console.log(rows.slice(0, 3));
  }
})();
