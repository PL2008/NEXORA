import { motion } from 'motion/react'
import { ChevronDown } from 'lucide-react'
import { Fragment } from 'react'
import { formatBRL, formatInteger, formatPercent } from '@/lib/money'
import { PROPOSAL_STAGE_LABEL } from '@/domain/labels'
import type { FunnelData } from '@/domain/metrics'

const RAMP = ['var(--ramp-1)', 'var(--ramp-2)', 'var(--ramp-3)', 'var(--ramp-4)']

/** Funil em barras horizontais (rampa ordinal de um só tom), com conversão entre etapas. */
export function Funnel({ data }: { data: FunnelData }) {
  const top = data.steps[0]?.count ?? 0
  return (
    <ol className="flex flex-col" aria-label="Funil de propostas">
      {data.steps.map((step, i) => {
        const ratio = top > 0 ? step.count / top : 0
        return (
          <Fragment key={step.stage}>
            {i > 0 ? (
              <li aria-hidden className="flex items-center gap-1 py-0.5 pl-2 text-[11.5px] text-ink-3">
                <ChevronDown className="size-3" />
                <span className="tnum">{step.rate === null ? '—' : formatPercent(step.rate)}</span>
              </li>
            ) : null}
            <li className="rounded-lg px-2 py-1">
              <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
                <span className="text-ink-2">{PROPOSAL_STAGE_LABEL[step.stage]}</span>
                <span className="flex items-baseline gap-2">
                  <span className="tnum text-[11.5px] text-ink-3">{formatBRL(step.valueCents, { hideCents: true })}</span>
                  <span className="tnum font-medium text-ink">{formatInteger(step.count)}</span>
                </span>
              </div>
              <svg width="100%" height="10" className="block" aria-hidden>
                <rect width="100%" height="10" rx="5" fill="var(--surface-2)" />
                <motion.rect
                  height="10"
                  rx="5"
                  fill={RAMP[i]}
                  initial={{ width: '0%' }}
                  animate={{ width: `${ratio > 0 ? Math.max(ratio * 100, 2) : 0}%` }}
                  transition={{ duration: 0.7, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                />
              </svg>
            </li>
          </Fragment>
        )
      })}
    </ol>
  )
}
