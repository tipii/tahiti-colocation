import sharp from 'sharp'

interface ProcessedVariant {
  buffer: Buffer
  width: number
  height: number
  size: number
}

interface ProcessedImage {
  original: ProcessedVariant
  medium: ProcessedVariant
  thumbnail: ProcessedVariant
}

async function processVariant(
  input: Buffer,
  maxWidth: number,
  maxHeight: number,
  quality: number,
  fit: 'inside' | 'cover' = 'inside',
): Promise<ProcessedVariant> {
  const result = await sharp(input)
    .rotate()
    .resize(maxWidth, maxHeight, { fit, withoutEnlargement: true })
    .webp({ quality })
    .toBuffer({ resolveWithObject: true })

  return {
    buffer: result.data,
    width: result.info.width,
    height: result.info.height,
    size: result.info.size,
  }
}

export async function processImage(input: Buffer): Promise<ProcessedImage> {
  const [original, medium, thumbnail] = await Promise.all([
    processVariant(input, 2000, 2000, 90),
    processVariant(input, 800, 600, 85),
    processVariant(input, 200, 200, 80, 'cover'),
  ])

  return { original, medium, thumbnail }
}
