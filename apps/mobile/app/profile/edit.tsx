import { useState } from 'react'
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Image } from 'expo-image'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { OCCUPATIONS, SMOKER_CHOICES, PET_CHOICES, SCHEDULE_CHOICES, LANGUAGE_CHOICES } from '@coloc/contract'

import { orpc, client } from '@/lib/orpc'
import { pickImage, uploadImage } from '@/lib/upload'
import { DateField } from '@/components/DateField'

const OCCUPATION_LABELS: Record<string, string> = {
  student: 'Étudiant·e',
  employed: 'Salarié·e',
  self_employed: 'Indépendant·e',
  retired: 'Retraité·e',
  other: 'Autre',
}
const SMOKER_LABELS: Record<string, string> = { no: 'Non', outside: 'Dehors', yes: 'Oui' }
const PET_LABELS: Record<string, string> = { none: 'Aucun', cat: 'Chat', dog: 'Chien', other: 'Autre' }
const SCHEDULE_LABELS: Record<string, string> = { day: 'Journée', night: 'Nuit', flexible: 'Flexible' }
const LANG_LABELS: Record<string, string> = { fr: 'Français', en: 'English', ty: 'Tahitian' }

type Occ = typeof OCCUPATIONS[number] | null
type Smk = typeof SMOKER_CHOICES[number] | null
type Pet = typeof PET_CHOICES[number] | null
type Sch = typeof SCHEDULE_CHOICES[number] | null
type Lang = typeof LANGUAGE_CHOICES[number]

function Pill<T extends string | null>({ value, selected, onPress, label }: { value: T; selected: boolean; onPress: () => void; label: string }) {
  return (
    <Pressable className={`rounded-pill px-3 py-1.5 ${selected ? 'bg-primary' : 'bg-muted'}`} onPress={onPress}>
      <Text className={`text-xs font-medium ${selected ? 'text-primary-foreground' : 'text-muted-foreground'}`}>{label}</Text>
    </Pressable>
  )
}

