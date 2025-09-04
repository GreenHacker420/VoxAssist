import { cn } from '@/lib/utils'

interface StatsCardProps {
  title: string
  value: string
  change: string
  changeType: 'positive' | 'negative' | 'neutral'
  icon: React.ComponentType<{ className?: string }>
}

export function StatsCard({ title, value, change, changeType, icon: Icon }: StatsCardProps) {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-semibold text-gray-900 mt-2">{value}</p>
        </div>
        <div className="h-12 w-12 bg-primary-50 rounded-lg flex items-center justify-center">
          <Icon className="h-6 w-6 text-primary-600" />
        </div>
      </div>
      <div className="mt-4 flex items-center">
        <span className={cn(
          'text-sm font-medium',
          changeType === 'positive' ? 'text-success-600' : 
          changeType === 'negative' ? 'text-danger-600' : 'text-gray-600'
        )}>
          {change}
        </span>
        <span className="text-sm text-gray-600 ml-2">from yesterday</span>
      </div>
    </div>
  )
}
