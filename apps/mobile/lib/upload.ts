import * as ImagePicker from 'expo-image-picker'
import { apiFetch } from './api'

interface UploadResult {
  imageId: string
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

export async function uploadImage(
  entityType: 'listing' | 'avatar',
  entityId: string,
  asset: ImagePicker.ImagePickerAsset,
): Promise<UploadResult> {
  const fileName = asset.uri.split('/').pop() ?? 'photo.jpg'
  const contentType = asset.mimeType ?? getMimeType(asset.uri)

  // Step 1: Get presigned URL
  const presign = await apiFetch<{
    uploadUrl: string
    imageId: string
    key: string
  }>('/api/images/presign', {
    method: 'POST',
    body: JSON.stringify({ entityType, entityId, contentType, fileName }),
  })

  // Step 2: Upload directly to R2
  const response = await fetch(asset.uri)
  const blob = await response.blob()

  await fetch(presign.uploadUrl, {
    method: 'PUT',
    body: blob,
    headers: { 'Content-Type': contentType },
  })

  // Step 3: Confirm and process
  const confirmed = await apiFetch<UploadResult>(
    `/api/images/${presign.imageId}/confirm`,
    { method: 'POST' },
  )

  return confirmed
}
