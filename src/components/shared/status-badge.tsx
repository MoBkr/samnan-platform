import { Badge } from '@/components/ui/badge'
import {
  STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  MATERIAL_STATUS_LABELS,
  SUPPLY_STATUS_LABELS,
  INSTALLATION_STATUS_LABELS,
} from '@/lib/constants'
import type { VariantProps } from 'class-variance-authority'
import type { badgeVariants } from '@/components/ui/badge'

type BadgeVariant = VariantProps<typeof badgeVariants>['variant']

const PROJECT_STATUS_VARIANTS: Record<string, BadgeVariant> = {
  active: 'success',
  completed: 'purple',
  cancelled: 'danger',
  on_hold: 'warning',
}

const PAYMENT_STATUS_VARIANTS: Record<string, BadgeVariant> = {
  pending: 'warning',
  partial: 'warning',
  paid: 'success',
  overdue: 'danger',
  cancelled: 'secondary',
}

const MATERIAL_STATUS_VARIANTS: Record<string, BadgeVariant> = {
  pending: 'warning',
  preparing: 'default',
  ready: 'success',
  delivered: 'purple',
  partial: 'warning',
}

const SUPPLY_STATUS_VARIANTS: Record<string, BadgeVariant> = {
  scheduled: 'default',
  in_progress: 'warning',
  completed: 'success',
  failed: 'danger',
  rescheduled: 'secondary',
}

const INSTALLATION_STATUS_VARIANTS: Record<string, BadgeVariant> = {
  scheduled: 'default',
  confirmed: 'success',
  in_progress: 'warning',
  completed: 'success',
  delayed: 'danger',
  rescheduled: 'secondary',
}

export function ProjectStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={PROJECT_STATUS_VARIANTS[status] ?? 'secondary'}>
      {STATUS_LABELS[status as keyof typeof STATUS_LABELS] ?? status}
    </Badge>
  )
}

export function PaymentStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={PAYMENT_STATUS_VARIANTS[status] ?? 'secondary'}>
      {PAYMENT_STATUS_LABELS[status as keyof typeof PAYMENT_STATUS_LABELS] ?? status}
    </Badge>
  )
}

export function MaterialStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={MATERIAL_STATUS_VARIANTS[status] ?? 'secondary'}>
      {MATERIAL_STATUS_LABELS[status as keyof typeof MATERIAL_STATUS_LABELS] ?? status}
    </Badge>
  )
}

export function SupplyStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={SUPPLY_STATUS_VARIANTS[status] ?? 'secondary'}>
      {SUPPLY_STATUS_LABELS[status as keyof typeof SUPPLY_STATUS_LABELS] ?? status}
    </Badge>
  )
}

export function InstallationStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={INSTALLATION_STATUS_VARIANTS[status] ?? 'secondary'}>
      {INSTALLATION_STATUS_LABELS[status as keyof typeof INSTALLATION_STATUS_LABELS] ?? status}
    </Badge>
  )
}
