import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as Haptics from 'expo-haptics'

import { authClient } from '@/lib/auth'
import { orpc, client } from '@/lib/orpc'

const FAV_IDS_KEY = ['favorite-ids']

export function useFavoriteIds() {
  const { data: session } = authClient.useSession()

  return useQuery({
    queryKey: FAV_IDS_KEY,
    queryFn: () => client.favorite.ids(),
    enabled: !!session,
    staleTime: 30_000,
  })
}

export function useFavorite(listingId: string) {
  const { data: session } = authClient.useSession()
  const queryClient = useQueryClient()
  const { data: favIds = [] } = useFavoriteIds()

  const isFavorited = favIds.includes(listingId)

  const toggleMutation = useMutation({
    mutationFn: () => client.favorite.toggle({ listingId }),
    onMutate: async () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      await queryClient.cancelQueries({ queryKey: FAV_IDS_KEY })
      const prev = queryClient.getQueryData<string[]>(FAV_IDS_KEY)
      queryClient.setQueryData<string[]>(FAV_IDS_KEY, (old = []) =>
        old.includes(listingId) ? old.filter((id) => id !== listingId) : [...old, listingId],
      )
      return { prev }
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(FAV_IDS_KEY, context.prev)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: FAV_IDS_KEY })
    },
  })

  return {
    isFavorited,
    toggle: () => toggleMutation.mutate(),
    isLoggedIn: !!session,
  }
}
