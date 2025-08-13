const AMOUNT_BLOCK_RE = new RegExp(
  String.raw`(-?\d{1,3}(?:\.\d{3})*,\d{2})\s*(TL)(\d{1,3}(?:\.\d{3})*,\d{2})\s*(TL)$`
);

const testStrings = [
  "11/08/202517:39:14Fatura ÖdemesiDiğer53206575 ISKI  SU-14,00 TL499,40 TL",
  "10/08/202510:46:39DiğerDiğerPara Çekme  ATM 105250 236579-2.500,00 TL513,40 TL"
];

testStrings.forEach((str, i) => {
  const match = str.match(AMOUNT_BLOCK_RE);
  console.log(`Test ${i+1}: ${str}`);
  if (match) {
    console.log(`  ✅ Match: ${match[1]} ${match[2]} ${match[3]} ${match[4]}`);
  } else {
    console.log(`  ❌ No match`);
  }
});
