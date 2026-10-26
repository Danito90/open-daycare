export type CompressedImage = {
  blob: Blob;
  width: number;
  height: number;
  extension: "webp";
};

export type CompressImageOptions = {
  maxSide?: number;
  quality?: number;
};

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const DEFAULT_MAX_SIDE = 1600;
const DEFAULT_QUALITY = 0.82;

const INVALID_TYPE_MESSAGE =
  "Formato no compatible. Elegí una foto JPG, PNG, WebP o HEIC.";
const HEIC_MESSAGE =
  "No pudimos procesar esta foto. Convertila a JPG e intentá de nuevo.";
const UNREADABLE_MESSAGE =
  "No pudimos leer esta foto. Probá con otra imagen.";

export class ImageCompressionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageCompressionError";
  }
}

function scaledSize(width: number, height: number, maxSide: number) {
  const largest = Math.max(width, height);

  if (largest <= maxSide) return { width, height };

  const scale = maxSide / largest;

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function toBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/webp", quality);
  });
}

export async function compressImage(
  file: File,
  options: CompressImageOptions = {},
): Promise<CompressedImage> {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new ImageCompressionError(INVALID_TYPE_MESSAGE);
  }

  let bitmap: ImageBitmap;

  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new ImageCompressionError(
      file.type === "image/heic" ? HEIC_MESSAGE : UNREADABLE_MESSAGE,
    );
  }

  try {
    const maxSide = options.maxSide ?? DEFAULT_MAX_SIDE;
    const quality = options.quality ?? DEFAULT_QUALITY;
    const size = scaledSize(bitmap.width, bitmap.height, maxSide);
    const canvas = document.createElement("canvas");

    canvas.width = size.width;
    canvas.height = size.height;

    const context = canvas.getContext("2d");

    if (!context) throw new ImageCompressionError(UNREADABLE_MESSAGE);

    context.drawImage(bitmap, 0, 0, size.width, size.height);

    const blob = await toBlob(canvas, quality);

    if (!blob) throw new ImageCompressionError(UNREADABLE_MESSAGE);

    return { blob, width: size.width, height: size.height, extension: "webp" };
  } finally {
    bitmap.close();
  }
}
