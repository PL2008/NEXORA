import { Ellipsis } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { useData } from '@/app/useData'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/lib/cn'
import { CREDIT, STORAGE_PLACE } from '@/lib/env'
import { receivablesSnapshot, indexDataset } from '@/domain/metrics'
import { Logo } from './Logo'
import { MOBILE_TABS, NAV, isActivePath, type NavItem } from './nav'
import { ThemeToggle } from './ThemeToggle'

function useOverdueCount() {
  const { ds, today } = useData()
  return receivablesSnapshot(ds, indexDataset(ds), today).overdueCount
}

function SidebarLink({ item, active, badge }: { item: NavItem; active: boolean; badge?: number }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      className={cn(
        'group relative flex h-9 items-center gap-3 rounded-lg px-3 text-[13.5px] font-medium transition-colors',
        active ? 'text-ink' : 'text-ink-3 hover:text-ink',
      )}
    >
      {active ? (
        <motion.span
          layoutId="sidebar-active"
          className="absolute inset-0 rounded-lg bg-surface shadow-[0_1px_2px_rgb(0_0_0/0.06),0_0_0_1px_var(--line)]"
          transition={{ type: 'spring', damping: 34, stiffness: 420 }}
        />
      ) : (
        <span className="absolute inset-0 rounded-lg transition-colors group-hover:bg-surface-2/70" />
      )}
      <Icon className="relative size-[17px] shrink-0" strokeWidth={active ? 2.2 : 1.9} />
      <span className="relative flex-1">{item.label}</span>
      {badge ? (
        <span
          className="tnum relative grid h-5 min-w-5 place-items-center rounded-full bg-bad-soft px-1.5 text-[11px] font-semibold text-bad"
          aria-label={`${badge} atrasados`}
        >
          {badge}
        </span>
      ) : null}
    </NavLink>
  )
}

function Sidebar() {
  const { pathname } = useLocation()
  const { ds } = useData()
  const overdue = useOverdueCount()
  const main = NAV.filter((n) => n.group === 'main')
  const secondary = NAV.filter((n) => n.group === 'secondary')
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-line bg-canvas px-3 py-5 lg:flex">
      <div className="flex items-center justify-between px-3 pb-6">
        <Logo />
        <ThemeToggle />
      </div>
      <nav aria-label="Principal" className="flex flex-1 flex-col gap-0.5">
        {main.map((item) => (
          <SidebarLink
            key={item.to}
            item={item}
            active={isActivePath(pathname, item.to)}
            badge={item.to === '/recebimentos' ? overdue : undefined}
          />
        ))}
        <div className="my-3 h-px bg-line" />
        {secondary.map((item) => (
          <SidebarLink key={item.to} item={item} active={isActivePath(pathname, item.to)} />
        ))}
      </nav>
      <div className="mt-4 rounded-xl border border-line bg-surface px-3 py-2.5">
        <p className="truncate text-[13px] font-medium text-ink">{ds.settings.companyName || 'Sua empresa'}</p>
        <p className="text-[12px] text-ink-3">Dados salvos {STORAGE_PLACE}</p>
      </div>
      <p className="mt-3 px-3 text-[11.5px] text-ink-3">{CREDIT}</p>
    </aside>
  )
}

function MobileBar() {
  const { pathname } = useLocation()
  const [moreOpen, setMoreOpen] = useState(false)
  const overdue = useOverdueCount()
  const tabs = NAV.filter((n) => MOBILE_TABS.includes(n.to))
  const more = NAV.filter((n) => !MOBILE_TABS.includes(n.to))
  const moreActive = more.some((n) => isActivePath(pathname, n.to))

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-canvas/85 px-4 backdrop-blur-md lg:hidden">
        <Logo />
        <ThemeToggle />
      </header>
      <nav
        aria-label="Principal"
        className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/90 backdrop-blur-md lg:hidden"
      >
        <div className="mx-auto grid h-[60px] max-w-md grid-cols-5">
          {tabs.map((item) => {
            const active = isActivePath(pathname, item.to)
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-1 text-[10.5px] font-medium',
                  active ? 'text-ink' : 'text-ink-3',
                )}
              >
                <span className="relative">
                  <Icon className="size-[21px]" strokeWidth={active ? 2.2 : 1.8} />
                  {item.to === '/recebimentos' && overdue > 0 ? (
                    <span
                      className="absolute -top-1 -right-1.5 size-2 rounded-full bg-bad ring-2 ring-surface"
                      aria-label={`${overdue} atrasados`}
                    />
                  ) : null}
                </span>
                {item.short}
                {active ? <motion.span layoutId="tab-active" className="absolute top-0 h-[2px] w-8 rounded-full bg-ink" /> : null}
              </NavLink>
            )
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-haspopup="dialog"
            className={cn(
              'relative flex flex-col items-center justify-center gap-1 text-[10.5px] font-medium',
              moreActive ? 'text-ink' : 'text-ink-3',
            )}
          >
            <Ellipsis className="size-[21px]" />
            Mais
            {moreActive ? <motion.span layoutId="tab-active" className="absolute top-0 h-[2px] w-8 rounded-full bg-ink" /> : null}
          </button>
        </div>
      </nav>
      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title="Mais">
        <div className="grid grid-cols-2 gap-2 pb-2">
          {more.map((item) => {
            const Icon = item.icon
            const active = isActivePath(pathname, item.to)
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMoreOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-xl border px-3.5 py-3.5 text-sm font-medium transition-colors',
                  active ? 'border-line-strong bg-surface-2 text-ink' : 'border-line text-ink-2 hover:bg-surface-2',
                )}
              >
                <Icon className="size-[18px]" />
                {item.label}
              </NavLink>
            )
          })}
        </div>
        <p className="pt-3 pb-1 text-center text-[12px] text-ink-3">{CREDIT}</p>
      </Modal>
    </>
  )
}

export function AppLayout() {
  const location = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [location.pathname])
  return (
    <div className="min-h-dvh">
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-lg bg-ink px-3 py-2 text-inverse focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Pular para o conteúdo
      </a>
      <Sidebar />
      <MobileBar />
      <main id="conteudo" className="pb-[calc(84px+env(safe-area-inset-bottom))] lg:pb-10 lg:pl-[248px]">
        <div className="mx-auto w-full max-w-[1320px] px-4 pt-5 sm:px-6 lg:px-10 lg:pt-9">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <Outlet />
          </motion.div>
        </div>
      </main>
    </div>
  )
}
