import type { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export function Card({ children, className = '', hover = false }: { children: ReactNode; className?: string; hover?: boolean }) {
  return <div className={`card ${hover ? 'card-hover' : ''} ${className}`}>{children}</div>;
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-ink-700/40">
      <div>
        <h3 className="text-sm font-semibold text-ink-100">{title}</h3>
        {subtitle && <p className="text-xs text-ink-400 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  change,
  subtitle,
  icon,
  accent = 'default',
}: {
  label: string;
  value: string;
  change?: number;
  subtitle?: string;
  icon?: ReactNode;
  accent?: 'default' | 'bull' | 'bear' | 'accent' | 'gold';
}) {
  const accentColors = {
    default: 'text-ink-100',
    bull: 'text-bull-400',
    bear: 'text-bear-400',
    accent: 'text-accent-400',
    gold: 'text-gold-400',
  };
  return (
    <Card className="p-4" hover>
      <div className="flex items-center justify-between mb-2">
        <span className="label">{label}</span>
        {icon && <span className="text-ink-400">{icon}</span>}
      </div>
      <div className={`stat-value text-2xl ${accentColors[accent]}`}>{value}</div>
      {subtitle && <p className="text-xs text-ink-400 mt-0.5">{subtitle}</p>}
      {change !== undefined && (
        <div className="flex items-center gap-1 mt-1 text-xs">
          {change > 0 ? (
            <TrendingUp className="w-3 h-3 text-bull-400" />
          ) : change < 0 ? (
            <TrendingDown className="w-3 h-3 text-bear-400" />
          ) : (
            <Minus className="w-3 h-3 text-ink-400" />
          )}
          <span className={change > 0 ? 'text-bull-400' : change < 0 ? 'text-bear-400' : 'text-ink-400'}>
            {change > 0 ? '+' : ''}{change.toFixed(2)}%
          </span>
        </div>
      )}
    </Card>
  );
}

export function ConfidenceBar({ value }: { value: number }) {
  const color = value >= 85 ? 'bg-bull-500' : value >= 75 ? 'bg-accent-500' : 'bg-gold-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-ink-700/60 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-500`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-xs font-mono font-semibold text-ink-200 w-10 text-right">{value.toFixed(0)}%</span>
    </div>
  );
}

export function DirectionBadge({ direction }: { direction: 'BUY' | 'SELL' }) {
  return direction === 'BUY' ? (
    <span className="badge-bull">
      <TrendingUp className="w-3 h-3" /> BUY
    </span>
  ) : (
    <span className="badge-bear">
      <TrendingDown className="w-3 h-3" /> SELL
    </span>
  );
}

export function ImpactBadge({ impact }: { impact: 'HIGH' | 'MEDIUM' | 'LOW' }) {
  if (impact === 'HIGH') return <span className="badge-bear">HIGH</span>;
  if (impact === 'MEDIUM') return <span className="badge-gold">MEDIUM</span>;
  return <span className="badge-neutral">LOW</span>;
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-ink-400">
      <p className="text-sm">{message}</p>
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors ${checked ? 'bg-accent-500' : 'bg-ink-600'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : ''}`}
        />
      </button>
      {label && <span className="text-sm text-ink-200">{label}</span>}
    </label>
  );
}
