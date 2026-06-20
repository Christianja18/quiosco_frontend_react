import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { LucideIcon } from 'lucide-react'
import {
  Banknote,
  ClipboardList,
  FileBarChart,
  HandCoins,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Menu,
  Package,
  PackageCheck,
  Settings,
  ShoppingCart,
  Users,
  X,
} from 'lucide-react'
import { useState } from 'react'
import './App.css'
import tortasGabyLogo from './assets/tortas-gaby-logo.svg'
import { getProfile, signOut } from './features/auth/api'
import { LoginPage } from './features/auth/LoginPage'
import { useAuth } from './features/auth/useAuth'
import { CashPage } from './features/cash/CashPage'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { DebtsPage } from './features/debts/DebtsPage'
import { InventoryPage } from './features/inventory/InventoryPage'
import { OrdersPage } from './features/orders/OrdersPage'
import { ProductsPage } from './features/products/ProductsPage'
import { ReportsPage } from './features/reports/ReportsPage'
import { SalesPage } from './features/sales/SalesPage'
import { SettingsPage } from './features/settings/SettingsPage'
import { UsersPage } from './features/users/UsersPage'
import { useAppRealtime } from './shared/hooks/useAppRealtime'
import { useProductsRealtime } from './shared/hooks/useProductsRealtime'

type AppView =
  | 'dashboard'
  | 'sales'
  | 'orders'
  | 'products'
  | 'inventory'
  | 'cash'
  | 'debts'
  | 'reports'
  | 'users'
  | 'settings'

type NavigationItem = {
  readonly id: AppView
  readonly label: string
  readonly icon: LucideIcon
}

const navigationItems: ReadonlyArray<NavigationItem> = [
  { id: 'dashboard', label: 'Panel', icon: LayoutDashboard },
  { id: 'sales', label: 'Venta', icon: ShoppingCart },
  { id: 'orders', label: 'Pedidos', icon: ClipboardList },
  { id: 'products', label: 'Productos', icon: Package },
  { id: 'inventory', label: 'Inventario', icon: PackageCheck },
  { id: 'cash', label: 'Caja', icon: Banknote },
  { id: 'debts', label: 'Deudas', icon: HandCoins },
  { id: 'reports', label: 'Reportes', icon: FileBarChart },
  { id: 'users', label: 'Usuarios', icon: Users },
  { id: 'settings', label: 'Config.', icon: Settings },
]

const LoadingScreen = () => (
  <main className="center-screen" aria-label="Cargando aplicación">
    <LoaderCircle className="spin" size={32} />
    <p>Cargando Tortas Gaby...</p>
  </main>
)

function App() {
  const auth = useAuth()
  const [currentView, setCurrentView] = useState<AppView>('sales')
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const queryClient = useQueryClient()
  useAppRealtime({ enabled: auth.status === 'authenticated' })
  useProductsRealtime({ enabled: auth.status === 'authenticated' })

  const userId = auth.status === 'authenticated' ? auth.session.user.id : ''

  const profileQuery = useQuery({
    queryKey: ['profile', userId],
    queryFn: () => getProfile(userId),
    enabled: auth.status === 'authenticated',
    retry: false,
  })

  const signOutMutation = useMutation({
    mutationFn: signOut,
    onSuccess: () => {
      queryClient.clear()
    },
  })

  if (auth.status === 'loading') {
    return <LoadingScreen />
  }

  if (auth.status === 'anonymous') {
    return <LoginPage />
  }

  if (profileQuery.isLoading) {
    return <LoadingScreen />
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <main className="center-screen">
        <section className="login-panel">
          <img className="login-logo compact" src={tortasGabyLogo} alt="" />
          <h1>Perfil no disponible</h1>
          <p className="muted">
            Tu usuario existe en Auth, pero no se pudo cargar el perfil en la
            base de datos.
          </p>
          <button
            className="primary-button"
            type="button"
            onClick={() => signOutMutation.mutate()}
          >
            Cerrar sesión
          </button>
        </section>
      </main>
    )
  }

  const profile = profileQuery.data
  const isSelfServiceUser = profile.role === 'profesor' || profile.role === 'alumno'
  const visibleNavigationItems = isSelfServiceUser
    ? navigationItems.filter(
        (item) => item.id === 'orders' || item.id === 'debts',
      )
    : navigationItems
  const activeView = isSelfServiceUser
    ? currentView === 'debts'
      ? 'debts'
      : 'orders'
    : currentView

  const handleSelectView = (view: AppView) => {
    setCurrentView(view)
    setIsMobileNavOpen(false)
  }

  return (
    <div className="app-shell">
      {isMobileNavOpen ? (
        <button
          className="mobile-nav-backdrop"
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setIsMobileNavOpen(false)}
        />
      ) : null}

      <aside
        className={isMobileNavOpen ? 'sidebar mobile-open' : 'sidebar'}
        aria-label="Navegación principal"
      >
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <img className="brand-logo" src={tortasGabyLogo} alt="" />
          </span>
          <div>
            <strong>Tortas Gaby</strong>
            <span>Dulces y bocaditos</span>
          </div>
        </div>

        <nav className="nav-list">
          {visibleNavigationItems.map((item) => {
            const Icon = item.icon

            return (
              <button
                className={item.id === activeView ? 'nav-item active' : 'nav-item'}
                key={item.id}
                type="button"
                onClick={() => handleSelectView(item.id)}
              >
                <Icon size={19} />
                {item.label}
              </button>
            )
          })}
        </nav>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div className="topbar-identity">
            <button
              className="icon-button mobile-nav-toggle"
              type="button"
              aria-label={isMobileNavOpen ? 'Ocultar menú' : 'Mostrar menú'}
              title={isMobileNavOpen ? 'Ocultar menú' : 'Mostrar menú'}
              onClick={() => setIsMobileNavOpen((current) => !current)}
            >
              {isMobileNavOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div>
              <span className="muted">Usuario activo</span>
              <strong>{profile.full_name}</strong>
            </div>
          </div>
          <div className="topbar-actions">
            <span className="role-badge">{profile.role}</span>
            <button
              className="icon-button"
              type="button"
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
              disabled={signOutMutation.isPending}
              onClick={() => signOutMutation.mutate()}
            >
              <LogOut size={19} />
            </button>
          </div>
        </header>

        <main className="main-content">
          {activeView === 'dashboard' ? <DashboardPage /> : null}
          {activeView === 'sales' ? <SalesPage /> : null}
          {activeView === 'orders' ? (
            <OrdersPage
              profile={profile}
              userEmail={auth.session.user.email ?? null}
            />
          ) : null}
          {activeView === 'products' ? <ProductsPage profile={profile} /> : null}
          {activeView === 'inventory' ? <InventoryPage /> : null}
          {activeView === 'cash' ? <CashPage /> : null}
          {activeView === 'debts' ? <DebtsPage profile={profile} /> : null}
          {activeView === 'reports' ? <ReportsPage /> : null}
          {activeView === 'users' ? <UsersPage profile={profile} /> : null}
          {activeView === 'settings' ? <SettingsPage /> : null}
        </main>
      </div>
    </div>
  )
}

export default App
