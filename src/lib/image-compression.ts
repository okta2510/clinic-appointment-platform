/**
 * Mengompresi file gambar ke format JPEG Base64 dengan batas resolusi maksimum.
 * Menghasilkan string data URL yang ringan (~50-150 KB) untuk bukti pembayaran.
 */
export async function compressImageToBase64(
  file: File,
  maxWidth = 1024,
  maxHeight = 1024,
  quality = 0.75,
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return reject(new Error('File harus berupa gambar (JPG, PNG, atau WEBP)'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file gambar'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Gagal memuat gambar untuk kompresi'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Hitung skala aspect ratio
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Gagal menginisialisasi canvas untuk kompresi'));
        }

        // Gambar ke canvas dengan latar putih (jika PNG transparan dikonversi ke JPEG)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const base64 = canvas.toDataURL('image/jpeg', quality);
        resolve(base64);
      };

      if (e.target?.result) {
        img.src = e.target.result as string;
      } else {
        reject(new Error('Data file kosong'));
      }
    };

    reader.readAsDataURL(file);
  });
}
