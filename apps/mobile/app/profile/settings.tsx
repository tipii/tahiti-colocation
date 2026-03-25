import { Text, View } from 'react-native'
import { Feather } from '@expo/vector-icons'

export default function SettingsScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-background px-8">
      <View className="h-20 w-20 items-center justify-center rounded-full bg-accent">
        <Feather name="settings" size={36} color="#FF6B35" />
      </View>
      <Text className="mt-6 text-xl font-semibold text-foreground">Paramètres</Text>
      <Text className="mt-2 text-center text-base text-muted-foreground">
        Les paramètres seront bientôt disponibles. Notifications, langue et gestion du compte.
      </Text>
    </View>
  )
}
