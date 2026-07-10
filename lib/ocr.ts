import Tesseract from "tesseract.js";

export interface OcrProgress {
  status: string;
  progress: number;
}

/**
 * Preprocess image using Canvas API for better OCR accuracy.
 * Converts to grayscale and increases contrast.
 */
export function preprocessImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas not supported"));
        return;
      }

      // Scale to reasonable size for OCR (max 2000px width)
      const maxWidth = 2000;
      const scale = Math.min(1, maxWidth / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      // Draw image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Convert to grayscale and increase contrast
      for (let i = 0; i < data.length; i += 4) {
        // Grayscale
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

        // Increase contrast
        const contrast = 1.5;
        const factor = (259 * (contrast * 128 + 255)) / (255 * (259 - contrast * 128));
        const newGray = Math.max(0, Math.min(255, factor * (gray - 128) + 128));

        data[i] = newGray;
        data[i + 1] = newGray;
        data[i + 2] = newGray;
      }

      ctx.putImageData(imageData, 0, 0);

      // Return as data URL
      const result = canvas.toDataURL("image/png");
      URL.revokeObjectURL(url);
      resolve(result);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}

/**
 * Run OCR on an image using Tesseract.js
 */
export async function recognizeText(
  imageSource: string | File,
  onProgress?: (progress: OcrProgress) => void
): Promise<string> {
  const result = await Tesseract.recognize(imageSource, "eng", {
    logger: (m) => {
      if (onProgress && m.status) {
        onProgress({
          status: m.status,
          progress: m.progress || 0,
        });
      }
    },
  });

  return result.data.text;
}
