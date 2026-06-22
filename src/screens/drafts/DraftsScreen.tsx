import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import ScreenHeader from '../../components/common/ScreenHeader';
import CapTypeIcon from '../../components/common/CapTypeIcon';
import { DraftService } from '../../services/draftService';
import { getCapType } from '../../constants/capTypes';
import { COLORS, SPACING, RADIUS, font } from '../../constants/theme';
import { useT } from '../../i18n';

interface Props { onNavigate: (screen: string, data?: any) => void; onGoBack?: () => void }

const snippet = (p: any): string => p?.title || p?.text || p?.myText || p?.desc || '—';

const DraftsScreen = ({ onNavigate, onGoBack }: Props) => {
  const t = useT();
  const [drafts, setDrafts] = useState<any[] | null>(null);

  useFocusEffect(useCallback(() => { (async () => setDrafts(await DraftService.list()))(); }, []));

  const remove = async (id: string) => { await DraftService.remove(id); setDrafts((d) => (d || []).filter((x) => x.id !== id)); };

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('drafts.title')} onBack={onGoBack} borderBottom />
      {!drafts ? (
        <View style={styles.center}><ActivityIndicator color={COLORS.ember} /></View>
      ) : drafts.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="document-text-outline" size={48} color={COLORS.text3} />
          <Text style={styles.emptyText}>{t('drafts.empty')}</Text>
        </View>
      ) : (
        <FlatList
          data={drafts}
          keyExtractor={(d) => d.id}
          contentContainerStyle={{ padding: SPACING.lg }}
          renderItem={({ item }) => {
            const ct = getCapType(item.type);
            return (
              <View style={styles.row}>
                <TouchableOpacity
                  style={styles.rowMain}
                  onPress={() => onNavigate('Create', { type: item.type })}
                  activeOpacity={0.7}
                >
                  <View style={[styles.icon, { backgroundColor: `${ct.color}22` }]}><CapTypeIcon size={20} color={ct.color} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{ct.name}</Text>
                    <Text style={styles.rowSub} numberOfLines={1}>{snippet(item.payload)}</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => remove(item.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityLabel={t('common.remove')}>
                  <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md, padding: SPACING.xl },
  emptyText: { ...font('subtitle'), color: COLORS.text2, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: COLORS.bg3, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  icon: { width: 44, height: 44, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { ...font('bodyBold'), color: COLORS.text },
  rowSub: { ...font('caption'), color: COLORS.text2, marginTop: 2 },
});

export default DraftsScreen;
