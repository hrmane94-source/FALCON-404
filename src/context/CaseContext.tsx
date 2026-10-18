import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { SavedCaseRecord, CaseFilterOptions, CaseStorageStats } from '../types/caseRecord'
import {
  getAllCaseRecords,
  saveCaseRecord as dbSaveCaseRecord,
  deleteCaseRecord as dbDeleteCaseRecord,
  clearAllCaseRecords as dbClearAllCaseRecords,
  getCaseStorageStats as dbGetCaseStorageStats
} from '../services/caseStorageService'

interface CaseContextType {
  cases: SavedCaseRecord[]
  isLoading: boolean
  error: string | null
  storageStats: CaseStorageStats | null
  stationId: string
  setStationId: (id: string) => void
  saveCase: (record: SavedCaseRecord) => Promise<boolean>
  deleteCase: (id: string) => Promise<boolean>
  clearAllCases: () => Promise<boolean>
  refreshCases: (filter?: CaseFilterOptions) => Promise<void>
  refreshStats: () => Promise<void>
}

const CaseContext = createContext<CaseContextType | undefined>(undefined)

const STATION_ID_KEY = 'falcon_station_identifier'

export const CaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cases, setCases] = useState<SavedCaseRecord[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [storageStats, setStorageStats] = useState<CaseStorageStats | null>(null)
  const [stationId, setStationIdState] = useState<string>(() => {
    try {
      return localStorage.getItem(STATION_ID_KEY) || ''
    } catch {
      return ''
    }
  })

  const setStationId = (newId: string) => {
    setStationIdState(newId)
    try {
      if (newId.trim()) {
        localStorage.setItem(STATION_ID_KEY, newId.trim())
      } else {
        localStorage.removeItem(STATION_ID_KEY)
      }
    } catch {
      // Graceful fallback if localStorage is disabled
    }
  }

  const refreshStats = useCallback(async () => {
    try {
      const stats = await dbGetCaseStorageStats()
      setStorageStats(stats)
    } catch {
      // Graceful fallback
    }
  }, [])

  const refreshCases = useCallback(
    async (filter?: CaseFilterOptions) => {
      setIsLoading(true)
      setError(null)
      try {
        const records = await getAllCaseRecords(filter)
        setCases(records)
        await refreshStats()
      } catch (err: any) {
        setError(err?.message || 'Failed to access local IndexedDB case repository.')
      } finally {
        setIsLoading(false)
      }
    },
    [refreshStats]
  )

  useEffect(() => {
    refreshCases()
  }, [refreshCases])

  const saveCase = async (record: SavedCaseRecord): Promise<boolean> => {
    setError(null)
    try {
      await dbSaveCaseRecord(record)
      await refreshCases()
      return true
    } catch (err: any) {
      setError(err?.message || 'Failed to save case record into IndexedDB.')
      return false
    }
  }

  const deleteCase = async (id: string): Promise<boolean> => {
    setError(null)
    try {
      await dbDeleteCaseRecord(id)
      await refreshCases()
      return true
    } catch (err: any) {
      setError(err?.message || `Failed to delete case record ${id}.`)
      return false
    }
  }

  const clearAllCases = async (): Promise<boolean> => {
    setError(null)
    try {
      await dbClearAllCaseRecords()
      await refreshCases()
      return true
    } catch (err: any) {
      setError(err?.message || 'Failed to clear local case records.')
      return false
    }
  }

  return (
    <CaseContext.Provider
      value={{
        cases,
        isLoading,
        error,
        storageStats,
        stationId,
        setStationId,
        saveCase,
        deleteCase,
        clearAllCases,
        refreshCases,
        refreshStats
      }}
    >
      {children}
    </CaseContext.Provider>
  )
}

export function useCases() {
  const context = useContext(CaseContext)
  if (!context) {
    throw new Error('useCases must be used within a CaseProvider')
  }
  return context
}
