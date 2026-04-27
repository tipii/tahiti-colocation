import { Feather } from '@expo/vector-icons'
import { Text, View } from 'react-native'

type FeatherIcon = keyof typeof Feather.glyphMap

// Single source of truth for candidature status visuals.
// Read meta directly when you need a custom layout (e.g. the banner on the listing screen);
// use <CandidatureBadge /> for the standard small pill.
export const CANDIDATURE_STATUS_META = {
  pending: {
    label: 'En attente',
    longLabel: 'En attente de réponse',
    pillBg: 'bg-accent',
    pillText: 'text-accent-foreground',
    icon: 'clock' as FeatherIcon,
    iconColor: '#FF6B35',
    bannerBg: 'bg-accent/40',
  },
  accepted: {
    label: 'Acceptée',
    longLabel: 'Candidature retenue · contact disponible',
    pillBg: 'bg-secondary',
    pillText: 'text-secondary-foreground',
    icon: 'check-circle' as FeatherIcon,
    iconColor: '#0D9488',
    bannerBg: 'bg-secondary/30',
  },
  finalized: {
    label: 'Retenue',
    longLabel: 'Tu as été choisi·e 🌴',
    pillBg: 'bg-primary',
    pillText: 'text-primary-foreground',
    icon: 'award' as FeatherIcon,
    iconColor: '#FF6B35',
    bannerBg: 'bg-primary/20',
  },
  rejected: {
    label: 'Non retenue',
    longLabel: 'Candidature non retenue',
    pillBg: 'bg-muted',
    pillText: 'text-muted-foreground',
    icon: 'x-circle' as FeatherIcon,
    iconColor: '#8B7E74',
    bannerBg: 'bg-muted',
  },
  withdrawn: {
    label: 'Retirée',
    longLabel: 'Candidature retirée',
    pillBg: 'bg-muted',
    pillText: 'text-muted-foreground',
    icon: 'corner-down-left' as FeatherIcon,
    iconColor: '#8B7E74',
    bannerBg: 'bg-muted',
  },
} as const

export type CandidatureStatus = keyof typeof CANDIDATURE_STATUS_META

export function getStatusMeta(status: string) {
  return CANDIDATURE_STATUS_META[status as CandidatureStatus] ?? CANDIDATURE_STATUS_META.pending
}

export function CandidatureBadge({ status, withIcon = false }: { status: string; withIcon?: boolean }) {
  const meta = getStatusMeta(status)
  return (
    <View className={`flex-row items-center gap-1 self-start rounded-pill px-2.5 py-0.5 ${meta.pillBg}`}>
      {withIcon && <Feather name={meta.icon} size={11} color={meta.pillText.includes('foreground') ? '#fff' : meta.iconColor} />}
      <Text className={`text-xs font-semibold ${meta.pillText}`}>{meta.label}</Text>
    </View>
  )
}
