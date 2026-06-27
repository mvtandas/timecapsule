import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, font } from '../../../constants/theme';

interface Props {
  title: string;
  stepIndex: number; // 0-based
  steps: number;
  accent?: string;
  onClose: () => void;
  onBack: () => void;
  primaryLabel: string;
  primaryDisabled?: boolean;
  onPrimary: () => void;
  loading?: boolean;
  /** When the primary button is disabled, an optional one-line reason shown beneath it. */
  hintText?: string;
  /** Optional ref to the body ScrollView so callers can scrollToEnd (e.g. after adding an item). */
  scrollRef?: React.RefObject<ScrollView | null>;
  children: React.ReactNode;
}

/** Shared chrome for every create wizard: close + title + step dots, scroll body, Back/primary footer. */
const WizardShell: React.FC<Props> = ({
  title, stepIndex, steps, accent = COLORS.ember, onClose, onBack, primaryLabel, primaryDisabled, onPrimary, loading, hintText, scrollRef, children,
}) => {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
        <TouchableOpacity onPress={onClose} style={styles.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button">
          <Ionicons name="close" size={26} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <View style={styles.iconBtn} />
      </View>

      <View style={styles.dots}>
        {Array.from({ length: steps }).map((_, i) => (
          <View key={i} style={[styles.dot, { backgroundColor: i <= stepIndex ? accent : COLORS.bg4, width: i === stepIndex ? 22 : 7 }]} />
        ))}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }} keyboardVerticalOffset={8}>
        <ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, SPACING.md) }]}>
          <View style={styles.footerRow}>
            {stepIndex > 0 && (
              <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.8} accessibilityRole="button">
                <Ionicons name="chevron-back" size={22} color={COLORS.text} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={onPrimary}
              disabled={primaryDisabled || loading}
              activeOpacity={0.9}
              style={[styles.primary, { backgroundColor: accent, opacity: primaryDisabled || loading ? 0.5 : 1 }]}
              accessibilityRole="button"
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{primaryLabel}</Text>}
            </TouchableOpacity>
          </View>
          {primaryDisabled && !!hintText && (
            <Text style={styles.hint} accessibilityRole="text">{hintText}</Text>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { ...font('subtitle'), color: COLORS.text, flex: 1, textAlign: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingBottom: SPACING.md },
  dot: { height: 7, borderRadius: 4 },
  content: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl },
  footer: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  backBtn: { width: 48, height: 48, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg3, borderWidth: 1, borderColor: COLORS.border },
  primary: { flex: 1, height: 48, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  primaryText: { ...font('labelBold'), fontSize: 15, color: '#fff' },
  hint: { ...font('caption'), color: COLORS.text3, textAlign: 'center', marginTop: SPACING.sm },
});

export default WizardShell;
