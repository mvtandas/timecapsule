import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Share,
  Linking,
  Alert,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { COLORS, font } from '../constants/theme';
import { getCapType } from '../constants/capTypes';
import CapTypeBadge from './common/CapTypeBadge';
import { VoorcapMark } from './common/VoorcapLogo';
import { useT } from '../i18n';
import { FriendService } from '../services/friendService';
import { MessagingService } from '../services/messagingService';
import { supabase } from '../lib/supabase';

/**
 * Bottom share sheet for a cap.
 *
 * Layout:
 *  - "Send to…" — in-app friend multi-select (FriendService.getFriends → profiles)
 *    with a "Send to N people →" CTA that posts the cap into each 1:1 conversation
 *    (MessagingService) and falls back to a link message on failure.
 *  - "or share publicly" — Instagram Stories (branded 9:16 card) · WhatsApp · X · Copy.
 *  - WhatsApp & X open a small branded in-app preview (bubble / tweet card) with the
 *    share text + confirm button before invoking the OS share.
 *
 * Builds a deep link (voorcap://cap/<id>) + descriptive text; falls back to the
 * OS share sheet when a target app isn't installed.
 */
interface ShareSheetProps {
  visible: boolean;
  cap: any;
  onClose: () => void;
}

interface FriendProfile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

/** Best-effort plain-text excerpt from a cap's body/message for preview cards. */
const capExcerpt = (cap: any): string => {
  const raw = cap?.message ?? cap?.description ?? cap?.body;
  if (!raw) return '';
  if (typeof raw === 'string') return raw.trim().slice(0, 120);
  if (Array.isArray(raw)) {
    const text = raw
      .map((b: any) => (typeof b === 'string' ? b : b?.text || b?.content || ''))
      .filter(Boolean)
      .join(' ')
      .trim();
    return text.slice(0, 120);
  }
  return '';
};

const initialsOf = (p: FriendProfile): string => {
  const name = p.display_name || p.username || '?';
  return name.trim().slice(0, 1).toUpperCase();
};

