const { Jimp } = require('jimp');
Jimp.read('public/logo-sernic-transparente.png').then(img => { 
  const w = img.bitmap.width; 
  const h = img.bitmap.height; 
  let minX=w, maxX=0, minY=h, maxY=0; 
  for(let y=0; y<h; y++){ 
    for(let x=0; x<w; x++){ 
      const c = img.getPixelColor(x,y); 
      const r = (c >> 24) & 255; 
      const g = (c >> 16) & 255; 
      const b = (c >> 8) & 255; 
      if(r < 200 && g > 180 && b > 200) { 
        if(x<minX) minX=x; 
        if(x>maxX) maxX=x; 
        if(y<minY) minY=y; 
        if(y>maxY) maxY=y; 
      } 
    } 
  } 
  console.log("Light blue bounding box:", minX, minY, "to", maxX, maxY); 
});
