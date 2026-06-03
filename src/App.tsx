import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Package,
  ShoppingCart,
  Store,
} from 'lucide-react'
import { useState } from 'react'
import './App.css'
import { getProfile, signOut } from './features/auth/api'
import { LoginPage } from './features/auth/LoginPage'
import { useAuth } from './features/auth/useAuth'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { ProductsPage } from './features/products/ProductsPage'
import { SalesPage } from './features/sales/SalesPage'

type AppView = 'dashboard' | 'sales' | 'products'

type NavigationItem = {
  readonly id: AppView
  readonly label: string
  readonly icon: LucideIcon
}

const navigationItems: ReadonlyArray<NavigationItem> = [
  { id: 'dashboard', label: 'Panel', icon: LayoutDashboard },
  { id: 'sales', label: 'Venta', icon: ShoppingCart },
  { id: 'products', label: 'Productos', icon: Package },
]

const LoadingScreen = () => (
  <main className="center-screen" aria-label="Cargando aplicación">
    <LoaderCircle className="spin" size={32} />
    <p>Cargando quiosco...</p>
  </main>
)

function App() {
  const auth = useAuth()
  const [currentView, setCurrentView] = useState<AppView>('sales')
  const queryClient = useQueryClient()

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
          <Store size={32} />
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

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Navegación principal">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <Store size={24} />
          </span>
          <div>
            <strong>Quiosco Perú</strong>
            <span>Sistema escolar</span>
          </div>
        </div>

        <nav className="nav-list">
          {navigationItems.map((item) => {
            const Icon = item.icon

            return (
              <button
                className={item.id === currentView ? 'nav-item active' : 'nav-item'}
                key={item.id}
                type="button"
                onClick={() => setCurrentView(item.id)}
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
          <div>
            <span className="muted">Usuario activo</span>
            <strong>{profile.full_name}</strong>
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
          {currentView === 'dashboard' ? <DashboardPage /> : null}
          {currentView === 'sales' ? <SalesPage /> : null}
          {currentView === 'products' ? <ProductsPage profile={profile} /> : null}
        </main>
      </div>
    </div>
  )
}

export default App
