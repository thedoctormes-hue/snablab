import { createBrowserRouter, Navigate } from 'react-router-dom'
import { Layout } from '@/components/features/Layout'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { NomenclaturePage } from '@/pages/NomenclaturePage'
import { SuppliersPage } from '@/pages/SuppliersPage'
import { OffersPage } from '@/pages/OffersPage'
import { InventoryPage } from '@/pages/InventoryPage'
import { PurchasesPage } from '@/pages/PurchasesPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { EquipmentPage } from '@/pages/EquipmentPage'
import AnalyticsPage from '@/pages/AnalyticsPage'
import { GovContractsPage } from '@/pages/GovContractsPage'
import { EventsPage } from '@/pages/EventsPage'
import { FedLabPage } from '@/pages/FedLabPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('snablab_token')
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'nomenclature', element: <NomenclaturePage /> },
      { path: 'suppliers', element: <SuppliersPage /> },
      { path: 'offers', element: <OffersPage /> },
      { path: 'inventory', element: <InventoryPage /> },
      { path: 'purchases', element: <PurchasesPage /> },
      { path: 'equipment', element: <EquipmentPage /> },
      { path: 'analytics', element: <AnalyticsPage /> },
      { path: 'gov-contracts', element: <GovContractsPage /> },
      { path: 'events', element: <EventsPage /> },
      { path: 'fedlab', element: <FedLabPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
])
