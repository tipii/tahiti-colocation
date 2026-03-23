export async function uploadImage(entityType: string, entityId: string, file: File) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('entityType', entityType)
  formData.append('entityId', entityId)

  const res = await fetch('/api/images/upload', {
    method: 'POST',
    body: formData,
    credentials: 'include',
  })

  if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
  return res.json()
}

export async function deleteImage(imageId: string) {
  const res = await fetch(`/api/images/${imageId}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  if (!res.ok) throw new Error(`Delete failed: ${res.status}`)
  return res.json()
}
