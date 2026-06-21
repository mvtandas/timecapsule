import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SavedService } from '../../services/savedService';
import CapsuleDetailModal from '../../components/CapsuleDetailModal';
import CapTypeBadge from '../../components/common/CapTypeBadge';
import { SkeletonList } from '../../components/common/Skeleton';
import ScreenHeader from '../../components/common/ScreenHeader';
import { COLORS, font } from '../../constants/theme';
import { capColor } from '../../constants/capTypes';
import { useT } from '../../i18n';

interface SavedScreenProps {
  onNavigate: (screen: string, data?: any) => void;
  onGoBack?: () => void;
}

const SavedScreen = ({ onGoBack }: SavedScreenProps) => {
  const t = useT();
  const [caps, setCaps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);

  const load = useCallback(async () => {
    const data = await SavedService.list();
    setCaps(data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.row}
      activeOpacity={0.85}
      onPress={() => {
        setSelected(item);
        setShowDetail(true);
      }}
    >
      <View style={[styles.dot, { backgroundColor: capColor(item.type) }]} />
      <View style={{ flex: 1 }}>
        <Text style={[font('subtitle'), styles.title]} numberOfLines={1}>
          {item.title || t('saved.untitled_cap')}
        </Text>
        {!!item.location_name && (
          <Text style={[font('caption'), { color: COLORS.text3 }]} numberOfLines={1}>
            {item.location_name}
          </Text>
        )}
        <View style={{ marginTop: 6 }}>
          <CapTypeBadge type={item.type} />
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={COLORS.text3} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('saved.header_title')} onBack={onGoBack} borderBottom />

      {loading ? (
        <SkeletonList count={6} avatar="square" />
      ) : caps.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="bookmark-outline" size={48} color={COLORS.text3} />
          <Text style={[font('subtitle'), { color: COLORS.text2, marginTop: 12 }]}>{t('saved.empty_title')}</Text>
          <Text style={[font('caption'), { color: COLORS.text3, marginTop: 4, textAlign: 'center' }]}>
            {t('saved.empty_subtitle')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={caps}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={COLORS.ember}
            />
          }
        />
      )}

      <CapsuleDetailModal
        visible={showDetail}
        capsule={selected}
        onClose={() => setShowDetail(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  title: { color: COLORS.text },
});

export default SavedScreen;
