import * as ImagePicker from 'expo-image-picker'

import { authClient } from './auth'

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001'

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

export async function uploadImage(
  entityType: 'listing' | 'avatar',
  entityId: string,
  asset: ImagePicker.ImagePickerAsset,
): Promise<UploadResult> {
  const fileName = asset.uri.split('/').pop() ?? 'photo.jpg'
  const contentType = asset.mimeType ?? getMimeType(asset.uri)
  const cookies = authClient.getCookie()

  // Upload through API (avoids direct R2 fetch which has IPv6 issues in Expo Go)
  const formData = new FormData()
  formData.append('file', {
    uri: asset.uri,
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
