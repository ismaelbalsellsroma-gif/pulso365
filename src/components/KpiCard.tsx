import { ReactNode } from 'react';
import { Card } from '@/components/ui/card';

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: ReactNode;
  onClick?: () => void;
  children?: ReactNode;
  className?: string;
}

export function KpiCard({ title, value, subtitle, icon, onClick, children, className = '' }: KpiCardProps) {
  return (
    <Card
      className={`p-4 transition-shadow hover:shadow-md ${onClick ? 'cursor-pointer active:scale-[0.98]' : ''} ${className}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide">{title}</span>
      </div>
      <div className="text-2xl font-bold tabular-nums leading-none">{value}</div>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      {children}
    </Card>
  );
}
