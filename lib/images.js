// A photo turned 90° clockwise and scaled to fit maxSize, as a JPEG.
// src can be a data URL or a public storage URL (Supabase allows cross-origin reads).
export function rotateImage(src, maxSize = 800) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = h
      canvas.height = w
      const ctx = canvas.getContext('2d')
      ctx.translate(h, 0)
      ctx.rotate(Math.PI / 2)
      ctx.drawImage(img, 0, 0, w, h)
      canvas.toBlob(blob => (blob
        ? resolve({ blob, dataUrl: canvas.toDataURL('image/jpeg', 0.85) })
        : reject(new Error('Couldn’t rotate the photo.'))), 'image/jpeg', 0.85)
    }
    img.onerror = () => reject(new Error('Couldn’t load the photo.'))
    img.src = src
  })
}
