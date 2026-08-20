/**
 * Compresses and resizes an uploaded image file on the client.
 *
 * Returns a Blob rather than a data URL: the bytes go into IndexedDB via
 * services/imageStore, where base64 would inflate them by a third for nothing.
 */
export async function compressImageFile(
  file: File,
  maxDimension = 900,
  quality = 0.82
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return reject(new Error('Selected file is not an image'));
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      if (!src) return reject(new Error('Failed to read image file'));

      const img = new Image();
      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // No 2D context to resize with — keep the original bytes rather than
          // failing the upload outright.
          return resolve(file);
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error('Failed to encode image'))),
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image for compression'));
      img.src = src;
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
