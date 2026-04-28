import { Pressable, Text, View } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'

import { authClient } from '@/lib/auth'
import { orpc } from '@/lib/orpc'

const REQUIRED_LABELS: Record<string, string> = {
  avatar: 'photo',
  name: 'nom',
  dob: 'date de naissance',
  occupation: 'métier',
  smoker: 'tabac',
  pets: 'animaux',
  phone: 'téléphone',
}

/**
 * Compute the seeker's profile completion against the fields required to
 * apply to a listing (`candidature.apply` checks the same set server-side).
 */
export function useProfileCompletion() {
  const { data: session } = authClient.useSession()
  const { data: me } = useQuery({
    ...orpc.user.me.queryOptions(),
    enabled: !!session,
  })

  if (!me) return { completion: 0, missing: [] as string[], loading: !!session }

  const checks: [string, boolean][] = [
    ['avatar', !!((me as any).avatar || (me as any).image)],
    ['name', !!me.name?.trim()],
    ['dob', !!me.dob],
    ['occupation', !!me.occupation],
    ['smoker', !!me.smoker],
    ['pets', !!me.pets],
    ['phone', !!me.phone],
  ]
  const filled = checks.filter(([, ok]) => ok).length
  const completion = Math.round((filled / checks.length) * 100)
  const missing = checks.filter(([, ok]) => !ok).map(([k]) => REQUIRED_LABELS[k] ?? k)

  return { completion, missing, loading: false }
}

/**
 * Profile-completion progress card. Used on both the profile edit page and
 * (when `onPress` is supplied) as a CTA banner on the home tab.
 */
export function ProfileCompletionCard({
  completion,
  missing,
  onPress,
  variant = 'full',
}: {
  completion: number
  missing: string[]
  onPress?: () => void
  variant?: 'full' | 'banner'
}) {
  const Wrapper: any = onPress ? Pressable : View

  return (
    <Wrapper
      onPress={onPress}
      className="rounded-card bg-card p-3"
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? `Profil complété à ${completion}%, touche pour finaliser` : undefined}
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-medium text-foreground">
          {variant === 'banner' ? 'Finalise ton profil' : 'Profil complété'}
        </Text>
        <View className="flex-row items-center gap-2">
          <Text className="text-sm font-bold text-primary">{completion}%</Text>
          {onPress && <Feather name="chevron-right" size={16} color="#8B7E74" />}
        </View>
      </View>
      <View className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
        <View className="h-full bg-primary" style={{ width: `${completion}%` }} />
      </View>
      {variant === 'full' ? (
        <Text className="mt-2 text-xs text-muted-foreground">
          Requis pour postuler : avatar, nom, date de naissance, métier, tabac, animaux, téléphone
        </Text>
      ) : missing.length > 0 ? (
        <Text className="mt-2 text-xs text-muted-foreground">
          Il manque : {missing.join(', ')}
        </Text>
      ) : null}
    </Wrapper>
  )
}
