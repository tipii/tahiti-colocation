import sharp from 'sharp'

import { logger } from './logger'

const log = logger.child({ module: 'sharp' })

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
  const inputKb = Math.round(input.length / 1024)
  const t0 = Date.now()
  log.debug({ inputKb }, 'processing image')

  const [medium, thumbnail] = await Promise.all([
    processVariant(input, 1200, 900, 85),
    processVariant(input, 200, 200, 80, 'cover'),
  ])

  log.info({
    ms: Date.now() - t0,
    inputKb,
    medium: { w: medium.width, h: medium.height, kb: Math.round(medium.size / 1024) },
    thumb: { w: thumbnail.width, h: thumbnail.height, kb: Math.round(thumbnail.size / 1024) },
  }, 'image processed')

  return { medium, thumbnail }
}
