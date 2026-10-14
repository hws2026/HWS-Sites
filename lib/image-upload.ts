import {IMAGE_TYPES, MAX_MEDIA_BYTES} from './media-policy';

function checkAbort(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException('Upload cancelled.', 'AbortError');
}

async function mayAnimate(file: File) {
  if (file.type === 'image/gif') return true;
  if (file.type === 'image/webp') {
    const header = new Uint8Array(await file.slice(0, 21).arrayBuffer());
    return String.fromCharCode(...header.slice(12, 16)) === 'VP8X' && !!(header[20] & 2);
  }
  if (file.type === 'image/png') {
    // APNG declares animation before its first image-data chunk.
    for (let offset = 8, chunks = 0; offset + 8 <= file.size && chunks < 4096; chunks++) {
      const bytes = await file.slice(offset, offset + 8).arrayBuffer();
      const type = String.fromCharCode(...new Uint8Array(bytes, 4));
      if (type === 'acTL') return true;
      if (type === 'IDAT' || type === 'IEND') return false;
      offset += new DataView(bytes).getUint32(0) + 12;
    }
  }
  return false;
}

function loadImage(url: string, signal?: AbortSignal): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const cleanup = () => { image.onload = null; image.onerror = null; signal?.removeEventListener('abort', abort); };
    const abort = () => { cleanup(); image.src = ''; reject(new DOMException('Upload cancelled.', 'AbortError')); };
    image.onload = () => { cleanup(); resolve(image); };
    image.onerror = () => { cleanup(); reject(new Error('This image could not be opened for resizing. Export it as a JPG, PNG, or WebP and try again.')); };
    signal?.addEventListener('abort', abort, {once: true});
    if (signal?.aborted) { abort(); return; }
    image.src = url;
  });
}

/** Only oversized images are changed. The server still validates the final size. */
export async function prepareImageUpload(file: File, options: {
  signal?: AbortSignal;
  onOptimize?: () => void;
  confirmStill?: () => boolean;
} = {}): Promise<File> {
  const {signal} = options;
  checkAbort(signal);
  if (file.size <= MAX_MEDIA_BYTES || !IMAGE_TYPES.includes(file.type)) return file;
  options.onOptimize?.();
  if (await mayAnimate(file)) {
    checkAbort(signal);
    if (!options.confirmStill?.()) throw new Error('Animation kept unchanged. Choose an animation under 50 MB, or allow conversion to a still image.');
  }
  checkAbort(signal);
  const url = URL.createObjectURL(file);
  const canvas = document.createElement('canvas');
  try {
    const image = await loadImage(url, signal);
    const scale = Math.min(1, 8192 / Math.max(image.naturalWidth, image.naturalHeight), Math.sqrt(16_000_000 / (image.naturalWidth * image.naturalHeight)));
    if (!Number.isFinite(scale) || !image.naturalWidth || !image.naturalHeight) throw new Error('The image dimensions could not be read. Choose another image.');
    let width = Math.max(1, Math.round(image.naturalWidth * scale));
    let height = Math.max(1, Math.round(image.naturalHeight * scale));
    for (let attempt = 0; attempt < 8; attempt++) {
      checkAbort(signal);
      canvas.width = width; canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Your browser could not resize this image. Try another browser or a smaller image.');
      context.drawImage(image, 0, 0, width, height);
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, file.type === 'image/jpeg' ? 'image/jpeg' : 'image/webp', Math.max(0.72, 0.96 - attempt * 0.04)));
      checkAbort(signal);
      if (blob && blob.size > 0 && blob.size <= MAX_MEDIA_BYTES) {
        const extension = blob.type === 'image/jpeg' ? 'jpg' : blob.type === 'image/webp' ? 'webp' : 'png';
        return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.' + extension, {type: blob.type, lastModified: file.lastModified});
      }
      width = Math.max(1, Math.round(width * 0.8)); height = Math.max(1, Math.round(height * 0.8));
    }
    throw new Error('This image could not be reduced below 50 MB. Export a smaller copy and try again.');
  } finally {
    URL.revokeObjectURL(url);
    canvas.width = 1; canvas.height = 1;
  }
}
