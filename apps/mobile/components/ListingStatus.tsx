import { Text, View } from 'react-native'

// Single source of truth for listing status visuals (draft / published / archived).
export const LISTING_STATUS_META = {
  draft: {
    label: 'Brouillon',
    pillBg: 'bg-muted',
    pillText: 'text-muted-foreground',
  },
  published: {
    label: 'Publiée',
    pillBg: 'bg-secondary',
    pillText: 'text-secondary-foreground',
  },
  archived: {
    label: 'Archivée',
    pillBg: 'bg-border',
    pillText: 'text-muted-foreground',
  },
} as const

export type ListingStatus = keyof typeof LISTING_STATUS_META

export function getListingStatusMeta(status: string) {
  return LISTING_STATUS_META[status as ListingStatus] ?? LISTING_STATUS_META.draft
}

export function ListingStatusBadge({ status }: { status: string }) {
  const meta = getListingStatusMeta(status)
  return (
    <View className={`self-start rounded-pill px-2.5 py-0.5 ${meta.pillBg}`}>
      <Text className={`text-xs font-medium ${meta.pillText}`}>{meta.label}</Text>
    </View>
  )
}