export default function EditProfileScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [initialized, setInitialized] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [dob, setDob] = useState('')
  const [phone, setPhone] = useState('')
  const [occupation, setOccupation] = useState<Occ>(null)
  const [occupationDetail, setOccupationDetail] = useState('')
  const [languages, setLanguages] = useState<Lang[]>([])
  const [smoker, setSmoker] = useState<Smk>(null)
  const [pets, setPets] = useState<Pet>(null)
  const [schedule, setSchedule] = useState<Sch>(null)
  const [whatsappOverride, setWhatsappOverride] = useState('')
  const [facebookUrl, setFacebookUrl] = useState('')

  const { data: profile, isLoading } = useQuery({
    ...orpc.user.me.queryOptions(),
    select: (p: any) => {
      if (!initialized) {
        setName(p.name ?? '')
        setBio(p.bio ?? '')
        setDob(p.dob ? new Date(p.dob).toISOString().slice(0, 10) : '')
        setPhone(p.phone ?? '')
        setOccupation(p.occupation ?? null)
        setOccupationDetail(p.occupationDetail ?? '')
        setLanguages(p.languages ?? [])
        setSmoker(p.smoker ?? null)
        setPets(p.pets ?? null)
        setSchedule(p.schedule ?? null)
        setWhatsappOverride(p.whatsappOverride ?? '')
        setFacebookUrl(p.facebookUrl ?? '')
        setInitialized(true)
      }
      return p
    },
  })

  const saveMutation = useMutation({
    mutationFn: () => client.user.update({
      name,
      bio: bio || null,
      dob: dob ? new Date(dob) : null,
      phone: phone || null,
      occupation,
      occupationDetail: occupationDetail || null,
      languages: languages.length > 0 ? languages : null,
      smoker,
      pets,
      schedule,
      whatsappOverride: whatsappOverride || null,
      facebookUrl: facebookUrl || null,
    }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      queryClient.invalidateQueries({ queryKey: orpc.user.key() })
      Alert.alert('Succès', 'Profil mis à jour')
      router.back()
    },
    onError: () => Alert.alert('Erreur', 'Impossible de mettre à jour le profil'),
  })

  const removeAvatarMutation = useMutation({
    mutationFn: () => client.user.removeAvatar(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.user.key() }),
  })

  const handlePickAvatar = async () => {
    const asset = await pickImage()
    if (!asset || !profile) return
    setUploadingAvatar(true)
    try {
      const result = await uploadImage('avatar', profile.id, asset)
      await client.user.updateAvatar({ avatarUrl: result.mediumUrl ?? result.thumbnailUrl ?? '' })
      queryClient.invalidateQueries({ queryKey: orpc.user.key() })
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } catch {
      Alert.alert('Erreur', "Impossible de changer la photo")
    } finally {
      setUploadingAvatar(false)
    }
  }

  if (isLoading || !profile) {
    return <View className="flex-1 items-center justify-center bg-background"><ActivityIndicator size="large" color="#FF6B35" /></View>
  }

  const avatarUrl = (profile as any).avatar || (profile as any).image
  const isFacebookImage = !(profile as any).avatar && !!(profile as any).image

  const required = [
    !!avatarUrl,
    !!name.trim(),
    !!dob,
    !!occupation,
    !!smoker,
    !!pets,
    !!phone,
  ]
  const completion = Math.round((required.filter(Boolean).length / required.length) * 100)

  const toggleLang = (l: Lang) =>
    setLanguages((prev) => prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l])

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 24, paddingBottom: 60 }}>
      {/* Avatar */}
      <View className="items-center">
        <Pressable onPress={handlePickAvatar} accessibilityLabel="Changer la photo de profil" className="relative">
          {uploadingAvatar ? (
            <View className="h-24 w-24 items-center justify-center rounded-full bg-muted"><ActivityIndicator color="#FF6B35" /></View>
          ) : avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={{ width: 96, height: 96, borderRadius: 48 }} contentFit="cover" transition={200} />
          ) : (
            <View className="h-24 w-24 items-center justify-center rounded-full bg-accent"><Text className="text-3xl font-bold text-primary">{profile.name?.charAt(0).toUpperCase()}</Text></View>
          )}
          <View className="absolute bottom-0 right-0 h-8 w-8 items-center justify-center rounded-full bg-primary"><Feather name="camera" size={14} color="#fff" /></View>
        </Pressable>
        {isFacebookImage && <Text className="mt-2 text-xs text-muted-foreground">Photo importée de Facebook</Text>}
        {avatarUrl && (
          <Pressable className="mt-2" onPress={() => Alert.alert('Supprimer la photo', 'Revenir à la photo par défaut ?', [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Supprimer', style: 'destructive', onPress: () => removeAvatarMutation.mutate() },
          ])}>
            <Text className="text-sm text-destructive">Supprimer la photo</Text>
          </Pressable>
        )}
      </View>

      {/* Completion */}
      <View className="mt-6 rounded-card bg-card p-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-medium text-foreground">Profil complété</Text>
          <Text className="text-sm font-bold text-primary">{completion}%</Text>
        </View>
        <View className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
          <View className="h-full bg-primary" style={{ width: `${completion}%` }} />
        </View>
        <Text className="mt-2 text-xs text-muted-foreground">Requis pour postuler: avatar, nom, date de naissance, métier, tabac, animaux, téléphone</Text>
      </View>

      {/* Form */}
      <View className="mt-6 gap-5">
        <View>
          <Text className="mb-1 text-sm font-medium text-foreground">Nom</Text>
          <TextInput className="rounded-input border border-border bg-card px-4 py-3 text-base text-foreground" value={name} onChangeText={setName} placeholder="Votre nom" placeholderTextColor="#8B7E74" />
        </View>

        <DateField
          label="Date de naissance"
          value={dob}
          onChange={setDob}
          placeholder="Choisir une date"
          defaultDate={new Date(new Date().getFullYear() - 25, 0, 1)}
          maximumDate={new Date()}
        />

        <View>
          <Text className="mb-1 text-sm font-medium text-foreground">Téléphone (+689…)</Text>
          <TextInput className="rounded-input border border-border bg-card px-4 py-3 text-base text-foreground" value={phone} onChangeText={setPhone} placeholder="+68987654321" placeholderTextColor="#8B7E74" keyboardType="phone-pad" />
        </View>

        <View>
          <Text className="mb-1 text-sm font-medium text-foreground">Bio</Text>
          <TextInput className="rounded-input border border-border bg-card px-4 py-3 text-base text-foreground" value={bio} onChangeText={setBio} placeholder="Parlez de vous..." placeholderTextColor="#8B7E74" multiline textAlignVertical="top" style={{ minHeight: 100 }} maxLength={300} />
          <Text className="mt-1 text-right text-xs text-muted-foreground">{bio.length}/300</Text>
        </View>

        <View>
          <Text className="mb-2 text-sm font-medium text-foreground">Métier</Text>
          <View className="flex-row flex-wrap gap-2">
            {OCCUPATIONS.map((o) => (
              <Pill key={o} value={o} selected={occupation === o} onPress={() => setOccupation(o)} label={OCCUPATION_LABELS[o]!} />
            ))}
          </View>
          <TextInput className="mt-2 rounded-input border border-border bg-card px-4 py-3 text-base text-foreground" value={occupationDetail} onChangeText={setOccupationDetail} placeholder="Précision (optionnel)" placeholderTextColor="#8B7E74" />
          <Text className="mb-2 mt-4 text-sm font-medium text-foreground">Horaires</Text>
          <View className="flex-row flex-wrap gap-2">
            {SCHEDULE_CHOICES.map((s) => (
              <Pill key={s} value={s} selected={schedule === s} onPress={() => setSchedule(s)} label={SCHEDULE_LABELS[s]!} />
            ))}
          </View>
        </View>

        <View>
          <Text className="mb-2 text-sm font-medium text-foreground">Langues parlées</Text>
          <View className="flex-row flex-wrap gap-2">
            {LANGUAGE_CHOICES.map((l) => (
              <Pill key={l} value={l} selected={languages.includes(l)} onPress={() => toggleLang(l)} label={LANG_LABELS[l]!} />
            ))}
          </View>
        </View>

        <View>
          <Text className="mb-2 text-sm font-medium text-foreground">Tabac</Text>
          <View className="flex-row flex-wrap gap-2">
            {SMOKER_CHOICES.map((s) => (
              <Pill key={s} value={s} selected={smoker === s} onPress={() => setSmoker(s)} label={SMOKER_LABELS[s]!} />
            ))}
          </View>
        </View>

        <View>
          <Text className="mb-2 text-sm font-medium text-foreground">Animaux</Text>
          <View className="flex-row flex-wrap gap-2">
            {PET_CHOICES.map((p) => (
              <Pill key={p} value={p} selected={pets === p} onPress={() => setPets(p)} label={PET_LABELS[p]!} />
            ))}
          </View>
        </View>

        <View>
          <Text className="mb-1 text-sm font-medium text-foreground">WhatsApp (si différent du téléphone)</Text>
          <TextInput className="rounded-input border border-border bg-card px-4 py-3 text-base text-foreground" value={whatsappOverride} onChangeText={setWhatsappOverride} placeholder="Optionnel" placeholderTextColor="#8B7E74" keyboardType="phone-pad" />
        </View>

        <View>
          <Text className="mb-1 text-sm font-medium text-foreground">Profil Facebook</Text>
          <TextInput className="rounded-input border border-border bg-card px-4 py-3 text-base text-foreground" value={facebookUrl} onChangeText={setFacebookUrl} placeholder="https://facebook.com/votrepseudo" placeholderTextColor="#8B7E74" autoCapitalize="none" />
        </View>

        <View>
          <Text className="mb-1 text-sm font-medium text-foreground">Email</Text>
          <View className="rounded-input border border-border bg-muted px-4 py-3">
            <Text className="text-base text-muted-foreground">{profile.email}</Text>
          </View>
        </View>
      </View>

      <Pressable className={`mt-8 items-center rounded-button bg-primary py-3.5 ${saveMutation.isPending ? 'opacity-50' : ''}`} onPress={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
        {saveMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text className="text-base font-semibold text-primary-foreground">Enregistrer</Text>}
      </Pressable>
    </ScrollView>
  )
}
