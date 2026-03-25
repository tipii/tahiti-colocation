import { Pressable } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { useFavorite } from '@/hooks/useFavorite'

interface FavoriteButtonProps {
  listingId: string
  size?: number
  className?: string
}

export function FavoriteButton({ listingId, size = 22, className = 'h-10 w-10' }: FavoriteButtonProps) {
  const { isFavorited, toggle, isLoggedIn } = useFavorite(listingId)

  if (!isLoggedIn) return null

  return (
    <Pressable
      className={`items-center justify-center rounded-full bg-white/80 ${className}`}
      onPress={(e) => { e.stopPropagation(); toggle() }}
      accessibilityLabel={isFavorited ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      accessibilityRole="button"
    >
      <MaterialCommunityIcons name={isFavorited ? 'heart' : 'heart-outline'} size={size} color={isFavorited ? '#FF6B35' : '#8B7E74'} />
    </Pressable>
  )
}
