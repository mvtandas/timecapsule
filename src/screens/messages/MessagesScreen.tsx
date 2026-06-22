import React, { useState, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Image, RefreshControl, ActivityIndicator, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import ScreenHeader from '../../components/common/ScreenHeader';
import { MessagingService, ConversationSummary } from '../../services/messagingService';
import { supabase } from '../../lib/supabase';
import { timeAgo } from '../../utils/dateUtils';
import { COLORS, SPACING, RADIUS, font } from '../../constants/theme';
import { useT } from '../../i18n';

interface Props { onNavigate: (screen: string, data?: any) => void; onGoBack?: () => void }

const MessagesScreen = ({ onNavigate, onGoBack }: Props) => {
  const t = useT();
  const [items, setItems] = useState<ConversationSummary[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Compose / new-message picker.
  const [composeOpen, setComposeOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [people, setPeople] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const searchPeople = useCallback(async (q: string) => {
    setQuery(q);
    setSearching(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let req = supabase.from('profiles').select('id, username, display_name, avatar_url').limit(20);
      if (q.trim()) req = req.or(`username.ilike.%${q.trim()}%,display_name.ilike.%${q.trim()}%`);
      const { data } = await req;
      setPeople(((data as any[]) || []).filter((p) => p.id !== user?.id));
    } catch { setPeople([]); }
    finally { setSearching(false); }
  }, []);

  const openCompose = () => { setComposeOpen(true); if (people.length === 0) searchPeople(''); };

  const startChat = async (p: any) => {
    setComposeOpen(false);
    const name = p.display_name || p.username || t('capDetail.someone');
    const conv = await MessagingService.getOrCreateConversation(p.id);
    onNavigate('Chat', { otherUserId: p.id, conversationId: conv?.id, title: name });
  };

  const load = useCallback(async () => {
    const data = await MessagingService.listConversations();
    setItems(data);
  }, []);

  // Reload on focus + light polling while focused (no realtime yet).
  useFocusEffect(useCallback(() => {
    load();
    pollRef.current = setInterval(load, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [load]));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const preview = (c: ConversationSummary): string => {
    const m = c.lastMessage;
    if (!m) return '';
    if (m.kind === 'cap') return `📦 ${t('messages.shared_cap')}`;
    if (m.kind === 'location') return `📍 ${t('messages.shared_location')}`;
    return m.body || '';
  };

  const renderItem = ({ item }: { item: ConversationSummary }) => {
    const name = item.other?.display_name || item.other?.username || t('capDetail.someone');
    return (
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.7}
        onPress={() => onNavigate('Chat', { otherUserId: item.other?.id, conversationId: item.conversation.id, title: name })}
      >
        <View style={styles.avatar}>
          {item.other?.avatar_url ? (
            <Image source={{ uri: item.other.avatar_url }} style={styles.avatarImg} />
          ) : (
            <Ionicons name="person" size={20} color={COLORS.text2} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.rowTop}>
            <Text style={[styles.name, item.unread > 0 && styles.nameUnread]} numberOfLines={1}>{name}</Text>
            {item.lastMessage && <Text style={styles.time}>{timeAgo(item.lastMessage.created_at)}</Text>}
          </View>
          <Text style={[styles.preview, item.unread > 0 && styles.previewUnread]} numberOfLines={1}>{preview(item)}</Text>
        </View>
        {item.unread > 0 && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t('messages.title')}
        onBack={onGoBack}
        borderBottom
        right={(
          <TouchableOpacity onPress={openCompose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel={t('messages.send_message')}>
            <Ionicons name="create-outline" size={24} color={COLORS.ember} />
          </TouchableOpacity>
        )}
      />
      {items === null ? (
        <View style={styles.center}><ActivityIndicator color={COLORS.ember} /></View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="chatbubbles-outline" size={52} color={COLORS.text3} />
          <Text style={styles.emptyTitle}>{t('messages.empty_title')}</Text>
          <Text style={styles.emptyText}>{t('messages.empty_text')}</Text>
          <TouchableOpacity style={styles.cta} onPress={openCompose} activeOpacity={0.85}>
            <Ionicons name="create-outline" size={18} color="#fff" />
            <Text style={styles.ctaText}>{t('messages.send_message')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(c) => c.conversation.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 124 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.ember} />}
        />
      )}

      {/* Compose / new message — pick anyone to start a chat */}
      <Modal visible={composeOpen} transparent animationType="slide" onRequestClose={() => setComposeOpen(false)}>
        <View style={styles.pickerBackdrop}>
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>{t('messages.send_message')}</Text>
              <TouchableOpacity onPress={() => setComposeOpen(false)}><Ionicons name="close" size={24} color={COLORS.text} /></TouchableOpacity>
            </View>
            <View style={styles.searchRow}>
              <Ionicons name="search" size={18} color={COLORS.text3} />
              <TextInput
                style={styles.searchInput}
                value={query}
                onChangeText={searchPeople}
                placeholder={t('search.placeholder', { defaultValue: 'Search people' })}
                placeholderTextColor={COLORS.text3}
                autoFocus
              />
            </View>
            {searching ? (
              <View style={styles.center}><ActivityIndicator color={COLORS.ember} /></View>
            ) : (
              <FlatList
                data={people}
                keyExtractor={(p) => p.id}
                style={{ maxHeight: 380 }}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item: p }) => (
                  <TouchableOpacity style={styles.personRow} activeOpacity={0.7} onPress={() => startChat(p)}>
                    <View style={styles.avatar}>
                      {p.avatar_url ? <Image source={{ uri: p.avatar_url }} style={styles.avatarImg} /> : <Ionicons name="person" size={18} color={COLORS.text2} />}
                    </View>
                    <Text style={styles.personName} numberOfLines={1}>{p.display_name || p.username || t('capDetail.someone')}</Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md, padding: SPACING.xl },
  emptyTitle: { ...font('subtitle'), color: COLORS.text },
  emptyText: { ...font('body'), color: COLORS.text2, textAlign: 'center' },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.ember, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderRadius: RADIUS.pill, marginTop: SPACING.sm },
  ctaText: { ...font('label'), color: '#fff' },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.bg3, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: 52, height: 52 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name: { ...font('bodyBold'), color: COLORS.text, flex: 1 },
  nameUnread: { color: COLORS.text },
  time: { ...font('caption'), color: COLORS.text3 },
  preview: { ...font('caption'), color: COLORS.text2, marginTop: 2 },
  previewUnread: { color: COLORS.text },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.ember },
  pickerBackdrop: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
  pickerSheet: { backgroundColor: COLORS.bg2, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.lg, paddingBottom: SPACING.xxl },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.md },
  pickerTitle: { ...font('subtitle'), color: COLORS.text },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.bg3, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, marginBottom: SPACING.sm },
  searchInput: { flex: 1, ...font('body'), color: COLORS.text, paddingVertical: 10 },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.sm },
  personName: { ...font('body'), color: COLORS.text, flex: 1 },
});

export default MessagesScreen;
