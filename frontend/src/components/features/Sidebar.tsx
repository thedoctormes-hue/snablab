import { NavLink } from 'react-router-dom'
import { useUIStore } from '@/store/uiStore'
import {
  LayoutDashboard,
  Package,
  Truck,
  FileText,
  Warehouse,
  ShoppingCart,
  Settings,
  FlaskConical,
  Monitor,
  BarChart3,
  Building2,
  CalendarDays,
  BookOpen,
  X,
} from 'lucide-react'
import clsx from 'clsx'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Дашборд' },
  { to: '/nomenclature', icon: Package, label: 'Номенклатура' },
  { to: '/suppliers', icon: Truck, label: 'Поставщики' },
  { to: '/offers', icon: FileText, label: 'Коммерческие предложения' },
  { to: '/inventory', icon: Warehouse, label: 'Склад' },
  { to: '/purchases', icon: ShoppingCart, label: 'Закупки' },
  { to: '/equipment', icon: Monitor, label: 'Оборудование' },
  { to: '/analytics', icon: BarChart3, label: 'Аналитика' },
  { to: '/gov-contracts', icon: Building2, label: 'Госзакупки' },
  { to: '/events', icon: CalendarDays, label: 'Мероприятия' },
  { to: '/fedlab', icon: BookOpen, label: 'База знаний FedLab' },
  { to: '/settings', icon: Settings, label: 'Настройки' },
]

export function Sidebar() {
  const { sidebarOpen, setSidebar } = useUIStore()

  const handleNavClick = () => {
    // На мобильных закрываем sidebar после навигации
    if (window.innerWidth < 768) {
      setSidebar(false)
    }
  }

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setSidebar(false)}
        />
      )}

      <aside
        className={clsx(
          'fixed left-0 top-0 z-40 h-screen bg-white border-r border-gray-200 transition-all duration-300',
          // Mobile: скрыт по умолчанию, показан когда open
          'md:translate-x-0',
          sidebarOpen
            ? 'w-64 translate-x-0'
            : 'w-16 -translate-x-full md:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-100">
          <div className="flex items-center">
            <FlaskConical className="h-8 w-8 text-primary-600 flex-shrink-0" />
            {sidebarOpen && (
              <span className="ml-3 text-lg font-bold text-gray-900">СнабЛаб</span>
            )}
          </div>
          {/* Close button on mobile */}
          {sidebarOpen && (
            <button
              onClick={() => setSidebar(false)}
              className="md:hidden p-1 rounded hover:bg-gray-100"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={handleNavClick}
              className={({ isActive }) =>
                clsx(
                  'flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )
              }
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {sidebarOpen && <span className="ml-3">{item.label}</span>}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  )
}
