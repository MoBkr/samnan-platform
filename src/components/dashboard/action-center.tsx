import Link from 'next/link'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

export type Tone = 'red' | 'amber' | 'emerald' | 'blue'

export interface ActionItem {
  href: string
  icon: React.ReactNode
  count: number
  label: string
  desc: string
  tone: Tone
}

const TONES: Record<Tone, { card: string; chip: string; count: string; arrow: string }> = {
  red: {
    card: 'border-red-200 bg-red-50/60 hover:bg-red-50 hover:border-red-300',
    chip: 'bg-red-100 text-red-700',
    count: 'text-red-700',
    arrow: 'text-red-400 group-hover:text-red-600',
  },
  amber: {
    card: 'border-amber-200 bg-amber-50/60 hover:bg-amber-50 hover:border-amber-300',
    chip: 'bg-amber-100 text-amber-700',
    count: 'text-amber-700',
    arrow: 'text-amber-400 group-hover:text-amber-600',
  },
  emerald: {
    card: 'border-emerald-200 bg-emerald-50/60 hover:bg-emerald-50 hover:border-emerald-300',
    chip: 'bg-emerald-100 text-emerald-700',
    count: 'text-emerald-700',
    arrow: 'text-emerald-400 group-hover:text-emerald-600',
  },
  blue: {
    card: 'border-blue-200 bg-blue-50/60 hover:bg-blue-50 hover:border-blue-300',
    chip: 'bg-blue-100 text-blue-700',
    count: 'text-blue-700',
    arrow: 'text-blue-400 group-hover:text-blue-600',
  },
}

export function ActionCenter({ items }: { items: ActionItem[] }) {
  const active = items.filter((i) => i.count > 0)

  if (active.length === 0) {
    return (
      <div className="flex items-center gap-4 rounded-2xl border border-emerald-100 bg-gradient-to-l from-emerald-50 to-white p-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 shrink-0">
          <Sparkles className="h-6 w-6 text-emerald-600" />
        </div>
        <div>
          <p className="font-bold text-gray-900">كل شيء تحت السيطرة 👌</p>
          <p className="text-sm text-gray-500 mt-0.5">لا توجد مهام عاجلة تحتاج إجراءً الآن.</p>
        </div>
      </div>
    )
  }

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand-600" />
        </span>
        <h2 className="text-base font-bold text-gray-900">يحتاج إجراءً الآن</h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {active.map((item, i) => {
          const t = TONES[item.tone]
          return (
            <Link key={i} href={item.href} className="group">
              <div className={cn('flex items-center gap-4 rounded-2xl border p-4 transition-all hover:shadow-sm hover:-translate-y-0.5', t.card)}>
                <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl shrink-0', t.chip)}>
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1.5">
                    <span className={cn('text-2xl font-bold leading-none', t.count)}>{item.count}</span>
                    <span className="text-sm font-semibold text-gray-800">{item.label}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 truncate">{item.desc}</p>
                </div>
                <ArrowLeft className={cn('h-5 w-5 shrink-0 transition-all group-hover:-translate-x-0.5', t.arrow)} />
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
