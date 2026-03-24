import { useState } from 'react'
import { Pressable, Text, View, Platform } from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'

interface DateFieldProps {
  label: string
  value: string // YYYY-MM-DD or empty
  onChange: (dateStr: string) => void
  placeholder?: string
}

export function DateField({ label, value, onChange, placeholder = 'Selectionner une date' }: DateFieldProps) {
  const [show, setShow] = useState(false)

  const date = value ? new Date(value) : new Date()
  const displayText = value
    ? new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : placeholder

  return (
    <View className="mt-3">
      <Text className="mb-1 text-sm font-medium text-foreground">{label}</Text>
      <Pressable
        className="rounded-input border border-border bg-card px-4 py-3"
        onPress={() => setShow(true)}
      >
        <Text className={value ? 'text-base text-foreground' : 'text-base text-muted-foreground'}>
          {displayText}
        </Text>
      </Pressable>
      {show && (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
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
