import type { ReactNode } from 'react'
import clsx from 'clsx'

interface CardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
}

export function Card({ children, className, onClick }: CardProps) {
  return (
    <div
      className={clsx(
        'bg-white rounded-xl shadow-sm border border-gray-100 p-6',
        onClick && 'cursor-pointer hover:shadow-md transition-shadow',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

interface StatCardProps {
  title: string
  value: string | number
  icon?: ReactNode
  trend?: { value: number; label: string }
  color?: 'primary' | 'danger' | 'warning' | 'success' | 'info'
}

const colorMap = {
  primary: 'bg-primary-50 text-primary-600',
  danger: 'bg-red-50 text-danger',
  warning: 'bg-amber-50 text-warning',
  success: 'bg-green-50 text-success',
  info: 'bg-blue-50 text-blue-600',
}

export function StatCard({ title, value, icon, trend, color = 'primary' }: StatCardProps) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          {trend && (
            <p className={clsx('mt-1 text-sm', trend.value >= 0 ? 'text-success' : 'text-danger')}>
              {trend.value >= 0 ? '↑' : '↓'} {trend.label}
            </p>
          )}
        </div>
        {icon && (
          <div className={clsx('p-3 rounded-lg', colorMap[color])}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  )
}
