import React, { useState } from 'react'
import type { NavigationSection } from '../types'
import { Sidebar } from '../components/shell/Sidebar'
import { TopNav } from '../components/shell/TopNav'
import { Footer } from '../components/shell/Footer'

export interface MainLayoutProps {
  currentSection: NavigationSection
  onNavigate: (section: NavigationSection) => void
  children: React.ReactNode
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  currentSection,
  onNavigate,
  children
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased text-slate-800">
      {/* Sidebar */}
      <Sidebar
        currentSection={currentSection}
        onNavigate={onNavigate}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0 transition-all">
        <TopNav
          currentSection={currentSection}
          onNavigate={onNavigate}
          onToggleSidebar={() => setSidebarOpen(true)}
        />

        <main className="flex-1 p-6 sm:p-8 max-w-6xl w-full mx-auto space-y-8">
          {children}
        </main>

        <Footer />
      </div>
    </div>
  )
}
