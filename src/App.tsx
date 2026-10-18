import { useState } from 'react'
import type { NavigationSection } from './types'
import { MainLayout } from './layouts/MainLayout'
import { OverviewPage } from './pages/OverviewPage'
import { NewVerificationPage } from './pages/NewVerificationPage'
import { CaseHistoryPage } from './pages/CaseHistoryPage'
import { ReportsPage } from './pages/ReportsPage'
import { SettingsPage } from './pages/SettingsPage'

export default function App() {
  const [currentSection, setCurrentSection] = useState<NavigationSection>('overview')

  const renderCurrentSection = () => {
    switch (currentSection) {
      case 'overview':
        return <OverviewPage onNavigate={setCurrentSection} />
      case 'new-verification':
        return <NewVerificationPage onNavigate={setCurrentSection} />
      case 'case-history':
        return <CaseHistoryPage onNavigate={setCurrentSection} />
      case 'reports':
        return <ReportsPage onNavigate={setCurrentSection} />
      case 'settings':
        return <SettingsPage />
      default:
        return <OverviewPage onNavigate={setCurrentSection} />
    }
  }

  return (
    <MainLayout
      currentSection={currentSection}
      onNavigate={setCurrentSection}
    >
      {renderCurrentSection()}
    </MainLayout>
  )
}
