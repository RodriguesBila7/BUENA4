const { Jimp } = require('jimp');
const path = require('path');

async function generateIcons() {
  const srcPath = path.join(__dirname, '..', 'public', 'logo-sernic-transparente.png');
  const publicDir = path.join(__dirname, '..', 'public');

  console.log('[generate_crisp_icons] Carregando imagem mestre de alta resolução...');
  const master = await Jimp.read(srcPath);

  // 1. Ícones principais da aplicação com fundo BRANCO nítido (#FFFFFF)
  console.log('[generate_crisp_icons] Gerando icon-192.png (fundo branco nítido)...');
  const white192 = new Jimp({ width: 192, height: 192, color: 0xFFFFFFFF });
  const logo192 = master.clone().resize({ w: 160, h: 160 });
  white192.composite(logo192, 16, 16);
  await white192.write(path.join(publicDir, 'icon-192.png'));

  console.log('[generate_crisp_icons] Gerando icon-512.png (fundo branco nítido)...');
  const white512 = new Jimp({ width: 512, height: 512, color: 0xFFFFFFFF });
  const logo512 = master.clone().resize({ w: 430, h: 430 });
  white512.composite(logo512, 41, 41);
  await white512.write(path.join(publicDir, 'icon-512.png'));

  // 2. Ícones adaptativos maskable com zona de segurança oficial e fundo BRANCO (#FFFFFF)
  console.log('[generate_crisp_icons] Gerando icon-maskable-192.png (fundo branco)...');
  const maskable192 = new Jimp({ width: 192, height: 192, color: 0xFFFFFFFF });
  const logoInMaskable192 = master.clone().resize({ w: 150, h: 150 });
  maskable192.composite(logoInMaskable192, 21, 21);
  await maskable192.write(path.join(publicDir, 'icon-maskable-192.png'));

  console.log('[generate_crisp_icons] Gerando icon-maskable-512.png (fundo branco)...');
  const maskable512 = new Jimp({ width: 512, height: 512, color: 0xFFFFFFFF });
  const logoInMaskable512 = master.clone().resize({ w: 400, h: 400 });
  maskable512.composite(logoInMaskable512, 56, 56);
  await maskable512.write(path.join(publicDir, 'icon-maskable-512.png'));

  // 3. Apple Touch Icon para iOS Safari (180x180 com fundo BRANCO sólido #FFFFFF)
  console.log('[generate_crisp_icons] Gerando apple-touch-icon.png (180x180 fundo branco para iOS)...');
  const appleTouch = new Jimp({ width: 180, height: 180, color: 0xFFFFFFFF });
  const logoInApple = master.clone().resize({ w: 148, h: 148 });
  appleTouch.composite(logoInApple, 16, 16);
  await appleTouch.write(path.join(publicDir, 'apple-touch-icon.png'));

  console.log('[generate_crisp_icons] SUCESSO: Todos os ícones do aplicativo com fundo BRANCO foram gerados com altíssima nitidez!');
}

generateIcons().catch(err => {
  console.error('[generate_crisp_icons] ERRO:', err);
  process.exit(1);
});
