export const MAX_MEDIA_BYTES = 50 * 1024 * 1024;
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const VIDEO_TYPES = ['video/mp4', 'video/webm'];
export const MEDIA_TYPES = [...IMAGE_TYPES, ...VIDEO_TYPES, 'application/pdf'];
export const isUploadedMedia = (value: string) => /^\/media\/[a-zA-Z0-9-]+$/.test(value);
export const isDirectVideo = (value: string) => isUploadedMedia(value) || /^https:\/\/[^\s]+\.(mp4|webm)(\?[^\s]*)?$/i.test(value);
export function validateMedia(size: number, type: string) {
  if (!Number.isSafeInteger(size) || size < 1) return 'Choose a file that is not empty.';
  if (size > MAX_MEDIA_BYTES) return 'This file exceeds the 50 MB limit. Choose a smaller file or compress it first.';
  if (!MEDIA_TYPES.includes(type)) return 'Choose a JPG, PNG, WebP, GIF, MP4, WebM, or PDF file.';
  return '';
}
