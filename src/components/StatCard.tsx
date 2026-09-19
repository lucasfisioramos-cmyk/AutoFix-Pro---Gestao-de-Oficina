import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';

interface StatCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  variant?: 'default' | 'income' | 'expense';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  className,
  variant = 'default',
}) => {
  const variantStyles = {
    default: 'text-slate-600',
    income: 'text-emerald-600',
    expense: 'text-rose-600',
  };

  return (
    <div className={cn('glass-card p-6 flex flex-col gap-4', className)}>
      <div className="flex justify-between items-start">
        <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
          <Icon className={cn('w-5 h-5', variantStyles[variant])} />
        </div>
        {trend && (
          <span className={cn(
            'text-xs font-medium px-2 py-1 rounded-full',
            trend.isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
          )}>
            {trend.isPositive ? '+' : '-'}{Math.abs(trend.value)}%
          </span>
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">{title}</p>
        <h3 className="text-2xl font-bold text-slate-900 mt-1">
          {formatCurrency(value)}
        </h3>
      </div>
    </div>
  );
};
