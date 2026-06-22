import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING, font } from '../../../constants/theme';
import DatePickerModal from '../../../components/DatePickerModal';
import { formatDate } from '../../../utils/dateUtils';
import { useT } from '../../../i18n';

export type TimeMode = 'locked' | 'expires';

interface Props {
  mode: TimeMode;
  onModeChange: (m: TimeMode) => void;
  date: Date | null;
  onDateChange: (d: Date) => void;
  /** false => only "Opens on" (whisper, required). */
  allowExpires?: boolean;
  accent?: string;
}

/** "Locked until / Expires on" toggle + datetime picker (reuses DatePickerModal). */
const TimeLock: React.FC<Props> = ({ mode, onModeChange, date, onDateChange, allowExpires = true, accent = COLORS.ember }) => {
  const t = useT();
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <View>
      {allowExpires && (
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggle, mode === 'locked' && { backgroundColor: `${accent}22`, borderColor: accent }]}
            onPress={() => onModeChange('locked')}
            activeOpacity={0.8}
          >
            <Ionicons name="lock-closed" size={15} color={mode === 'locked' ? accent : COLORS.text2} />
            <Text style={[styles.toggleText, { color: mode === 'locked' ? accent : COLORS.text2 }]}>{t('createFlow.lockedUntil')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggle, mode === 'expires' && { backgroundColor: `${accent}22`, borderColor: accent }]}
            onPress={() => onModeChange('expires')}
            activeOpacity={0.8}
          >
            <Ionicons name="hourglass-outline" size={15} color={mode === 'expires' ? accent : COLORS.text2} />
            <Text style={[styles.toggleText, { color: mode === 'expires' ? accent : COLORS.text2 }]}>{t('createFlow.expiresOn')}</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={styles.dateBtn} onPress={() => setPickerOpen(true)} activeOpacity={0.8}>
        <Ionicons name="calendar-outline" size={18} color={accent} />
        <Text style={[styles.dateText, { color: date ? COLORS.text : COLORS.text3 }]}>
          {date ? formatDate(date.toISOString()) : t('createFlow.pickDate')}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={COLORS.text3} />
      </TouchableOpacity>

      <DatePickerModal
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelectDate={(d) => onDateChange(d)}
        minimumDate={new Date()}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  toggleRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  toggle: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: RADIUS.md, backgroundColor: COLORS.bg3, borderWidth: 1, borderColor: COLORS.border,
  },
  toggleText: { ...font('label') },
  dateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingVertical: 14, paddingHorizontal: SPACING.md, borderRadius: RADIUS.md,
    backgroundColor: COLORS.bg3, borderWidth: 1, borderColor: COLORS.border,
  },
  dateText: { ...font('body'), flex: 1 },
});

export default TimeLock;
