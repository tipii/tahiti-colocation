import * as ImagePicker from 'expo-image-picker'
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'

import { authClient } from './auth'

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001'
const MAX_DIMENSION = 2000
const COMPRESSION = 0.8

interface UploadResult {
  id: string
  originalUrl: string
  mediumUrl: string
  thumbnailUrl: string
}

function getMimeType(uri: string): string {
  const ext = uri.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'png':
      return 'image/png'
    case 'webp':
      return 'image/webp'
    case 'heic':
      return 'image/heic'
    default:
      return 'image/jpeg'
  }
}

export async function pickImage(): Promise<ImagePicker.ImagePickerAsset | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (status !== 'granted') return null

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.9,
    allowsEditing: false,
  })

  if (result.canceled || !result.assets[0]) return null
  return result.assets[0]
}

export async function pickImages(limit = 10): Promise<ImagePicker.ImagePickerAsset[]> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (status !== 'granted') return []

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.9,
    allowsMultipleSelection: true,
    selectionLimit: limit,
  })

  if (result.canceled) return []
  return result.assets
}

async function downscale(asset: ImagePicker.ImagePickerAsset): Promise<{ uri: string; type: string }> {
  const fallback = { uri: asset.uri, type: asset.mimeType ?? getMimeType(asset.uri) }
  const { width, height } = asset
  if (!width || !height || (width <= MAX_DIMENSION && height <= MAX_DIMENSION)) {
    return fallback
  }
  try {
    const ctx = ImageManipulator.manipulate(asset.uri)
    if (width >= height) ctx.resize({ width: MAX_DIMENSION })
    else ctx.resize({ height: MAX_DIMENSION })
    const ref = await ctx.renderAsync()
    const out = await ref.saveAsync({ format: SaveFormat.JPEG, compress: COMPRESSION })
    return { uri: out.uri, type: 'image/jpeg' }
  } catch (e) {
    console.warn('downscale skipped (native module unavailable):', e)
    return fallback
  }
}

export async function uploadImage(
  entityType: 'listing' | 'avatar',
  entityId: string,
  asset: ImagePicker.ImagePickerAsset,
): Promise<UploadResult> {
  const { uri, type: contentType } = await downscale(asset)
  const fileName = uri.split('/').pop() ?? 'photo.jpg'
  const cookies = authClient.getCookie()

  // Upload through API (avoids direct R2 fetch which has IPv6 issues in Expo Go)
  const formData = new FormData()
  formData.append('file', {
    uri,
    name: fileName,
    type: contentType,
  } as any)
  formData.append('entityType', entityType)
  formData.append('entityId', entityId)

  const res = await fetch(`${API_URL}/api/images/upload`, {
    method: 'POST',
    body: formData,
    headers: {
      ...(cookies ? { Cookie: cookies } : {}),
    },
    credentials: 'omit',
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Upload failed: ${res.status} ${body}`)
  }
  return res.json() as Promise<UploadResult>
}
