const { Jimp } = require('jimp');
const path = require('path');

async function generateIcons() {
  const srcPath = path.join(__dirname, '..', 'public', 'logo-sernic-transparente.png');
  const publicDir = path.join(__dirname, '..', 'public');

  console.log('[generate_crisp_icons] Carregando imagem mestre de alta resolução...');
  const master = await Jimp.read(srcPath);

  // 1. Ícones transparentes de alta nitidez (purpose: any)
  console.log('[generate_crisp_icons] Gerando icon-192.png (transparente nítido)...');
  const icon192 = master.clone().resize({ w: 192, h: 192 });
  await icon192.write(path.join(publicDir, 'icon-192.png'));

  console.log('[generate_crisp_icons] Gerando icon-512.png (transparente nítido)...');
  const icon512 = master.clone().resize({ w: 512, h: 512 });
  await icon512.write(path.join(publicDir, 'icon-512.png'));

  // 2. Ícones adaptativos maskable com zona de segurança oficial e fundo vermelho do sistema #B71C1C
  console.log('[generate_crisp_icons] Gerando icon-maskable-192.png...');
  const maskable192 = new Jimp({ width: 192, height: 192, color: 0xB71C1CFF });
  const logoIn192 = master.clone().resize({ w: 154, h: 154 });
  maskable192.composite(logoIn192, 19, 19);
  await maskable192.write(path.join(publicDir, 'icon-maskable-192.png'));

  console.log('[generate_crisp_icons] Gerando icon-maskable-512.png...');
  const maskable512 = new Jimp({ width: 512, height: 512, color: 0xB71C1CFF });
  const logoIn512 = master.clone().resize({ w: 410, h: 410 });
  maskable512.composite(logoIn512, 51, 51);
  await maskable512.write(path.join(publicDir, 'icon-maskable-512.png'));

  // 3. Apple Touch Icon para iOS Safari (180x180 com fundo vermelho sólido institucional)
  console.log('[generate_crisp_icons] Gerando apple-touch-icon.png (180x180 para iOS)...');
  const appleTouch = new Jimp({ width: 180, height: 180, color: 0xB71C1CFF });
  const logoInApple = master.clone().resize({ w: 148, h: 148 });
  appleTouch.composite(logoInApple, 16, 16);
  await appleTouch.write(path.join(publicDir, 'apple-touch-icon.png'));

  console.log('[generate_crisp_icons] SUCESSO: Todos os ícones foram gerados com altíssima nitidez!');
}

generateIcons().catch(err => {
  console.error('[generate_crisp_icons] ERRO:', err);
  process.exit(1);
});
