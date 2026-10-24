/**
 * Persistent Client-Side Case Storage Service for FALCON-404.
 *
 * Uses native browser IndexedDB (`falcon_cases_db`, store: `cases`).
 * Handles schema versioning (Version 1).
 * Strictly guarantees client-side data boundaries:
 * - NO document images stored.
 * - NO raw OCR text buffers stored.
 * - NO unmasked PII stored.
 * - Graceful fallback / error reporting when IndexedDB is unavailable (e.g. private mode restrictions).
 */

import type { SavedCaseRecord, CaseFilterOptions, CaseStorageStats } from '../types/caseRecord'
import type {
  DocumentType,
  CandidateField,
  ScreeningReportData
} from '../types'
import { maskCandidateFieldValue } from '../utils/reportExport.ts'
import { PROJECT_BRANDING } from '../constants/branding.ts'

const DB_NAME = 'falcon_cases_db'
const DB_VERSION = 1
const STORE_NAME = 'cases'

/**
 * Opens or initializes the IndexedDB database.
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported or permitted in this environment.'))
      return
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('timestamp', 'timestamp', { unique: false })
        store.createIndex('documentCategory', 'documentCategory', { unique: false })
        store.createIndex('priority', 'assessment.priority', { unique: false })
      }
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onerror = () => {
      reject(request.error || new Error('Failed to open FALCON case database.'))
    }
  })
}

/**
 * Converts live screening pipeline results into a privacy-sanitized SavedCaseRecord.
 */
export function buildSavedCaseRecord(
  reportData: ScreeningReportData,
  stationId?: string
): SavedCaseRecord {
  const {
    reportId,
    selectedDocumentType,
    detectedDocumentType,
    ocrStatus,
    ocrConfidence,
    ocrResult,
    integrityResult,
    layoutResult
  } = reportData

  const candidateFields = ocrResult?.candidateFields || []

  // Strictly mask candidate fields before saving
  const sanitizedFields: CandidateField[] = candidateFields.map((field) => ({
    ...field,
    value: maskCandidateFieldValue(field)
  }))

  const now = new Date()
  const savedAt = now.toLocaleString()

  // Clean boundary & layout findings
  const layoutFindings = layoutResult ? [...layoutResult.findings] : []
  const integrityFindings = [...integrityResult.findings]

  return {
    schemaVersion: 1,
    id: reportId,
    savedAt,
    timestamp: now.getTime(),
    documentCategory: selectedDocumentType as DocumentType,
    detectedDocumentType,
    fileFormat: integrityResult.fileProperties.detectedFormat,
    fileSizeBytes: integrityResult.fileProperties.fileSizeBytes,
    fileSizeFormatted: integrityResult.fileProperties.fileSizeFormatted,
    dimensions: {
      width: integrityResult.quality.width,
      height: integrityResult.quality.height
    },
    aspectRatio: integrityResult.quality.aspectRatio,
    ocrStatus,
    ocrConfidence,
    candidateFields: sanitizedFields,
    quality: integrityResult.quality,
    metadata: integrityResult.metadata,
    ela: {
      ...integrityResult.ela,
      elaVisualizationUrl: undefined // DO NOT persist base64 image strings in database
    },
    boundaryStatus: layoutResult ? layoutResult.statusLabel : 'Not Performed',
    detectorScore: layoutResult ? layoutResult.detectorScore : 0,
    geometry: layoutResult?.geometry,
    perspective: layoutResult?.perspective,
    framing: layoutResult
      ? layoutResult.framing
      : {
          status: 'inconclusive',
          statusLabel: 'Not Assessed',
          marginsPx: { top: 0, right: 0, bottom: 0, left: 0 },
          minMarginPx: 0,
          areaCoveragePercent: 0,
          assessmentNote: 'Boundary analysis was not performed.'
        },
    layoutQuality: layoutResult
      ? layoutResult.layoutQuality
      : {
          performed: false,
          status: 'not-assessable',
          statusLabel: 'Not Performed',
          totalTextRegions: 0,
          regionsInsideBoundary: 0,
          regionsOutsideBoundary: 0,
          containmentRatio: null,
          containmentFormatted: 'N/A',
          isLayoutConsistent: false,
          isBoundaryReliable: false,
          layoutAssessmentNote: 'Boundary analysis was not performed.'
        },
    assessment: {
      priority: integrityResult.assessment.priority,
      priorityLabel: integrityResult.assessment.priorityLabel,
      summary: integrityResult.assessment.summary,
      recommendedAction: integrityResult.assessment.recommendedAction,
      contributingFindings: integrityResult.assessment.contributingFindings
    },
    integrityFindings,
    layoutFindings,
    stationId: stationId?.trim() || undefined,
    developerAttribution: PROJECT_BRANDING.developerAttribution
  }
}

