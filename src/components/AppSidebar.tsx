import { useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Users, FolderOpen, Grid3x3, Tag, BookOpen,
  Package, Calculator, Receipt, Activity, Settings, UserCircle, Home,
  CreditCard, Zap, Moon, Sun, LogOut, Clock, CalendarDays, CalendarOff,
  TrendingUp, Star, AlertTriangle, DollarSign, Building2,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { NavLink } from '@/components/NavLink';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar';
import { useTheme } from '@/hooks/use-theme';

const mainNav = [
  { title: 'Panel', url: '/', icon: LayoutDashboard },
  { title: 'Albaranes', url: '/albaranes', icon: FileText },
  { title: 'Proveedores', url: '/proveedores', icon: Users },
  { title: 'Categorías', url: '/categorias', icon: FolderOpen },
  { title: 'Familias', url: '/familias', icon: Grid3x3 },
  { title: 'Productos', url: '/productos', icon: Tag },
  { title: 'Carta', url: '/carta', icon: BookOpen },
  { title: 'Stock', url: '/stock', icon: Package },
  { title: 'Arqueo Z', url: '/arqueo-z', icon: Calculator },
  { title: 'Facturación', url: '/facturacion', icon: Receipt },
  { title: 'Conciliación', url: '/conciliacion', icon: Activity },
];

const inteligenciaNav = [
  { title: 'Predicción', url: '/prediccion', icon: TrendingUp },
  { title: 'Ing. Menú', url: '/ingenieria-menu', icon: Star },
  { title: 'Mermas', url: '/mermas', icon: AlertTriangle },
  { title: 'Pricing', url: '/pricing', icon: DollarSign },
];

const personalNav = [
  { title: 'Personal', url: '/personal', icon: UserCircle },
  { title: 'Cuadrante', url: '/cuadrante', icon: CalendarDays },
  { title: 'Fichaje', url: '/fichaje', icon: Clock },
  { title: 'Ausencias', url: '/ausencias', icon: CalendarOff },
];

const configNav = [
  { title: 'Ajustes', url: '/ajustes', icon: Settings },
  { title: 'Alquiler', url: '/alquiler', icon: Home },
  { title: 'Bancos', url: '/bancos', icon: CreditCard },
  { title: 'Suministros', url: '/suministros', icon: Zap },
  { title: 'Banca', url: '/banca', icon: Building2 },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { signOut, session } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  const renderGroup = (items: typeof mainNav, label?: string) => (
    <SidebarGroup>
      {label && <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/60">{label}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton asChild isActive={isActive(item.url)}>
                <NavLink to={item.url} end className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                  <item.icon className="h-4 w-4" />
                  {!collapsed && <span>{item.title}</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
        <div className="flex items-center gap-2">
          <svg className="shrink-0" width="28" height="28" viewBox="0 0 32 32" fill="none">
            <rect x="2" y="4" width="20" height="26" rx="2" stroke="currentColor" strokeWidth="2"/>
            <path d="M7 10h10M7 14h10M7 18h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="24" cy="12" r="7" fill="hsl(var(--primary))" stroke="hsl(var(--background))" strokeWidth="2"/>
            <text x="24" y="15.5" textAnchor="middle" fill="hsl(var(--primary-foreground))" fontSize="8" fontWeight="700" fontFamily="var(--font-body)">360</text>
          </svg>
          {!collapsed && (
            <span className="text-sm font-medium">
              Albarán<strong className="text-primary font-bold">360</strong>
            </span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {renderGroup(mainNav)}
        {renderGroup(personalNav, 'Personal & Turnos')}
        {renderGroup(inteligenciaNav, 'Inteligencia')}
        {renderGroup(configNav, 'Configuración')}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2 md:p-3">
        <div className="flex items-center gap-2">
          <button onClick={toggleTheme} className="rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors active:scale-95" aria-label="Cambiar tema">
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          {!collapsed && (
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-xs font-medium truncate">{session?.user?.email}</span>
              <span className="text-[10px] text-muted-foreground">Conectado</span>
            </div>
          )}
          <button onClick={signOut} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors active:scale-95" aria-label="Cerrar sesión">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
