import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Image,
  KeyboardAvoidingView, Platform, Modal, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import ScreenHeader from '../../components/common/ScreenHeader';
import CapsuleDetailModal from '../../components/CapsuleDetailModal';
import CapTypeIcon from '../../components/common/CapTypeIcon';
import { MessagingService, Message } from '../../services/messagingService';
import { CapsuleService } from '../../services/capsuleService';
import { openDirections } from '../../utils/directions';
import { getCapType } from '../../constants/capTypes';
import { supabase } from '../../lib/supabase';
import { COLORS, GRADIENTS, SPACING, RADIUS, font } from '../../constants/theme';
import { useT } from '../../i18n';

interface Props {
  onNavigate: (screen: string, data?: any) => void;
  onGoBack?: () => void;
  otherUserId?: string;
  conversationId?: string;
  title?: string;
}

const ChatScreen = ({ onGoBack, otherUserId, conversationId: convIdProp, title }: Props) => {
  const t = useT();
  const [convId, setConvId] = useState<string | null>(convIdProp || null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sharingLoc, setSharingLoc] = useState(false);
  const [loading, setLoading] = useState(true);
  const [capCache, setCapCache] = useState<Record<string, any>>({});
  const [showCapPicker, setShowCapPicker] = useState(false);
  const [myCaps, setMyCaps] = useState<any[] | null>(null);
  const [detailCap, setDetailCap] = useState<any>(null);
  const listRef = useRef<FlatList>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Resolve the conversation (create on first message target) + current user.
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setMeId(user?.id ?? null);
      let id = convIdProp || null;
      if (!id && otherUserId) {
        const c = await MessagingService.getOrCreateConversation(otherUserId);
        id = c?.id ?? null;
      }
      setConvId(id);
      setLoading(false);
    })();
  }, [otherUserId, convIdProp]);

  const loadMessages = useCallback(async (id: string) => {
    const msgs = await MessagingService.getMessages(id);
    setMessages(msgs);
    // Batch-fetch any caps referenced by 'cap' messages we haven't cached.
    const capIds = Array.from(new Set(msgs.filter((m) => m.kind === 'cap' && m.cap_id).map((m) => m.cap_id as string)));
    const missing = capIds.filter((cid) => !capCache[cid]);
    if (missing.length) {
      const { data } = await supabase.from('capsules').select('*').in('id', missing);
      if (data) setCapCache((prev) => { const n = { ...prev }; (data as any[]).forEach((c) => { n[c.id] = c; }); return n; });
    }
    MessagingService.markRead(id);
  }, [capCache]);

  // Load + poll while the conversation is known.
  useEffect(() => {
    if (!convId) return;
    loadMessages(convId);
    pollRef.current = setInterval(() => loadMessages(convId), 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [convId]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = async (payload: { body?: string; cap_id?: string; location?: { lat: number; lng: number; name?: string } }) => {
    if (!convId || sending) return;
    setSending(true);
    const { error } = await MessagingService.sendMessage(convId, payload);
    setSending(false);
    if (error) { Alert.alert(t('capDetail.errorTitle'), String((error as any)?.message || error)); return; }
    setText('');
    await loadMessages(convId);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  };

  const sendText = () => { const b = text.trim(); if (b) send({ body: b }); };

  const openCapPicker = async () => {
    setShowCapPicker(true);
    if (myCaps === null) {
      const { data } = await CapsuleService.getUserCapsules();
      setMyCaps((data as any[]) || []);
    }
  };

  const shareLocation = async () => {
    if (sharingLoc) return;
    setSharingLoc(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { Alert.alert(t('capDetail.locationNeeded')); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      let name: string | undefined;
      try {
        const r = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        if (r[0]) name = [r[0].city || r[0].name, r[0].region].filter(Boolean).join(', ');
      } catch { /* name optional */ }
      await send({ location: { lat: loc.coords.latitude, lng: loc.coords.longitude, name } });
    } catch (e) {
      if (__DEV__) console.error('shareLocation', e);
      Alert.alert(t('capDetail.errorTitle'), t('capDetail.distanceUnknown'));
    } finally {
      setSharingLoc(false);
    }
  };

  const openCapDetail = async (capId: string) => {
    let cap = capCache[capId];
    if (!cap) { const { data } = await CapsuleService.getCapsule(capId); cap = data; }
    if (cap) setDetailCap(cap);
  };

  const renderBubble = ({ item }: { item: Message }) => {
    const mine = item.sender_id === meId;
    const wrap = [styles.bubbleRow, mine ? styles.bubbleRowMine : styles.bubbleRowOther];

    let inner: React.ReactNode;
    if (item.kind === 'cap') {
      const cap = item.cap_id ? capCache[item.cap_id] : null;
      const ct = getCapType(cap?.type || 'public');
      inner = (
        <TouchableOpacity onPress={() => item.cap_id && openCapDetail(item.cap_id)} activeOpacity={0.85} style={styles.attachCard}>
          <View style={[styles.attachIcon, { backgroundColor: `${ct.color}22` }]}><CapTypeIcon size={18} color={ct.color} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.attachTitle} numberOfLines={1}>{cap?.title || ct.name}</Text>
            <Text style={styles.attachSub}>{t('messages.view_cap')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={COLORS.text3} />
        </TouchableOpacity>
      );
    } else if (item.kind === 'location') {
      inner = (
        <TouchableOpacity onPress={() => item.lat != null && item.lng != null && openDirections(item.lat, item.lng, item.location_name || undefined)} activeOpacity={0.85} style={styles.attachCard}>
          <View style={[styles.attachIcon, { backgroundColor: `${COLORS.ember}22` }]}><Ionicons name="location" size={18} color={COLORS.ember} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.attachTitle} numberOfLines={1}>{item.location_name || t('messages.shared_location')}</Text>
            <Text style={styles.attachSub}>{t('messages.view_location')}</Text>
          </View>
          <Ionicons name="navigate-outline" size={16} color={COLORS.text3} />
        </TouchableOpacity>
      );
    } else {
      inner = <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{item.body}</Text>;
    }

    if (mine && item.kind === 'text') {
      return (
        <View style={wrap}>
          <LinearGradient colors={GRADIENTS.ember as readonly [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.bubble, styles.bubbleMine]}>
            {inner}
          </LinearGradient>
        </View>
      );
    }
    return (
      <View style={wrap}>
        <View style={[styles.bubble, mine ? styles.bubbleMineSolid : styles.bubbleOther]}>{inner}</View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title={title || t('messages.title')} onBack={onGoBack} borderBottom />
      {loading ? (
        <View style={styles.center}><ActivityIndicator color={COLORS.ember} /></View>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={8}>
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={renderBubble}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          />
          <View style={styles.composer}>
            <TouchableOpacity style={styles.composerBtn} onPress={openCapPicker} accessibilityLabel={t('messages.share_cap')}>
              <Ionicons name="add-circle-outline" size={24} color={COLORS.ember} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.composerBtn} onPress={shareLocation} disabled={sharingLoc} accessibilityLabel={t('messages.share_location')}>
              {sharingLoc
                ? <ActivityIndicator size="small" color={COLORS.ember} />
                : <Ionicons name="location-outline" size={22} color={COLORS.ember} />}
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder={t('messages.input_placeholder')}
              placeholderTextColor={COLORS.text3}
              multiline
            />
            <TouchableOpacity style={[styles.sendBtn, (!text.trim() || sending) && { opacity: 0.4 }]} onPress={sendText} disabled={!text.trim() || sending}>
              <Ionicons name="arrow-up" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* Cap picker */}
      <Modal visible={showCapPicker} transparent animationType="slide" onRequestClose={() => setShowCapPicker(false)}>
        <View style={styles.pickerBackdrop}>
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>{t('messages.pick_cap_title')}</Text>
              <TouchableOpacity onPress={() => setShowCapPicker(false)}><Ionicons name="close" size={24} color={COLORS.text} /></TouchableOpacity>
            </View>
            {myCaps === null ? (
              <View style={styles.center}><ActivityIndicator color={COLORS.ember} /></View>
            ) : myCaps.length === 0 ? (
              <Text style={styles.pickerEmpty}>{t('messages.no_caps')}</Text>
            ) : (
              <FlatList
                data={myCaps}
                keyExtractor={(c) => c.id}
                style={{ maxHeight: 360 }}
                renderItem={({ item }) => {
                  const ct = getCapType(item.type || 'public');
                  return (
                    <TouchableOpacity style={styles.pickerRow} activeOpacity={0.7} onPress={() => { setShowCapPicker(false); send({ cap_id: item.id }); }}>
                      <View style={[styles.attachIcon, { backgroundColor: `${ct.color}22` }]}><CapTypeIcon size={18} color={ct.color} /></View>
                      <Text style={styles.pickerRowText} numberOfLines={1}>{item.title || ct.name}</Text>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>

      <CapsuleDetailModal visible={!!detailCap} capsule={detailCap} onClose={() => setDetailCap(null)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  list: { flex: 1 },
  listContent: { padding: SPACING.md, paddingBottom: SPACING.lg, flexGrow: 1, justifyContent: 'flex-end' },
  bubbleRow: { marginVertical: 3, maxWidth: '80%' },
  bubbleRowMine: { alignSelf: 'flex-end' },
  bubbleRowOther: { alignSelf: 'flex-start' },
  bubble: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.lg },
  bubbleMine: { borderBottomRightRadius: 4 },
  bubbleMineSolid: { backgroundColor: COLORS.ember, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: COLORS.bg3, borderBottomLeftRadius: 4 },
  bubbleText: { ...font('body'), color: COLORS.text },
  bubbleTextMine: { color: '#fff' },
  attachCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, minWidth: 200 },
  attachIcon: { width: 38, height: 38, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  attachTitle: { ...font('label'), color: COLORS.text },
  attachSub: { ...font('caption'), color: COLORS.text2, marginTop: 1 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border, backgroundColor: COLORS.bg },
  composerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, maxHeight: 110, minHeight: 38, backgroundColor: COLORS.bg3, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.md, paddingTop: 9, paddingBottom: 9, color: COLORS.text, ...font('body') },
  sendBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.ember, alignItems: 'center', justifyContent: 'center' },
  pickerBackdrop: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
  pickerSheet: { backgroundColor: COLORS.bg2, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.lg, paddingBottom: SPACING.xxl },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.md },
  pickerTitle: { ...font('subtitle'), color: COLORS.text },
  pickerEmpty: { ...font('body'), color: COLORS.text2, textAlign: 'center', paddingVertical: SPACING.lg },
  pickerRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.sm },
  pickerRowText: { ...font('body'), color: COLORS.text, flex: 1 },
});

export default ChatScreen;
