import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Package, Truck, FileText, ShoppingCart, AlertTriangle, BarChart3 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Card, StatCard } from '@/components/common/Card'
import { Badge } from '@/components/common/Badge'
import { PageSpinner } from '@/components/common/Spinner'
import { nomenclatureApi } from '@/api/nomenclature'
import { suppliersApi } from '@/api/suppliers'
import { offersApi } from '@/api/offers'
import { inventoryApi } from '@/api/inventory'
import { purchasesApi } from '@/api/purchases'
import type { Inventory, CommercialOffer } from '@/types'

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [totalNomenclature, setTotalNomenclature] = useState(0)
  const [totalSuppliers, setTotalSuppliers] = useState(0)
  const [activeOffers, setActiveOffers] = useState(0)
  const [pendingPurchases, setPendingPurchases] = useState(0)
  const [lowStockItems, setLowStockItems] = useState<Inventory[]>([])
  const [recentOffers, setRecentOffers] = useState<CommercialOffer[]>([])
  const [inventoryChartData, setInventoryChartData] = useState<{ name: string; quantity: number }[]>([])
  const [purchasesChartData, setPurchasesChartData] = useState<{ name: string; value: number }[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadDashboard = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const [nom, sup, off, inv, purch, allInv, allPurch] = await Promise.allSettled([
          nomenclatureApi.list({ limit: 1 }),
          suppliersApi.list({ limit: 1 }),
          offersApi.list({ limit: 5 }),
          inventoryApi.lowStock(),
          purchasesApi.list({ status: 'pending', limit: 1 }),
          inventoryApi.list({ limit: 20 }),
          purchasesApi.list({ limit: 100 }),
        ])

        if (nom.status === 'fulfilled') setTotalNomenclature(nom.value.total)
        if (sup.status === 'fulfilled') setTotalSuppliers(sup.value.total)
        if (off.status === 'fulfilled') {
          setActiveOffers(off.value.total)
          setRecentOffers(off.value.items)
        }
        if (inv.status === 'fulfilled') setLowStockItems(inv.value.items)
        if (purch.status === 'fulfilled') setPendingPurchases(purch.value.total)

        // Build inventory chart data
        if (allInv.status === 'fulfilled') {
          const chartData = allInv.value.items.map((item) => ({
            name: `#${item.nomenclature_id}`,
            quantity: item.quantity,
          }))
          setInventoryChartData(chartData)
        }

        // Build purchases pie chart data
        if (allPurch.status === 'fulfilled') {
          const statusCounts: Record<string, number> = {}
          allPurch.value.items.forEach((p) => {
            statusCounts[p.status] = (statusCounts[p.status] || 0) + 1
          })
          const pieData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }))
          setPurchasesChartData(pieData)
        }
      } catch (err) {
        setError('Ошибка загрузки данных дашборда')
        console.error('Failed to load dashboard:', err)
      } finally {
        setIsLoading(false)
      }
    }
    loadDashboard()
  }, [])

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Дашборд</h1>
        <p className="text-gray-500 mt-1">Обзор состояния закупок и склада</p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 text-danger text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard
          title="Номенклатура"
          value={totalNomenclature}
          icon={<Package className="h-5 w-5" />}
          color="primary"
        />
        <StatCard
          title="Поставщики"
          value={totalSuppliers}
          icon={<Truck className="h-5 w-5" />}
          color="primary"
        />
        <StatCard
          title="КП"
          value={activeOffers}
          icon={<FileText className="h-5 w-5" />}
          color="success"
        />
        <StatCard
          title="Мало на складе"
          value={lowStockItems.length}
          icon={<AlertTriangle className="h-5 w-5" />}
          color="warning"
        />
        <StatCard
          title="Заявки"
          value={pendingPurchases}
          icon={<ShoppingCart className="h-5 w-5" />}
          color="info"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-base font-semibold text-gray-800 mb-4">Складские остатки</h3>
          {inventoryChartData.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">Нет данных по складу</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={inventoryChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="quantity" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Количество" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <h3 className="text-base font-semibold text-gray-800 mb-4">Статусы закупок</h3>
          {purchasesChartData.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">Нет данных по закупкам</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={purchasesChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {purchasesChartData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-base font-semibold text-gray-800 mb-4">Последние коммерческие предложения</h3>
          {recentOffers.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">Нет коммерческих предложений</p>
          ) : (
            <div className="space-y-3">
              {recentOffers.map((offer) => (
                <div key={offer.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Поставщик #{offer.supplier_id}</p>
                    <p className="text-xs text-gray-500">{offer.offer_number || 'Без номера'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-700">{offer.total_amount ? `${offer.total_amount} ₽` : '—'}</p>
                    <Badge variant={offer.parsed_status === 'new' ? 'info' : offer.parsed_status === 'approved' ? 'success' : 'default'}>
                      {offer.parsed_status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h3 className="text-base font-semibold text-gray-800 mb-4">⚠️ Требует внимания</h3>
          {lowStockItems.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">Всё в порядке, критических остатков нет</p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium text-warning mb-2">Мало на складе</p>
              {lowStockItems.map((item) => (
                <div key={item.id} className="flex justify-between text-sm py-1">
                  <span className="text-gray-600">ID ном: {item.nomenclature_id}</span>
                  <span className="text-warning font-medium">{item.quantity} {item.unit}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <h3 className="text-base font-semibold text-gray-800 mb-4">Быстрые действия</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Новая заявка', emoji: '📋' },
            { label: 'Загрузить КП', emoji: '📄' },
            { label: 'Добавить позицию', emoji: '➕' },
            { label: 'Складской учёт', emoji: '📦' },
          ].map((action) => (
            <button
              key={action.label}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors"
            >
              <span className="text-2xl">{action.emoji}</span>
              <span className="text-sm text-gray-600">{action.label}</span>
            </button>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100">
          <Link
            to="/analytics"
            className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            <BarChart3 className="h-4 w-4" />
            Подробная аналитика →
          </Link>
        </div>
      </Card>
    </div>
  )
}
