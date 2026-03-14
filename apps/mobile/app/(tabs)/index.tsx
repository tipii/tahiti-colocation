import { ScrollView, Text, View } from 'react-native'

import { authClient } from '@/lib/auth'

export default function HomeScreen() {
  const { data: session } = authClient.useSession()

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="px-6 pt-16 pb-8">
        <Text className="text-3xl font-bold">Coloc</Text>
        {session && (
          <Text className="mt-2 text-base text-gray-500">
            Bonjour, {session.user.name}
          </Text>
        )}
      </View>

      <View className="px-6">
        <Text className="text-lg font-semibold">Annonces recentes</Text>
        <View className="mt-4 gap-3">
          {[1, 2, 3].map((i) => (
            <View key={i} className="rounded-xl border border-gray-200 p-4">
              <View className="h-32 rounded-lg bg-gray-100" />
              <Text className="mt-3 text-base font-semibold">
                Chambre disponible - Quartier {i}
              </Text>
              <Text className="mt-1 text-sm text-gray-500">Paris {i}e arrondissement</Text>
              <Text className="mt-2 text-lg font-bold">{450 + i * 50} EUR/mois</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  )
}
