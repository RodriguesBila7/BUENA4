/**
 * src/utils/imageCompressor.js
 * Utilitário de alto desempenho para compressão e codificação de imagens no navegador.
 * Reduz fotos pesadas (ex: 5MB a 15MB de telemóveis/câmaras) para ~15KB - 30KB em Base64,
 * economizando até 99% de espaço na base de dados e garantindo performance instantânea.
 */

/**
 * Redimensiona e comprime uma imagem (File, Blob ou Base64) mantendo a proporção.
 * @param {File|Blob|string} imageSource - O ficheiro de imagem ou string base64
 * @param {Object} options - Opções de redimensionamento e qualidade
 * @param {number} [options.maxWidth=320] - Largura máxima recomendada para perfis/avatares
 * @param {number} [options.maxHeight=320] - Altura máxima recomendada
 * @param {number} [options.quality=0.75] - Qualidade de compressão JPEG (0.1 a 1.0)
 * @param {string} [options.mimeType='image/jpeg'] - Formato de saída ('image/jpeg' ou 'image/webp')
 * @returns {Promise<string>} Base64 compactado no formato data:image/...
 */
export function compressImage(imageSource, options = {}) {
  const {
    maxWidth = 320,
    maxHeight = 320,
    quality = 0.75,
    mimeType = 'image/jpeg'
  } = options;

  return new Promise((resolve, reject) => {
    if (!imageSource) {
      return reject(new Error('Nenhuma fonte de imagem fornecida.'));
    }

    const loadImage = (srcUrl) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          let { width, height } = img;

          // Calcular novas dimensões mantendo proporção original
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          // Criar canvas em memória para renderização e compressão
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return reject(new Error('Não foi possível obter o contexto 2D do Canvas.'));
          }

          // Fundo branco para imagens com transparência convertidas para JPEG
          if (mimeType === 'image/jpeg') {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
          }

          // Suavização bilinear para máxima nitidez visual
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          ctx.drawImage(img, 0, 0, width, height);

          // Exportar em base64 codificado e altamente comprimido
          const compressedDataUrl = canvas.toDataURL(mimeType, quality);
          resolve(compressedDataUrl);
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = () => {
        reject(new Error('Falha ao carregar a imagem para compressão.'));
      };

      img.src = srcUrl;
    };

    if (typeof imageSource === 'string') {
      loadImage(imageSource);
    } else if (imageSource instanceof Blob || imageSource instanceof File) {
      const reader = new FileReader();
      reader.onload = (e) => {
        loadImage(e.target.result);
      };
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(imageSource);
    } else {
      reject(new Error('Tipo de imagem não suportado.'));
    }
  });
}
