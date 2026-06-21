import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, font } from '../../constants/theme';
import { useLanguage, LANGUAGES } from '../../i18n';
import { VoorcapWordmark } from '../../components/common/VoorcapLogo';
import type { Locale } from '../../i18n/translations';

interface Props {
  onDone: () => void;
}

const LanguageSelectScreen: React.FC<Props> = ({ onDone }) => {
  const setLocale = useLanguage((s) => s.setLocale);
  const current = useLanguage((s) => s.locale);

  const pick = async (code: Locale) => {
    await setLocale(code);
    onDone();
  };

  return (
    <View style={styles.container}>
      <View style={styles.top}>
        <VoorcapWordmark size={28} />
      </View>

      <Text style={[font('display'), styles.title]}>Select your language</Text>
      <Text style={[font('body'), styles.subtitle]}>Dilinizi seçin · Choisissez votre langue · 选择语言</Text>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {LANGUAGES.map((o) => {
          const active = current === o.code;
          return (
            <TouchableOpacity
              key={o.code}
              style={[styles.option, active && styles.optionActive]}
              onPress={() => pick(o.code)}
              activeOpacity={0.85}
            >
              <Text style={styles.flag}>{o.flag}</Text>
              <Text style={[font('subtitle'), { color: COLORS.text, flex: 1 }]}>{o.label}</Text>
              {active && <Ionicons name="checkmark-circle" size={20} color={COLORS.ember} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Text style={[font('caption'), styles.footer]}>You can change this later in Settings</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 24 },
  top: { alignItems: 'center', marginTop: 70, marginBottom: 24 },
  title: { color: COLORS.text, marginBottom: 6 },
  subtitle: { color: COLORS.text2, marginBottom: 20 },
  list: { gap: 10, paddingBottom: 16 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  optionActive: { borderColor: COLORS.ember, backgroundColor: COLORS.emberSoft },
  flag: { fontSize: 26 },
  footer: { color: COLORS.text3, textAlign: 'center', paddingVertical: 16 },
});

export default LanguageSelectScreen;
