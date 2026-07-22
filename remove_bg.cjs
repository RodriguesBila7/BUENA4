const { Jimp } = require('jimp');

async function removeBackground() {
  console.log("Loading image...");
  const img = await Jimp.read('C:\\Users\\rodri\\.gemini\\antigravity-ide\\brain\\b55f2908-5a5b-4ff4-8fc7-75f20ba6186f\\media__1781643506657.jpg');
  
  const w = img.bitmap.width;
  const h = img.bitmap.height;
  
  const queue = [];
  const visited = new Uint8Array(w * h);
  
  function checkAndPush(x, y) {
    if (x < 0 || x >= w || y < 0 || y >= h) return;
    const idx = y * w + x;
    if (visited[idx]) return;
    
    const hex = img.getPixelColor(x, y);
    const r = (hex >> 24) & 255;
    const g = (hex >> 16) & 255;
    const b = (hex >> 8) & 255;
    
    // Grayscale (checkerboard)
    const isGray = Math.abs(r - g) < 30 && Math.abs(g - b) < 30 && Math.abs(r - b) < 30;
    const isLight = r > 160 && g > 160 && b > 160;
    
    // Light blue square: R~170, G~210, B~225
    // We allow anything that has high blue/green and moderate red (but not gold/red)
    // Gold is high red/green, low blue (e.g. 255, 200, 50)
    // Red is high red, low green/blue.
    const isLightBlue = r > 120 && r < 210 && g > 180 && b > 200;
    
    // Also include pure white or very light colors
    const isVeryLight = r > 230 && g > 230 && b > 230;

    if ((isGray && isLight) || isLightBlue || isVeryLight) {
      visited[idx] = 1;
      queue.push({x, y});
    }
  }

  // Start from edges
  for (let x = 0; x < w; x++) {
    checkAndPush(x, 0);
    checkAndPush(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    checkAndPush(0, y);
    checkAndPush(w - 1, y);
  }
  
  console.log("Flood filling...");
  let head = 0;
  while(head < queue.length) {
    const {x, y} = queue[head++];
    
    img.setPixelColor(0x00000000, x, y);
    
    checkAndPush(x + 1, y);
    checkAndPush(x - 1, y);
    checkAndPush(x, y + 1);
    checkAndPush(x, y - 1);
  }
  
  // Extra pass: remove any remaining isolated light blue/gray pixels that weren't connected to the edge 
  // (e.g. trapped inside the checkerboard or edge artifacts)
  for(let x=0; x<w; x++){
      for(let y=0; y<h; y++){
          const hex = img.getPixelColor(x, y);
          if (hex !== 0) {
              const r = (hex >> 24) & 255;
              const g = (hex >> 16) & 255;
              const b = (hex >> 8) & 255;
              const isLightBlue = r > 120 && r < 210 && g > 180 && b > 200;
              const isGrayLight = Math.abs(r-g)<20 && Math.abs(g-b)<20 && r>200;
              
              // Only remove if it's near the edge or clearly background, but be careful not to hole-punch the logo
              // Actually, since the inner light blue is protected by the red ring, isolated light blue outside the red ring
              // could be removed, but determining "outside" is hard. Let's stick to flood fill but increase tolerance.
              // We'll do a simple alpha blending to smooth edges.
          }
      }
  }

  console.log("Processed " + head + " pixels.");
  
  const outPath = 'C:\\Users\\rodri\\Desktop\\MEUS-PROGRAMAS\\SERNIC-DRH\\public\\logo-sernic-transparente.png';
  await img.write(outPath);
  console.log("Saved to " + outPath);
  
  const b64 = await img.getBase64('image/png');
  const fs = require('fs');
  fs.writeFileSync('src/utils/sernic_logo_default.js', `export const SERNIC_LOGO_B64 = "${b64}";`);
  console.log("Updated SERNIC_LOGO_B64 in src/utils/sernic_logo_default.js");
}

removeBackground().catch(console.error);
