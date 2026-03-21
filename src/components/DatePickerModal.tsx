import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const [selectedHour, setSelectedHour] = useState(12);
  const [selectedMinute, setSelectedMinute] = useState(0);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 20 }, (_, i) => currentYear + i);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthsFull = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
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
    { label: '1 Hour', icon: 'time-outline', fn: () => { const d = new Date(); d.setHours(d.getHours() + 1); return d; } },
    { label: '6 Hours', icon: 'time-outline', fn: () => { const d = new Date(); d.setHours(d.getHours() + 6); return d; } },
    { label: '1 Day', icon: 'today-outline', fn: () => { const d = new Date(); d.setDate(d.getDate() + 1); return d; } },
    { label: '1 Week', icon: 'calendar-outline', fn: () => { const d = new Date(); d.setDate(d.getDate() + 7); return d; } },
    { label: '1 Month', icon: 'calendar', fn: () => { const d = new Date(); d.setMonth(d.getMonth() + 1); return d; } },
    { label: '1 Year', icon: 'calendar', fn: () => { const d = new Date(); d.setFullYear(d.getFullYear() + 1); return d; } },
  ];

  const handlePreset = (fn: () => Date) => {
    const date = fn();
    onSelectDate(date);
    onClose();
  };

  const formatHour = (h: number) => {
    const ampm = h >= 12 ? 'PM' : 'AM';
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
            <Text style={styles.title}>When should it open?</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Quick Presets */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetScroll} contentContainerStyle={{ paddingRight: 24 }}>
            {presets.map((p) => (
              <TouchableOpacity key={p.label} style={styles.presetCard} onPress={() => handlePreset(p.fn)}>
                <Ionicons name={p.icon as any} size={20} color="#FAC638" />
                <Text style={styles.presetLabel}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.orText}>or pick exact date & time</Text>

          {/* Date Pickers */}
          <View style={styles.pickerRow}>
            {renderPicker(months, months[selectedMonth], (m) => setSelectedMonth(months.indexOf(m)), 'Month')}
            {renderPicker(days, selectedDay, setSelectedDay, 'Day')}
            {renderPicker(years, selectedYear, setSelectedYear, 'Year')}
          </View>

          {/* Time Pickers */}
          <View style={styles.timeRow}>
            {renderPicker(hours, selectedHour, setSelectedHour, 'Hour', formatHour)}
            <Text style={styles.timeSeparator}>:</Text>
            {renderPicker(minutes, selectedMinute, setSelectedMinute, 'Min', (m) => String(m).padStart(2, '0'))}
          </View>

          {/* Preview */}
          <View style={styles.previewBox}>
            <Ionicons name="time" size={18} color="#FAC638" />
            <Text style={styles.previewText}>
              {monthsFull[selectedMonth]} {selectedDay}, {selectedYear} at {formatHour(selectedHour)}:{String(selectedMinute).padStart(2, '0')}
            </Text>
          </View>

          {/* Confirm */}
          <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
            <Text style={styles.confirmText}>Set Date & Time</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  container: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 20, paddingBottom: 40, maxHeight: '90%',
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, marginBottom: 16,
  },
  title: { fontSize: 22, fontWeight: '700', color: '#1e293b' },
  presetScroll: { paddingLeft: 24, marginBottom: 12 },
  presetCard: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#f8f8f5', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    marginRight: 8, borderWidth: 1.5, borderColor: '#e2e8f0',
  },
  presetLabel: { fontSize: 13, fontWeight: '600', color: '#475569' },
  orText: { textAlign: 'center', color: '#94a3b8', fontSize: 13, marginVertical: 10 },
  pickerRow: { flexDirection: 'row', paddingHorizontal: 24, marginBottom: 12, gap: 8 },
  timeRow: { flexDirection: 'row', paddingHorizontal: 24, marginBottom: 16, gap: 8, alignItems: 'center' },
  timeSeparator: { fontSize: 24, fontWeight: '700', color: '#1e293b', marginTop: 24 },
  pickerColumn: { flex: 1 },
  columnLabel: { fontSize: 11, fontWeight: '600', color: '#94a3b8', marginBottom: 6, textAlign: 'center', textTransform: 'uppercase' },
  picker: { height: 120, backgroundColor: '#f8f8f5', borderRadius: 12 },
  pickerItem: { paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center' },
  pickerItemSelected: { backgroundColor: '#FAC638', marginVertical: 1, marginHorizontal: 4, borderRadius: 8 },
  pickerText: { fontSize: 15, color: '#475569' },
  pickerTextSelected: { color: '#fff', fontWeight: '700' },
  previewBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#FFF8E1', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12,
    marginHorizontal: 24, marginBottom: 16,
  },
  previewText: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  confirmBtn: {
    backgroundColor: '#FAC638', paddingVertical: 16, marginHorizontal: 24,
    borderRadius: 14, alignItems: 'center',
  },
  confirmText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});

export default DatePickerModal;
