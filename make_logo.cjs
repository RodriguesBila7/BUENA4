const fs = require('fs');
// Read new transparent logo
const b64 = fs.readFileSync(
  'C:/Users/rodri/.gemini/antigravity-ide/brain/b55f2908-5a5b-4ff4-8fc7-75f20ba6186f/sernic_logo_transparent_1781642264291.png'
).toString('base64');
fs.writeFileSync(
  'src/utils/sernic_logo_default.js',
  `export const SERNIC_LOGO_B64 = "data:image/png;base64,${b64}";`
);
console.log('New transparent logo module created. Length:', b64.length);
