import sharp from 'sharp'

interface ProcessedVariant {
  buffer: Buffer
  width: number
  height: number
  size: number
}

interface ProcessedImage {
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
  const [medium, thumbnail] = await Promise.all([
    processVariant(input, 1200, 900, 85),
    processVariant(input, 200, 200, 80, 'cover'),
  ])

  return { medium, thumbnail }
}