const ShareSheet: React.FC<ShareSheetProps> = ({ visible, cap, onClose }) => {
  const insets = useSafeAreaInsets();
  const t = useT();

  // ── Friend picker state ───────────────────────────────────────
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  // ── Platform preview modal ('instagram' | 'whatsapp' | 'x' | null) ──
  const [platformModal, setPlatformModal] = useState<null | 'instagram' | 'whatsapp' | 'x'>(null);

  useEffect(() => {
    if (!visible) {
      // Reset transient state when the sheet closes.
      setSelected([]);
      setPlatformModal(null);
      setSending(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingFriends(true);
      try {
        const { data: ids } = await FriendService.getFriends();
        if (!ids || ids.length === 0) {
          if (!cancelled) setFriends([]);
          return;
        }
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url')
          .in('id', ids);
        if (!cancelled) setFriends((profiles as FriendProfile[]) || []);
      } catch {
        if (!cancelled) setFriends([]);
      } finally {
        if (!cancelled) setLoadingFriends(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible]);

  if (!cap) return null;

  const ct = getCapType(cap.type);
  const link = `voorcap://cap/${cap.id}`;
  const loc = cap.location_name ? t('share.message_at', { location: cap.location_name }) : '';
  const message = t('share.message', {
    title: cap.title || t('share.fallback_title'),
    type: ct.name,
    loc,
    link,
  });
  const excerpt = capExcerpt(cap);
  const title = cap.title || t('share.fallback_title');

  // ── Helpers ──────────────────────────────────────────────────
  const toggleFriend = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const sendToFriends = async () => {
    if (selected.length === 0 || sending) return;
    setSending(true);
    let ok = 0;
    try {
      for (const friendId of selected) {
        try {
          const convo = await MessagingService.getOrCreateConversation(friendId);
          if (convo) {
            // Post the cap itself into the conversation; include a link in the body
            // so it's still useful if the cap message renders as plain text.
            const { error } = await MessagingService.sendMessage(convo.id, {
              cap_id: cap.id,
              body: message,
            });
            if (!error) ok += 1;
          }
        } catch {
          /* skip this friend, keep going */
        }
      }
    } finally {
      setSending(false);
    }
    onClose();
    if (ok > 0) {
      Alert.alert(
        t('share.sent_title', { defaultValue: 'Sent' }),
        t('share.sent_count', {
          defaultValue: ok === 1 ? 'Sent to 1 person.' : `Sent to ${ok} people.`,
          count: ok,
        }),
      );
    } else {
      Alert.alert(
        t('share.send_failed_title', { defaultValue: "Couldn't send" }),
        t('share.send_failed_message', {
          defaultValue: 'Something went wrong. Please try again.',
        }),
      );
    }
  };

  const openOrShare = async (url: string) => {
    try {
      const okUrl = await Linking.canOpenURL(url);
      if (okUrl) await Linking.openURL(url);
      else await Share.share({ message });
    } catch {
      try {
        await Share.share({ message });
      } catch {
        /* ignore */
      }
    }
    setPlatformModal(null);
    onClose();
  };

  const copyLink = async () => {
    try {
      await Clipboard.setStringAsync(link);
    } catch {
      /* ignore */
    }
    onClose();
    Alert.alert(t('share.copied_title'), t('share.copied_message'));
  };

  const shareNative = async () => {
    try {
      await Share.share({ message });
    } catch {
      /* ignore */
    }
    onClose();
  };

  // Platform tiles in the "share publicly" grid.
  const platforms = [
    {
      key: 'instagram' as const,
      label: t('share.label_instagram', { defaultValue: 'Instagram Stories' }),
      icon: 'logo-instagram' as const,
      gradient: ['#833AB4', '#E1306C', '#F77737'] as const,
      onPress: () => setPlatformModal('instagram'),
    },
    {
      key: 'whatsapp' as const,
      label: 'WhatsApp',
      icon: 'logo-whatsapp' as const,
      gradient: ['#25D366', '#1EBE57'] as const,
      onPress: () => setPlatformModal('whatsapp'),
    },
    {
      key: 'x' as const,
      label: 'X',
      icon: 'logo-twitter' as const,
      gradient: ['#000000', '#1a1a1a'] as const,
      onPress: () => setPlatformModal('x'),
    },
    {
      key: 'copy' as const,
      label: t('share.label_copy_link'),
      icon: 'link' as const,
      gradient: [COLORS.bg4, COLORS.bg3] as const,
      onPress: copyLink,
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* ── Main share sheet ── */}
      {!platformModal && (
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
          <TouchableOpacity
            activeOpacity={1}
            style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}
          >
            <View style={styles.handle} />

            <View style={styles.sheetHeader}>
              <Text style={[font('subtitle'), { color: COLORS.text }]}>{t('share.title')}</Text>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={8}>
                <Ionicons name="close" size={16} color={COLORS.text3} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              {/* Preview */}
              <View style={[styles.preview, { borderColor: `${ct.color}55` }]}>
                <CapTypeBadge type={cap.type} />
                <Text
                  style={[font('subtitle'), { color: COLORS.text, marginTop: 8 }]}
                  numberOfLines={1}
                >
                  {title}
                </Text>
                {!!cap.location_name && (
                  <Text
                    style={[font('caption'), { color: COLORS.text3, marginTop: 2 }]}
                    numberOfLines={1}
                  >
                    {cap.location_name}
                  </Text>
                )}
              </View>

              {/* ── Send to friends (in-app) ── */}
              <Text style={[font('eyebrow'), styles.sectionLabel]}>
                {t('share.send_to', { defaultValue: 'Send to' })}
              </Text>

              {loadingFriends ? (
                <View style={styles.friendsLoading}>
                  <ActivityIndicator color={ct.color} />
                </View>
              ) : friends.length === 0 ? (
                <Text style={[font('caption'), { color: COLORS.text3, paddingVertical: 12 }]}>
                  {t('share.no_friends', {
                    defaultValue: 'Add friends to send caps directly.',
                  })}
                </Text>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.friendsRow}
                >
                  {friends.map((f) => {
                    const on = selected.includes(f.id);
                    return (
                      <TouchableOpacity
                        key={f.id}
                        style={styles.friendItem}
                        activeOpacity={0.8}
                        onPress={() => toggleFriend(f.id)}
                      >
                        <View
                          style={[
                            styles.avatarWrap,
                            on && { borderColor: ct.color, borderWidth: 2 },
                          ]}
                        >
                          {f.avatar_url ? (
                            <Image source={{ uri: f.avatar_url }} style={styles.avatar} />
                          ) : (
                            <View style={[styles.avatar, styles.avatarFallback]}>
                              <Text style={[font('subtitle'), { color: COLORS.text2 }]}>
                                {initialsOf(f)}
                              </Text>
                            </View>
                          )}
                          {on && (
                            <View style={[styles.check, { backgroundColor: ct.color }]}>
                              <Ionicons name="checkmark" size={12} color={COLORS.white} />
                            </View>
                          )}
                        </View>
                        <Text
                          style={[font('caption'), { color: on ? COLORS.text : COLORS.text2 }]}
                          numberOfLines={1}
                        >
                          {f.display_name || f.username || '—'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              {selected.length > 0 && (
                <TouchableOpacity activeOpacity={0.9} onPress={sendToFriends} disabled={sending}>
                  <LinearGradient
                    colors={ct.gradient as any}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.sendCta}
                  >
                    {sending ? (
                      <ActivityIndicator color={COLORS.white} />
                    ) : (
                      <Text style={[font('bodyBold'), { color: COLORS.white }]}>
                        {t('share.send_to_n', {
                          defaultValue:
                            selected.length === 1
                              ? 'Send to 1 person  →'
                              : `Send to ${selected.length} people  →`,
                          count: selected.length,
                        })}
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              )}

              {/* ── Divider ── */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={[font('caption'), { color: COLORS.text3 }]}>
                  {t('share.or_publicly', { defaultValue: 'or share publicly' })}
                </Text>
                <View style={styles.dividerLine} />
              </View>

              {/* ── Public platforms ── */}
              <View style={styles.platformGrid}>
                {platforms.map((p) => (
                  <TouchableOpacity
                    key={p.key}
                    style={styles.platformCard}
                    activeOpacity={0.85}
                    onPress={p.onPress}
                  >
                    <LinearGradient
                      colors={p.gradient as any}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.platformIcon}
                    >
                      <Ionicons name={p.icon} size={22} color={COLORS.white} />
                    </LinearGradient>
                    <Text style={[font('caption'), { color: COLORS.text2 }]} numberOfLines={1}>
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      {/* ── Instagram Stories card (branded 9:16) ── */}
      {platformModal === 'instagram' && (
        <View style={[styles.igRoot, { backgroundColor: '#050810' }]}>
          <LinearGradient
            colors={[`${ct.color}1F`, '#050810', `${ct.color}14`]}
            style={StyleSheet.absoluteFill}
          />
          <TouchableOpacity
            style={[styles.modalClose, { top: insets.top + 12 }]}
            onPress={() => setPlatformModal(null)}
            hitSlop={8}
          >
            <Ionicons name="close" size={18} color={COLORS.white} />
          </TouchableOpacity>

          <ScrollView
            contentContainerStyle={styles.igScroll}
            showsVerticalScrollIndicator={false}
          >
            <View style={{ paddingTop: insets.top + 48, alignItems: 'center' }}>
              <Text style={[font('display'), { color: COLORS.text }]}>
                voor<Text style={{ color: COLORS.ember }}>cap</Text>
              </Text>
              <View style={[styles.igTypePill, { borderColor: ct.color }]}>
                <Text style={[font('eyebrow'), { color: ct.color }]}>{ct.name}</Text>
              </View>
            </View>

            <View style={styles.igCenter}>
              <VoorcapMark size={64} color={COLORS.text} dotColor={ct.color} />
              <Text style={[styles.igTitle]}>{title}</Text>
              {!!cap.location_name && (
                <Text style={[font('bodyBold'), { color: ct.color, marginTop: 8 }]}>
                  {cap.location_name}
                </Text>
              )}
              <Text style={[font('caption'), { color: COLORS.text2, marginTop: 6 }]}>
                {ct.name} · {ct.soul}
              </Text>
              {!!excerpt && (
                <Text style={styles.igExcerpt} numberOfLines={3}>
                  “{excerpt}”
                </Text>
              )}
            </View>

            <View style={styles.igFooter}>
              <View style={[styles.igRule, { backgroundColor: ct.color }]} />
              <Text style={[font('body'), { color: COLORS.text, marginTop: 12 }]}>
                {t('share.ig_cta', { defaultValue: 'Find caps near you' })}
              </Text>
              <Text style={[font('caption'), { color: COLORS.text3, marginTop: 4 }]}>
                {t('share.ig_download', { defaultValue: 'Download Voorcap' })}
              </Text>
            </View>
          </ScrollView>

          <View style={[styles.igActions, { paddingBottom: Math.max(insets.bottom, 24) }]}>
            <TouchableOpacity activeOpacity={0.9} onPress={shareNative}>
              <LinearGradient
                colors={ct.gradient as any}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.igPrimaryBtn}
              >
                <Ionicons name="share-outline" size={18} color={COLORS.white} />
                <Text style={[font('bodyBold'), { color: COLORS.white }]}>
                  {t('share.ig_save', { defaultValue: 'Save / Share image' })}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.igSecondaryBtn, { borderColor: `${ct.color}66` }]}
              activeOpacity={0.8}
              onPress={() =>
                openOrShare(
                  `instagram-stories://share?text=${encodeURIComponent(message)}`,
                )
              }
            >
              <Text style={[font('bodyBold'), { color: ct.color }]}>
                {t('share.ig_to_stories', { defaultValue: 'Share to Stories  →' })}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── X (Twitter) preview card ── */}
      {platformModal === 'x' && (
        <View style={styles.centerRoot}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setPlatformModal(null)}
          />
          <View style={styles.tweetCard}>
            <View style={styles.tweetHeader}>
              <View style={[styles.tweetAvatar, { backgroundColor: ct.color }]}>
                <Text style={[font('bodyBold'), { color: COLORS.white }]}>V</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[font('bodyBold'), { color: '#0F1419' }]}>Voorcap</Text>
                <Text style={[font('caption'), { color: '#536471' }]}>@voorcap</Text>
              </View>
              <Ionicons name="logo-twitter" size={20} color="#0F1419" />
            </View>
            <Text style={[font('subtitle'), { color: '#0F1419', marginTop: 10 }]}>{title}</Text>
            <Text style={[font('body'), { color: '#0F1419', marginTop: 6 }]}>
              {excerpt || ct.description}
            </Text>
            {!!cap.location_name && (
              <Text style={[font('bodyBold'), { color: ct.color, marginTop: 10 }]}>
                {cap.location_name}
              </Text>
            )}
            <Text style={[font('caption'), styles.tweetFooter]}>
              {t('share.x_tag', { defaultValue: 'Discovered on #voorcap' })}
            </Text>
            <TouchableOpacity
              style={styles.tweetBtn}
              activeOpacity={0.9}
              onPress={() =>
                openOrShare(
                  `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`,
                )
              }
            >
              <Text style={[font('bodyBold'), { color: COLORS.white }]}>
                {t('share.x_confirm', { defaultValue: 'Post on X' })}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── WhatsApp preview bubble ── */}
      {platformModal === 'whatsapp' && (
        <View style={[styles.waRoot, { backgroundColor: '#0A1F0A' }]}>
          <TouchableOpacity
            style={[styles.modalClose, { top: insets.top + 12 }]}
            onPress={() => setPlatformModal(null)}
            hitSlop={8}
          >
            <Ionicons name="close" size={18} color={COLORS.white} />
          </TouchableOpacity>

          <View style={styles.waCenter}>
            <View style={styles.waBubble}>
              {!!cap.location_name && (
                <Text style={[font('caption'), { color: 'rgba(255,255,255,0.6)' }]}>
                  {cap.location_name}
                </Text>
              )}
              <Text style={[font('bodyBold'), { color: COLORS.white, marginTop: 6 }]}>{title}</Text>
              <Text style={[font('body'), { color: COLORS.white, marginTop: 6 }]}>
                {excerpt || ct.description}
              </Text>
              <Text style={[font('caption'), { color: 'rgba(255,255,255,0.5)', marginTop: 8 }]}>
                {t('share.wa_tag', { defaultValue: 'Discovered on Voorcap' })}
              </Text>
              <Text style={[font('bodyBold'), { color: '#4FC3F7', marginTop: 6 }]}>
                {t('share.wa_open', { defaultValue: 'Open in Voorcap  →' })}
              </Text>
              <Text style={[font('micro'), styles.waTime]}>
                {t('share.wa_now', { defaultValue: 'just now' })} ✓✓
              </Text>
            </View>
          </View>

          <View style={[styles.waActions, { paddingBottom: Math.max(insets.bottom, 24) }]}>
            <TouchableOpacity
              style={styles.waBtn}
              activeOpacity={0.9}
              onPress={() =>
                openOrShare(`whatsapp://send?text=${encodeURIComponent(message)}`)
              }
            >
              <Ionicons name="logo-whatsapp" size={18} color={COLORS.white} />
              <Text style={[font('bodyBold'), { color: COLORS.white }]}>
                {t('share.wa_confirm', { defaultValue: 'Send on WhatsApp' })}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 10,
    maxHeight: '88%',
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.bg4, alignSelf: 'center', marginBottom: 14 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.bg3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preview: {
    backgroundColor: COLORS.bg2,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 18,
  },
  sectionLabel: { color: COLORS.text3, marginBottom: 10 },

  // Friends
  friendsLoading: { paddingVertical: 16, alignItems: 'center' },
  friendsRow: { gap: 14, paddingVertical: 2, paddingRight: 8 },
  friendItem: { alignItems: 'center', width: 60, gap: 6 },
  avatarWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderColor: 'transparent',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.bg3 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  check: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.card,
  },
  sendCta: {
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },

  // Divider
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 18 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: COLORS.border },

  // Public platforms
  platformGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  platformCard: { alignItems: 'center', gap: 8, flex: 1 },
  platformIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

  // Shared modal close button
  modalClose: {
    position: 'absolute',
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },

  // Instagram card
  igRoot: { flex: 1 },
  igScroll: { flexGrow: 1, paddingBottom: 160 },
  igTypePill: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  igCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 32 },
  igTitle: {
    ...font('display'),
    color: COLORS.text,
    textAlign: 'center',
    marginTop: 18,
    fontSize: 24,
    lineHeight: 30,
  },
  igExcerpt: {
    ...font('body'),
    color: COLORS.text2,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 14,
    maxWidth: 300,
  },
  igFooter: { alignItems: 'center', paddingHorizontal: 20, paddingBottom: 24 },
  igRule: { width: 60, height: 1, opacity: 0.4 },
  igActions: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: 'rgba(5,8,16,0.92)',
  },
  igPrimaryBtn: {
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  igSecondaryBtn: {
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },

  // X tweet card
  centerRoot: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  tweetCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, width: '100%', maxWidth: 360 },
  tweetHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tweetAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  tweetFooter: {
    color: '#536471',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E1E8ED',
  },
  tweetBtn: {
    height: 44,
    borderRadius: 12,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },

  // WhatsApp bubble
  waRoot: { flex: 1 },
  waCenter: { flex: 1, justifyContent: 'center' },
  waBubble: {
    backgroundColor: '#1F5C26',
    borderRadius: 18,
    borderTopLeftRadius: 4,
    padding: 16,
    margin: 20,
    maxWidth: '85%',
  },
  waTime: { color: 'rgba(255,255,255,0.4)', alignSelf: 'flex-end', marginTop: 8 },
  waActions: { paddingHorizontal: 20, paddingTop: 16 },
  waBtn: {
    height: 48,
    borderRadius: 14,
    backgroundColor: '#25D366',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});

export default ShareSheet;
