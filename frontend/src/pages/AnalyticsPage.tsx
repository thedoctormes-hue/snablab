import { useState, useEffect } from "react";
import { analyticsApi, DashboardStats } from "../api/analytics";
import { SkeletonStats, SkeletonCard } from "../components/common/Skeleton";

const STATUS_LABELS: Record<string, string> = {
  // Equipment
  active: "Активно",
  maintenance: "На ТО",
  repair: "В ремонте",
  decommissioned: "Списано",
  // Inventory
  in_stock: "В наличии",
  reserved: "Резерв",
  expired: "Просрочено",
  // Purchases
  draft: "Черновик",
  pending: "На согласовании",
  approved: "Одобрено",
  rejected: "Отклонено",
  completed: "Завершено",
  // Offers (pending уже есть выше — для purchases)
  parsed: "Обработано",
  error: "Ошибка",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500",
  in_stock: "bg-green-500",
  approved: "bg-green-500",
  completed: "bg-green-500",
  parsed: "bg-green-500",
  maintenance: "bg-yellow-500",
  pending: "bg-yellow-500",
  reserved: "bg-yellow-500",
  repair: "bg-orange-500",
  draft: "bg-gray-400",
  rejected: "bg-red-500",
  decommissioned: "bg-gray-500",
  expired: "bg-red-500",
  error: "bg-red-500",
};

function StatusBar({ by_status }: { by_status: Record<string, number> }) {
  const total = Object.values(by_status).reduce((a, b) => a + b, 0);
  if (total === 0) return <p className="text-gray-400 text-sm">Нет данных</p>;

  return (
    <div className="space-y-2">
      <div className="flex h-3 rounded-full overflow-hidden bg-gray-100">
        {Object.entries(by_status).map(([status, count]) => (
          <div
            key={status}
            className={`${STATUS_COLORS[status] || "bg-gray-400"} transition-all`}
            style={{ width: `${(count / total) * 100}%` }}
            title={`${STATUS_LABELS[status] || status}: ${count}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-3 text-xs">
        {Object.entries(by_status).map(([status, count]) => (
          <span key={status} className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[status] || "bg-gray-400"}`} />
            {STATUS_LABELS[status] || status}: {count}
          </span>
        ))}
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, icon }: {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const { data } = await analyticsApi.getDashboard();
      setStats(data);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || "Ошибка загрузки статистики");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">📊 Аналитика</h1>
        <SkeletonStats />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error}</p>
        <button
          onClick={loadStats}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Повторить
        </button>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">📊 Аналитика</h1>
        <button
          onClick={loadStats}
          className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          🔄 Обновить
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          title="Номенклатура"
          value={stats.nomenclature.active}
          icon="📦"
        />
        <StatCard
          title="Поставщики"
          value={stats.suppliers.active}
          icon="🏢"
        />
        <StatCard
          title="Оборудование"
          value={stats.equipment.total}
          icon="🔧"
        />
        <StatCard
          title="Склад (ед.)"
          value={stats.inventory.total_quantity.toLocaleString()}
          icon="📋"
        />
        <StatCard
          title="Заявки"
          value={stats.purchases.total}
          icon="📝"
        />
        <StatCard
          title="Истекает (30д)"
          value={stats.inventory.expiring_30d}
          subtitle="срок годности"
          icon="⚠️"
        />
      </div>

      {/* Status Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Equipment */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="font-semibold mb-4">🔧 Оборудование по статусам</h3>
          <StatusBar by_status={stats.equipment.by_status} />
        </div>

        {/* Inventory */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="font-semibold mb-4">📋 Склад по статусам</h3>
          <StatusBar by_status={stats.inventory.by_status} />
        </div>

        {/* Purchases */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="font-semibold mb-4">📝 Заявки на закупку</h3>
          <StatusBar by_status={stats.purchases.by_status} />
        </div>

        {/* Offers */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="font-semibold mb-4">📄 Коммерческие предложения</h3>
          <StatusBar by_status={stats.offers.by_status} />
        </div>
      </div>
    </div>
  );
}
