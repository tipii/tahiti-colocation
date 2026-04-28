import { useState } from 'react'
import { Platform, Pressable, Text, View } from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { Feather } from '@expo/vector-icons'

interface DateFieldProps {
  label: string
  value: string // YYYY-MM-DD or empty
  onChange: (dateStr: string) => void
  placeholder?: string
  /** Date the picker opens at when value is empty. Defaults to today. */
  defaultDate?: Date
  /** Block dates after this. Useful for birthdays. */
  maximumDate?: Date
  /** Block dates before this. */
  minimumDate?: Date
}

export function DateField({
  label,
  value,
  onChange,
  placeholder = 'Choisir une date',
  defaultDate,
  maximumDate,
  minimumDate,
}: DateFieldProps) {
  const [show, setShow] = useState(false)

  const date = value ? new Date(value) : (defaultDate ?? new Date())
  const has = !!value
  const formatted = has
    ? date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
    : placeholder

  return (
    <View className="mt-3">
      <Text className="mb-1.5 text-xs font-medium uppercase text-muted-foreground tracking-wider">{label}</Text>
      <Pressable
        className="flex-row items-center gap-3 rounded-card border border-border bg-card px-4 py-3"
        onPress={() => setShow(true)}
        accessibilityLabel={`${label}, ${has ? formatted : placeholder}. Touche pour choisir une date.`}
        accessibilityRole="button"
      >
        <View className="h-9 w-9 items-center justify-center rounded-pill bg-accent">
          <Feather name="calendar" size={18} color="#FF6B35" />
        </View>
        <View className="flex-1">
          <Text className={`text-base ${has ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
            {formatted}
          </Text>
        </View>
        {has ? (
          <Pressable
            onPress={(e) => { e.stopPropagation?.(); onChange('') }}
            hitSlop={8}
            accessibilityLabel="Effacer la date"
          >
            <Feather name="x" size={18} color="#8B7E74" />
          </Pressable>
        ) : (
          <Feather name="chevron-right" size={18} color="#8B7E74" />
        )}
      </Pressable>
      {show && (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          maximumDate={maximumDate}
          minimumDate={minimumDate}
          onChange={(_, selectedDate) => {
            setShow(Platform.OS === 'ios')
            if (selectedDate) {
              onChange(selectedDate.toISOString().split('T')[0])
            }
          }}
          locale="fr-FR"
        />
      )}
    </View>
  )
}
