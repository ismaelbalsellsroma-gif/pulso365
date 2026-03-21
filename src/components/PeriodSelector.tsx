import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar, ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

type Period = 'hoy' | 'semana' | 'mes' | 'custom';

function toISO(d: Date) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function formatLabel(desde: string, hasta: string) {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  const optsY: Intl.DateTimeFormatOptions = { ...opts, year: 'numeric' };
  if (desde === hasta) return new Date(desde + 'T12:00:00').toLocaleDateString('es-ES', optsY);
  const d = new Date(desde + 'T12:00:00').toLocaleDateString('es-ES', opts);
  const h = new Date(hasta + 'T12:00:00').toLocaleDateString('es-ES', optsY);
  return `${d} — ${h}`;
}

interface Props {
  onChange?: (desde: string, hasta: string) => void;
}

export function PeriodSelector({ onChange }: Props = {}) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [active, setActive] = useState<Period>('mes');
  const [desde, setDesdeLocal] = useState(toISO(monthStart));
  const [hasta, setHastaLocal] = useState(toISO(now));

  const setDesde = (v: string) => { setDesdeLocal(v); onChange?.(v, hasta); };
  const setHasta = (v: string) => { setHastaLocal(v); onChange?.(desde, v); };

  function setPeriod(type: Period) {
    setActive(type);
    let d = desde, h = toISO(now);
    if (type === 'hoy') {
      d = toISO(now); h = toISO(now);
    } else if (type === 'semana') {
      const day = now.getDay();
      const diff = day === 0 ? 6 : day - 1;
      const monday = new Date(now);
      monday.setDate(now.getDate() - diff);
      d = toISO(monday);
    } else if (type === 'mes') {
      d = toISO(monthStart);
    }
    setDesdeLocal(d); setHastaLocal(h);
    onChange?.(d, h);
  }

  const chips: { label: string; value: Period }[] = [
    { label: 'Hoy', value: 'hoy' },
    { label: 'Semana', value: 'semana' },
    { label: 'Mes', value: 'mes' },
  ];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Calendar className="h-4 w-4 text-muted-foreground hidden sm:block" />
      <span className="text-sm font-medium text-muted-foreground hidden md:block">
        {formatLabel(desde, hasta)}
      </span>
      <div className="flex gap-1">
        {chips.map(c => (
          <button
            key={c.value}
            onClick={() => setPeriod(c.value)}
            className={`px-2.5 py-1 text-xs rounded-full transition-colors active:scale-95 ${
              active === c.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <button className="px-2.5 py-1 text-xs rounded-full bg-muted text-muted-foreground hover:bg-accent transition-colors active:scale-95 flex items-center gap-1">
            Rango <ChevronDown className="h-3 w-3" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" align="start">
          <div className="space-y-2">
            <div>
              <label className="text-xs text-muted-foreground">Desde</label>
              <Input type="date" value={desde} onChange={e => setDesde(e.target.value)} className="h-8 text-xs" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Hasta</label>
              <Input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className="h-8 text-xs" />
            </div>
            <Button size="sm" className="w-full h-7 text-xs" onClick={() => setActive('custom')}>
              Aplicar
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
