import {
  ChartColumnBig,
  FileSignature,
  LayoutDashboard,
  Receipt,
  Settings,
  ShoppingBag,
  Target,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  short: string
  icon: LucideIcon
  group: 'main' | 'secondary'
}

export const NAV: NavItem[] = [
  { to: '/', label: 'Visão geral', short: 'Início', icon: LayoutDashboard, group: 'main' },
  { to: '/vendas', label: 'Vendas', short: 'Vendas', icon: ShoppingBag, group: 'main' },
  { to: '/recebimentos', label: 'Recebimentos', short: 'Receber', icon: Wallet, group: 'main' },
  { to: '/despesas', label: 'Despesas', short: 'Despesas', icon: Receipt, group: 'main' },
  { to: '/clientes', label: 'Clientes', short: 'Clientes', icon: Users, group: 'main' },
  { to: '/propostas', label: 'Propostas', short: 'Propostas', icon: Target, group: 'main' },
  { to: '/contratos', label: 'Contratos', short: 'Contratos', icon: FileSignature, group: 'main' },
  { to: '/relatorios', label: 'Relatórios', short: 'Relatórios', icon: ChartColumnBig, group: 'secondary' },
  { to: '/configuracoes', label: 'Configurações', short: 'Ajustes', icon: Settings, group: 'secondary' },
]

/** Itens fixos na barra inferior do celular; o restante fica em "Mais". */
export const MOBILE_TABS = ['/', '/vendas', '/recebimentos', '/clientes']

export function isActivePath(pathname: string, to: string): boolean {
  return to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`)
}
