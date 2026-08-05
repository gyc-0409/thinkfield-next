const MAX_BYTES = 500 * 1024;
const MIN_BYTES = 200 * 1024;
const MAX_DIMENSION = 2200;

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('图片加载失败'));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('图片压缩失败'))),
      'image/jpeg',
      quality
    );
  });
}

function drawToCanvas(img, maxDim) {
  const { width, height } = img;
  const scale = Math.min(1, maxDim / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  return canvas;
}

/**
 * 将图片压缩到约 200–500 KB（JPEG），用于目录页上传。
 * @param {File} file
 * @returns {Promise<Blob>}
 */
export async function compressImageFile(file) {
  if (!file.type.startsWith('image/')) {
    throw new Error('仅支持图片文件');
  }
  if (file.size <= MAX_BYTES && file.size >= MIN_BYTES && file.type === 'image/jpeg') {
    return file;
  }
  if (file.size < MIN_BYTES && file.type.startsWith('image/')) {
    const img = await loadImage(file);
    const canvas = drawToCanvas(img, MAX_DIMENSION);
    return canvasToBlob(canvas, 0.92);
  }

  const img = await loadImage(file);
  let maxDim = MAX_DIMENSION;
  let blob = null;

  while (maxDim >= 800) {
    const canvas = drawToCanvas(img, maxDim);
    let quality = 0.88;
    while (quality >= 0.45) {
      blob = await canvasToBlob(canvas, quality);
      if (blob.size <= MAX_BYTES) break;
      quality -= 0.08;
    }
    if (blob && blob.size <= MAX_BYTES) break;
    maxDim = Math.round(maxDim * 0.85);
  }

  if (!blob) throw new Error('图片压缩失败');
  if (blob.size > MAX_BYTES) {
    throw new Error('图片过大，请换一张更清晰的截图或裁剪后重试');
  }
  return blob;
}
