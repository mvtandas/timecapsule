import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SHADOWS } from '../constants/colors';

const { width } = Dimensions.get('window');

interface DatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectDate: (date: Date) => void;
  minimumDate?: Date;
}

const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible,
  onClose,
  onSelectDate,
  minimumDate = new Date(),
}) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 20 }, (_, i) => currentYear + i);
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const days = Array.from({ length: getDaysInMonth(selectedYear, selectedMonth) }, (_, i) => i + 1);

  const handleConfirm = () => {
    const date = new Date(selectedYear, selectedMonth, selectedDay);
    onSelectDate(date);
    onClose();
  };

  const presets = [
    { label: '1 Week', days: 7, icon: 'time-outline' },
    { label: '1 Month', days: 30, icon: 'calendar-outline' },
    { label: '3 Months', days: 90, icon: 'calendar' },
    { label: '6 Months', days: 180, icon: 'calendar' },
    { label: '1 Year', days: 365, icon: 'calendar' },
    { label: '5 Years', days: 365 * 5, icon: 'calendar' },
  ];

  const handlePreset = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    onSelectDate(date);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Select Open Date</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.text.secondary} />
            </TouchableOpacity>
          </View>

          {/* Quick Presets */}
          <View style={styles.presetsSection}>
            <Text style={styles.sectionTitle}>Quick Select</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetScroll}>
              {presets.map((preset) => (
                <TouchableOpacity
                  key={preset.label}
                  style={styles.presetCard}
                  onPress={() => handlePreset(preset.days)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={preset.icon as any} size={24} color={COLORS.gradient.pink} />
                  <Text style={styles.presetLabel}>{preset.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <Text style={styles.orText}>or pick a custom date</Text>

          {/* Date Picker */}
          <View style={styles.pickerContainer}>
            {/* Month Picker */}
            <View style={styles.pickerColumn}>
              <Text style={styles.columnLabel}>Month</Text>
              <ScrollView style={styles.picker} showsVerticalScrollIndicator={false}>
                {months.map((month, index) => (
                  <TouchableOpacity
                    key={month}
                    style={[
                      styles.pickerItem,
                      selectedMonth === index && styles.pickerItemSelected,
                    ]}
                    onPress={() => setSelectedMonth(index)}
                  >
                    <Text
                      style={[
                        styles.pickerText,
                        selectedMonth === index && styles.pickerTextSelected,
                      ]}
                    >
                      {month}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Day Picker */}
            <View style={styles.pickerColumn}>
              <Text style={styles.columnLabel}>Day</Text>
              <ScrollView style={styles.picker} showsVerticalScrollIndicator={false}>
                {days.map((day) => (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.pickerItem,
                      selectedDay === day && styles.pickerItemSelected,
                    ]}
                    onPress={() => setSelectedDay(day)}
                  >
                    <Text
                      style={[
                        styles.pickerText,
                        selectedDay === day && styles.pickerTextSelected,
                      ]}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Year Picker */}
            <View style={styles.pickerColumn}>
              <Text style={styles.columnLabel}>Year</Text>
              <ScrollView style={styles.picker} showsVerticalScrollIndicator={false}>
                {years.map((year) => (
                  <TouchableOpacity
                    key={year}
                    style={[
                      styles.pickerItem,
                      selectedYear === year && styles.pickerItemSelected,
                    ]}
                    onPress={() => setSelectedYear(year)}
                  >
                    <Text
                      style={[
                        styles.pickerText,
                        selectedYear === year && styles.pickerTextSelected,
                      ]}
                    >
                      {year}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          {/* Selected Date Display */}
          <View style={styles.selectedDateContainer}>
            <Ionicons name="calendar" size={20} color={COLORS.gradient.pink} />
            <Text style={styles.selectedDateText}>
              {months[selectedMonth]} {selectedDay}, {selectedYear}
            </Text>
          </View>

          {/* Confirm Button */}
          <TouchableOpacity onPress={handleConfirm} activeOpacity={0.8}>
            <LinearGradient
              colors={['#ED62EF', '#6A56FF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.confirmButton}
            >
              <Text style={styles.confirmButtonText}>Confirm Date</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.background.secondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  closeButton: {
    padding: 4,
  },
  presetsSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginBottom: 12,
    paddingHorizontal: 24,
  },
  presetScroll: {
    paddingLeft: 24,
  },
  presetCard: {
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    alignItems: 'center',
    minWidth: 80,
    borderWidth: 2,
    borderColor: COLORS.border.primary,
  },
  presetLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginTop: 8,
    textAlign: 'center',
  },
  orText: {
    textAlign: 'center',
    color: COLORS.text.tertiary,
    fontSize: 14,
    marginVertical: 16,
  },
  pickerContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  pickerColumn: {
    flex: 1,
    marginHorizontal: 4,
  },
  columnLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  picker: {
    height: 180,
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 12,
  },
  pickerItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  pickerItemSelected: {
    backgroundColor: COLORS.gradient.pink,
    marginVertical: 2,
    marginHorizontal: 4,
    borderRadius: 8,
  },
  pickerText: {
    fontSize: 16,
    color: COLORS.text.secondary,
  },
  pickerTextSelected: {
    color: 'white',
    fontWeight: '700',
  },
  selectedDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background.tertiary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginHorizontal: 24,
    marginBottom: 20,
    gap: 8,
  },
  selectedDateText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  confirmButton: {
    paddingVertical: 16,
    marginHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    overflow: 'hidden',
    ...SHADOWS.pink,
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
});

export default DatePickerModal;

