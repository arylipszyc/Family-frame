/** Blob → base64 sin el prefijo data:...;base64, (formato que espera Filesystem.writeFile). */
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result
      if (typeof result === 'string') resolve(result.split(',')[1])
      else reject(new Error('FileReader returned non-string result'))
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
