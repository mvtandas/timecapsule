import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, font } from '../constants/theme';
import { useT } from '../i18n';

const { width } = Dimensions.get('window');

interface DatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectDate: (date: Date) => void;
  minimumDate?: Date;
}

const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible, onClose, onSelectDate, minimumDate = new Date(),
}) => {
  const t = useT();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const [selectedHour, setSelectedHour] = useState(12);
  const [selectedMinute, setSelectedMinute] = useState(0);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 20 }, (_, i) => currentYear + i);
  const months = [
    t('datePicker.monShortJan'), t('datePicker.monShortFeb'), t('datePicker.monShortMar'),
    t('datePicker.monShortApr'), t('datePicker.monShortMay'), t('datePicker.monShortJun'),
    t('datePicker.monShortJul'), t('datePicker.monShortAug'), t('datePicker.monShortSep'),
    t('datePicker.monShortOct'), t('datePicker.monShortNov'), t('datePicker.monShortDec'),
  ];
  const monthsFull = [
    t('datePicker.monFullJan'), t('datePicker.monFullFeb'), t('datePicker.monFullMar'),
    t('datePicker.monFullApr'), t('datePicker.monFullMay'), t('datePicker.monFullJun'),
    t('datePicker.monFullJul'), t('datePicker.monFullAug'), t('datePicker.monFullSep'),
    t('datePicker.monFullOct'), t('datePicker.monFullNov'), t('datePicker.monFullDec'),
  ];
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: getDaysInMonth(selectedYear, selectedMonth) }, (_, i) => i + 1);

  const handleConfirm = () => {
    const date = new Date(selectedYear, selectedMonth, selectedDay, selectedHour, selectedMinute);
    onSelectDate(date);
    onClose();
  };

  const presets = [
    { label: t('datePicker.preset1Hour'), icon: 'time-outline', fn: () => { const d = new Date(); d.setHours(d.getHours() + 1); return d; } },
    { label: t('datePicker.preset6Hours'), icon: 'time-outline', fn: () => { const d = new Date(); d.setHours(d.getHours() + 6); return d; } },
    { label: t('datePicker.preset1Day'), icon: 'today-outline', fn: () => { const d = new Date(); d.setDate(d.getDate() + 1); return d; } },
    { label: t('datePicker.preset1Week'), icon: 'calendar-outline', fn: () => { const d = new Date(); d.setDate(d.getDate() + 7); return d; } },
    { label: t('datePicker.preset1Month'), icon: 'calendar', fn: () => { const d = new Date(); d.setMonth(d.getMonth() + 1); return d; } },
    { label: t('datePicker.preset1Year'), icon: 'calendar', fn: () => { const d = new Date(); d.setFullYear(d.getFullYear() + 1); return d; } },
  ];

  const handlePreset = (fn: () => Date) => {
    const date = fn();
    onSelectDate(date);
    onClose();
  };

  const formatHour = (h: number) => {
    const ampm = h >= 12 ? t('datePicker.pm') : t('datePicker.am');
    const hour12 = h % 12 || 12;
    return `${hour12} ${ampm}`;
  };

  const renderPicker = (
    data: any[],
    selected: any,
    onSelect: (val: any) => void,
    label: string,
    format?: (val: any) => string,
  ) => (
    <View style={styles.pickerColumn}>
      <Text style={styles.columnLabel}>{label}</Text>
      <ScrollView style={styles.picker} showsVerticalScrollIndicator={false}>
        {data.map((item) => (
          <TouchableOpacity
            key={String(item)}
            style={[styles.pickerItem, selected === item && styles.pickerItemSelected]}
            onPress={() => onSelect(item)}
          >
            <Text style={[styles.pickerText, selected === item && styles.pickerTextSelected]}>
              {format ? format(item) : String(item)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{t('datePicker.title')}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.text2} />
            </TouchableOpacity>
          </View>

          {/* Quick Presets */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetScroll} contentContainerStyle={{ paddingRight: 24 }}>
            {presets.map((p) => (
              <TouchableOpacity key={p.label} style={styles.presetCard} onPress={() => handlePreset(p.fn)}>
                <Ionicons name={p.icon as any} size={20} color={COLORS.ember} />
                <Text style={styles.presetLabel}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.orText}>{t('datePicker.orPickExact')}</Text>

          {/* Date Pickers */}
          <View style={styles.pickerRow}>
            {renderPicker(months, months[selectedMonth], (m) => setSelectedMonth(months.indexOf(m)), t('datePicker.labelMonth'))}
            {renderPicker(days, selectedDay, setSelectedDay, t('datePicker.labelDay'))}
            {renderPicker(years, selectedYear, setSelectedYear, t('datePicker.labelYear'))}
          </View>

          {/* Time Pickers */}
          <View style={styles.timeRow}>
            {renderPicker(hours, selectedHour, setSelectedHour, t('datePicker.labelHour'), formatHour)}
            <Text style={styles.timeSeparator}>:</Text>
            {renderPicker(minutes, selectedMinute, setSelectedMinute, t('datePicker.labelMin'), (m) => String(m).padStart(2, '0'))}
          </View>

          {/* Preview */}
          <View style={styles.previewBox}>
            <Ionicons name="time" size={18} color={COLORS.ember} />
            <Text style={styles.previewText}>
              {t('datePicker.previewText', {
                month: monthsFull[selectedMonth],
                day: selectedDay,
                year: selectedYear,
                time: `${formatHour(selectedHour)}:${String(selectedMinute).padStart(2, '0')}`,
              })}
            </Text>
          </View>

          {/* Confirm */}
          <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
            <Text style={styles.confirmText}>{t('datePicker.setDateTime')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
  container: {
    backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 20, paddingBottom: 40, maxHeight: '90%',
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, marginBottom: 16,
  },
  title: { ...font('title'), fontSize: 22, color: COLORS.text },
  presetScroll: { paddingLeft: 24, marginBottom: 12 },
  presetCard: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.bg3, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    marginRight: 8, borderWidth: 1.5, borderColor: COLORS.border,
  },
  presetLabel: { ...font('label'), fontSize: 13, color: COLORS.text },
  orText: { ...font('body'), textAlign: 'center', color: COLORS.text3, fontSize: 13, marginVertical: 10 },
  pickerRow: { flexDirection: 'row', paddingHorizontal: 24, marginBottom: 12, gap: 8 },
  timeRow: { flexDirection: 'row', paddingHorizontal: 24, marginBottom: 16, gap: 8, alignItems: 'center' },
  timeSeparator: { fontSize: 24, fontWeight: '700', color: COLORS.text, marginTop: 24 },
  pickerColumn: { flex: 1 },
  columnLabel: { ...font('eyebrow'), color: COLORS.text3, marginBottom: 6, textAlign: 'center' },
  picker: { height: 120, backgroundColor: COLORS.bg3, borderRadius: 12 },
  pickerItem: { paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center' },
  pickerItemSelected: { backgroundColor: COLORS.ember, marginVertical: 1, marginHorizontal: 4, borderRadius: 8 },
  pickerText: { fontSize: 15, color: COLORS.text2 },
  pickerTextSelected: { color: COLORS.white, fontWeight: '700' },
  previewBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.emberSoft, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12,
    marginHorizontal: 24, marginBottom: 16,
  },
  previewText: { ...font('bodyBold'), fontSize: 15, color: COLORS.text },
  confirmBtn: {
    backgroundColor: COLORS.ember, paddingVertical: 16, marginHorizontal: 24,
    borderRadius: 14, alignItems: 'center',
  },
  confirmText: { ...font('subtitle'), color: COLORS.white, fontSize: 17 },
});

export default DatePickerModal;
