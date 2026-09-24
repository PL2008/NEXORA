import { MotionConfig } from 'motion/react'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { DataProvider } from '@/app/data'
import { ErrorBoundary } from '@/app/ErrorBoundary'
import { ThemeController } from '@/app/theme'
import { AppLayout } from '@/components/layout/AppLayout'
import { ConfirmProvider } from '@/components/ui/Confirm'
import { ToastProvider } from '@/components/ui/Toast'
import { ClientDetailPage } from '@/features/clients/ClientDetailPage'
import { ClientsPage } from '@/features/clients/ClientsPage'
import { ContractsPage } from '@/features/contracts/ContractsPage'
import { ExpensesPage } from '@/features/expenses/ExpensesPage'
import { NotFoundPage } from '@/features/NotFoundPage'
import { OverviewPage } from '@/features/overview/OverviewPage'
import { ProposalsPage } from '@/features/proposals/ProposalsPage'
import { ReceivablesPage } from '@/features/receivables/ReceivablesPage'
import { ReportsPage } from '@/features/reports/ReportsPage'
import { SalesPage } from '@/features/sales/SalesPage'
import { SettingsPage } from '@/features/settings/SettingsPage'

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <OverviewPage /> },
      { path: 'vendas', element: <SalesPage /> },
      { path: 'recebimentos', element: <ReceivablesPage /> },
      { path: 'despesas', element: <ExpensesPage /> },
      { path: 'clientes', element: <ClientsPage /> },
      { path: 'clientes/:id', element: <ClientDetailPage /> },
      { path: 'propostas', element: <ProposalsPage /> },
      { path: 'contratos', element: <ContractsPage /> },
      { path: 'relatorios', element: <ReportsPage /> },
      { path: 'configuracoes', element: <SettingsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

function Splash() {
  return <div className="min-h-dvh bg-canvas" aria-busy="true" />
}

export function App() {
  return (
    <ErrorBoundary>
      <MotionConfig reducedMotion="user">
        <DataProvider fallback={<Splash />}>
          <ThemeController />
          <ToastProvider>
            <ConfirmProvider>
              <RouterProvider router={router} />
            </ConfirmProvider>
          </ToastProvider>
        </DataProvider>
      </MotionConfig>
    </ErrorBoundary>
  )
}
