/**
 * File validation utilities for FALCON document upload.
 * Performs extension, MIME-type, size, and binary magic-number validation in the browser.
 */

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB
export const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export interface FileValidationResult {
  valid: boolean
  error?: string
  detectedFormat?: string
  width?: number
  height?: number
}

/**
 * Format bytes to readable string (e.g. 2.4 MB, 450 KB)
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

/**
 * Inspect file header binary magic numbers to verify actual image signature.
 * Prevents disguised files (e.g., .exe or .html renamed to .png).
 */
async function validateMagicBytes(file: File): Promise<{ valid: boolean; format?: string }> {
  try {
    const slice = file.slice(0, 16)
    const buffer = await slice.arrayBuffer()
    const bytes = new Uint8Array(buffer)

    // JPEG signature: FF D8 FF
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return { valid: true, format: 'JPEG Image' }
    }

    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    if (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    ) {
      return { valid: true, format: 'PNG Image' }
    }

    // WebP signature: 'RIFF' at 0..3 and 'WEBP' at 8..11
    if (
      bytes[0] === 0x52 && // R
      bytes[1] === 0x49 && // I
      bytes[2] === 0x46 && // F
      bytes[3] === 0x46 && // F
      bytes[8] === 0x57 && // W
      bytes[9] === 0x45 && // E
      bytes[10] === 0x42 && // B
      bytes[11] === 0x50 // P
    ) {
      return { valid: true, format: 'WebP Image' }
    }

    return { valid: false }
  } catch {
    return { valid: false }
  }
}

/**
 * Load image in-memory to verify readable raster data and extract dimensions.
 */
function verifyImageReadability(file: File): Promise<{ valid: boolean; width?: number; height?: number }> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()

    img.onload = () => {
      const dimensions = { width: img.naturalWidth, height: img.naturalHeight }
      URL.revokeObjectURL(objectUrl)
      resolve({ valid: true, ...dimensions })
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      resolve({ valid: false })
    }

    img.src = objectUrl
  })
}

/**
 * Comprehensive client-side document validation.
 */
export async function validateDocumentFile(file: File): Promise<FileValidationResult> {
  // 1. Empty file check
  if (!file || file.size === 0) {
    return {
      valid: false,
      error: 'The selected file is empty (0 bytes). Please select a valid document image.'
    }
  }

  // 2. Maximum file size check (10 MB)
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size exceeds the 10 MB limit (current: ${formatFileSize(file.size)}). Please upload a smaller image.`
    }
  }

  // 3. Extension check
  const fileNameLower = file.name.toLowerCase()
  const hasValidExtension = ALLOWED_EXTENSIONS.some((ext) => fileNameLower.endsWith(ext))
  if (!hasValidExtension) {
    return {
      valid: false,
      error: 'Unsupported file extension. Only JPEG (.jpg, .jpeg), PNG (.png), and WebP (.webp) documents are accepted.'
    }
  }

  // 4. Declared MIME type check
  if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Unsupported file type (${file.type}). Please select a standard JPEG, PNG, or WebP image.`
    }
  }

  // 5. Binary magic-number inspection
  const magicCheck = await validateMagicBytes(file)
  if (!magicCheck.valid) {
    return {
      valid: false,
      error: 'Invalid file content. The file header does not match genuine JPEG, PNG, or WebP image data.'
    }
  }

  // 6. Raster rendering readability check
  const readabilityCheck = await verifyImageReadability(file)
  if (!readabilityCheck.valid) {
    return {
      valid: false,
      error: 'Unreadable image. The file appears to be corrupted or cannot be rendered by the browser.'
    }
  }

  return {
    valid: true,
    detectedFormat: magicCheck.format,
    width: readabilityCheck.width,
    height: readabilityCheck.height
  }
}
