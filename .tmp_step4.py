import json, os

# Write step4.tsx via python
p = 'c:/Users/maxim/Pulse/app/auth/signup/step4.tsx'
content = open(p, 'r', encoding='utf-8').read()

# 1. Add useState
content = content.replace('import { Controller, useForm } from \"react-hook-form\";', 'import { Controller, useForm } from \"react-hook-form\";\nimport { useState } from \"react\";')

# 2. Add NativePicker import
content = content.replace(
    'import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from \"react-native\";',
    'import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from \"react-native\";\nimport { NativePicker } from \"@/components/ui/NativePicker\";'
)

# 3. Add OBJECTIVE_KEYS for Autre
content = content.replace(
    '  \"Préparer un objectif (course, triathlon…)\": \"signup.objective.goal\",\n',
    '  \"Préparer un objectif (course, triathlon…)\": \"signup.objective.goal\",\n  \"Autre\": \"signup.objective.other\",\n'
)

# 4. Add state hooks
after = '  const objectives = watch(\"objectives\");\n'
state_block = '''  const objectives = watch("objectives");
  const [heightOpen, setHeightOpen] = useState(false);
  const [weightOpen, setWeightOpen] = useState(false);
  const [objectivesDetails, setObjectivesDetails] = useState("");
'''
content = content.replace(after, state_block)

# 5. Toggle logic
toggle_old = '''  const toggle = (field: "interestedSports" | "objectives", value: string) => {
    const cur = watch(field);
    if (cur.includes(value)) setValue(field, cur.filter((x) => x !== value), { shouldValidate: true });
    else setValue(field, [...cur, value], { shouldValidate: true });
  };'''

toggle_new = '''  const toggle = (field: "interestedSports" | "objectives", value: string) => {
    if (field === "objectives" && value === "Autre") {
      const on = watch("objectives").includes("Autre");
      setValue("objectives", on ? [] : ["Autre"], { shouldValidate: true });
      setObjectivesDetails("");
      return;
    }
    const cur = watch(field);
    if (cur.includes(value)) setValue(field, cur.filter((x) => x !== value), { shouldValidate: true });
    else setValue(field, [...cur, value], { shouldValidate: true });
  };'''

content = content.replace(toggle_old, toggle_new)

# 6. Add objectivesDetails to setStep4
content = content.replace(
    '      heightCm: values.heightCm,\n      weightKg: values.weightKg,',
    '      objectivesDetails: objectivesDetails || undefined,\n      heightCm: values.heightCm,\n      weightKg: values.weightKg,'
)

# 7. Replace height/weight Input fields
old_block = '''        <View className=\"flex-row gap-3\">
          <Controller
            control={control}
            name=\"heightCm\"
            render={({ field: { value, onChange } }) => (
              <Input
                label={\" \"}
                value={value ?? \"\"}
                onChangeText={onChange}
                keyboardType=\"number-pad\"
                className=\"flex-1\"
              />
            )}
          />
          <Controller
            control={control}
            name=\"weightKg\"
            render={({ field: { value, onChange } }) => (
              <Input
                label={\" \"}
                value={value ?? \"\"}
                onChangeText={onChange}
                keyboardType=\"numeric\"
                className=\"flex-1\"
              />
            )}
          />
        </View>'''

new_block = '''        <View className=\"flex-row gap-3\">
          <Controller
            control={control}
            name=\"heightCm\"
            render={({ field: { value, onChange } }) => (
              <View className=\"flex-1\">
                <Pressable
                  onPress={() => setHeightOpen(true)}
                  accessibilityRole=\"button\"
                  accessibilityLabel={t(\"signup.step4.height\")}
                  className=\"border-[1.5px] border-border bg-surface px-4 h-12 rounded-sm flex-row items-center justify-between active:opacity-70\"
                >
                  <Text className=\"text-base text-text-primary\">
                    {value ? ${value} cm : t(\"signup.step4.height\") + \" \" + t(\"signup.optional\")}
                  </Text>
                  <Text className=\"text-text-tertiary text-lg\">›</Text>
                </Pressable>
                <NativePicker
                  visible={heightOpen}
                  title={t(\"signup.step4.height\")}
                  options={Array.from({ length: 151 }, (_, i) => ({ value: String(100 + i), label: ${100 + i} cm }))}
                  selectedValue={value ?? \"\"}
                  onSelect={(v) => onChange(v as string)}
                  onClose={() => setHeightOpen(false)}
                />
              </View>
            )}
          />
          <Controller
            control={control}
            name=\"weightKg\"
            render={({ field: { value, onChange } }) => (
              <View className=\"flex-1\">
                <Pressable
                  onPress={() => setWeightOpen(true)}
                  accessibilityRole=\"button\"
                  accessibilityLabel={t(\"signup.step4.weight\")}
                  className=\"border-[1.5px] border-border bg-surface px-4 h-12 rounded-sm flex-row items-center justify-between active:opacity-70\"
                >
                  <Text className=\"text-base text-text-primary\">
                    {value ? ${value} kg : t(\"signup.step4.weight\") + \" \" + t(\"signup.optional\")}
                  </Text>
                  <Text className=\"text-text-tertiary text-lg\">›</Text>
                </Pressable>
                <NativePicker
                  visible={weightOpen}
                  title={t(\"signup.step4.weight\")}
                  options={Array.from({ length: 171 }, (_, i) => ({ value: String(30 + i), label: ${30 + i} kg }))}
                  selectedValue={value ?? \"\"}
                  onSelect={(v) => onChange(v as string)}
                  onClose={() => setWeightOpen(false)}
                />
              </View>
            )}
          />
        </View>'''

content = content.replace(old_block, new_block)

# 8. Add objectivesDetails input
after_view_close = '''        </View>\n        <View className=\"flex-row gap-3\">'''
after_with_details = '''        </View>
        {objectives.includes(\"Autre\") && (
          <Controller
            control={control}
            name=\"objectivesDetails\"
            render={({ field: { value, onChange } }) => (
              <Input
                label={t(\"signup.step4.objectivesDetailsLabel\")}
                value={value ?? \"\"}
                onChangeText={(text) => { onChange(text); setObjectivesDetails(text); }}
                placeholder={t(\"signup.step4.objectivesDetailsPlaceholder\")}
                multiline
                numberOfLines={3}
                className=\"mb-4\"
              />
            )}
          />
        )}
        <View className=\"flex-row gap-3\">'''

content = content.replace(after_view_close, after_with_details)

open(p, 'w', encoding='utf-8').write(content)
print('OK step4.tsx')