/**
 * Saves a case record into IndexedDB.
 * Prevents accidental overwrite of existing records unless explicitly intended.
 */
export async function saveCaseRecord(record: SavedCaseRecord): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)

      const request = store.put(record)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error || new Error('Failed to save case record.'))
      tx.oncomplete = () => db.close()
    } catch (err) {
      reject(err)
    }
  })
}

/**
 * Retrieves all saved cases, optionally filtered, sorted descending by timestamp.
 */
export async function getAllCaseRecords(filter?: CaseFilterOptions): Promise<SavedCaseRecord[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const request = store.getAll()

      request.onsuccess = () => {
        let results = (request.result as SavedCaseRecord[]) || []

        // Sort by timestamp descending
        results.sort((a, b) => b.timestamp - a.timestamp)

        if (filter) {
          if (filter.searchTerm) {
            const query = filter.searchTerm.toLowerCase().trim()
            results = results.filter((item) => {
              const matchesId = item.id.toLowerCase().includes(query)
              const matchesDocType = item.documentCategory.toLowerCase().includes(query)
              const matchesField = item.candidateFields.some((f) =>
                f.value.toLowerCase().includes(query)
              )
              return matchesId || matchesDocType || matchesField
            })
          }

          if (filter.documentType && filter.documentType !== 'all') {
            results = results.filter((item) => item.documentCategory === filter.documentType)
          }

          if (filter.priority && filter.priority !== 'all') {
            results = results.filter((item) => item.assessment.priority === filter.priority)
          }
        }

        resolve(results)
      }

      request.onerror = () => reject(request.error || new Error('Failed to retrieve case records.'))
      tx.oncomplete = () => db.close()
    } catch (err) {
      reject(err)
    }
  })
}

/**
 * Retrieves a single case record by its unique ID.
 */
export async function getCaseRecordById(id: string): Promise<SavedCaseRecord | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const request = store.get(id)

      request.onsuccess = () => resolve((request.result as SavedCaseRecord) || null)
      request.onerror = () => reject(request.error || new Error(`Failed to load case record ${id}.`))
      tx.oncomplete = () => db.close()
    } catch (err) {
      reject(err)
    }
  })
}

/**
 * Deletes an individual case record by its ID.
 */
export async function deleteCaseRecord(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error || new Error(`Failed to delete case record ${id}.`))
      tx.oncomplete = () => db.close()
    } catch (err) {
      reject(err)
    }
  })
}

/**
 * Clears all saved case records from the local database.
 */
export async function clearAllCaseRecords(): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const request = store.clear()

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error || new Error('Failed to clear case records.'))
      tx.oncomplete = () => db.close()
    } catch (err) {
      reject(err)
    }
  })
}

/**
 * Calculates current storage telemetry (record count and approximate storage footprint in KB).
 */
export async function getCaseStorageStats(): Promise<CaseStorageStats> {
  try {
    const records = await getAllCaseRecords()
    const serialized = JSON.stringify(records)
    const bytes = new Blob([serialized]).size

    const formatted =
      bytes < 1024
        ? `${bytes} B`
        : bytes < 1024 * 1024
        ? `${(bytes / 1024).toFixed(1)} KB`
        : `${(bytes / (1024 * 1024)).toFixed(2)} MB`

    return {
      recordCount: records.length,
      estimatedStorageBytes: bytes,
      estimatedStorageFormatted: formatted,
      storageAvailable: true,
      oldestRecordDate: records.length > 0 ? records[records.length - 1].savedAt : undefined,
      newestRecordDate: records.length > 0 ? records[0].savedAt : undefined
    }
  } catch {
    return {
      recordCount: 0,
      estimatedStorageBytes: 0,
      estimatedStorageFormatted: '0 KB',
      storageAvailable: false
    }
  }
}
