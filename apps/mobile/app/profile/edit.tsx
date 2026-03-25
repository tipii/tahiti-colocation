import { Text, View } from 'react-native'
import { Feather } from '@expo/vector-icons'

export default function EditProfileScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-background px-8">
      <View className="h-20 w-20 items-center justify-center rounded-full bg-accent">
        <Feather name="user" size={36} color="#FF6B35" />
      </View>
      <Text className="mt-6 text-xl font-semibold text-foreground">Modifier le profil</Text>
      <Text className="mt-2 text-center text-base text-muted-foreground">
        La modification du profil sera bientôt disponible. Vous pourrez changer votre photo, nom et bio.
      </Text>
    </View>
  )
}
