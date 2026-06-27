import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Modal,
  Dimensions,
  StatusBar,
  FlatList,
  Animated,
  Alert,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { MediaService } from '../services/mediaService';
import CommentSheet from './CommentSheet';
import EditCapsuleSheet from './EditCapsuleSheet';
import ShareSheet from './ShareSheet';
import ReactionBar from './ReactionBar';
import { getMediaUrl, isLocked } from '../utils/mediaUtils';
import { formatDate, timeAgo } from '../utils/dateUtils';
import { ReportService, REPORT_REASONS } from '../services/reportService';
import { SavedService } from '../services/savedService';
import { CapsuleService } from '../services/capsuleService';
import { TrailService, TrailStop } from '../services/trailService';
import { GatheringService, Contribution } from '../services/gatheringService';
import ScrollRenderer from './detail/ScrollRenderer';
import Countdown from './detail/Countdown';
import AudioPlayer from './detail/AudioPlayer';
import { useProximity, ARRIVE_RADIUS_M } from '../hooks/useProximity';
import { openDirections } from '../utils/directions';
import { COLORS, font, GRADIENTS, SHADOWS } from '../constants/theme';
import { getCapType } from '../constants/capTypes';
import { DARK_MAP_STYLE } from '../constants/mapStyle';
import CapTypeBadge from './common/CapTypeBadge';
import { useT } from '../i18n';

const { width, height } = Dimensions.get('window');

// Reverse-geocode cache (rounded lat,lng → place) shared across all detail
// opens. The OS geocoder is rate-limited, so we cache and only call it when a
// cap has no stored location_name.
const geocodeCache = new Map<string, string>();

// Rough word count across scroll body blocks → drives the "N min read" byline.
function countScrollWords(blocks: any[]): number {
  if (!Array.isArray(blocks)) return 0;
  let s = '';
  blocks.forEach((b) => {
    if (typeof b?.text === 'string') s += ' ' + b.text;
    if (Array.isArray(b?.items)) s += ' ' + b.items.join(' ');
  });
  const trimmed = s.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

interface CapsuleDetailModalProps {
  visible: boolean;
  capsule: any;
  capsules?: any[];
  onClose: () => void;
  onOwnerPress?: (owner: any) => void;
  onExplore?: () => void;
}

// Single capsule story page
const CapsulePage = ({ item, onClose, onOwnerPress, onPause }: { item: any; onClose: () => void; onOwnerPress?: (owner: any) => void; onPause?: (paused: boolean) => void }) => {
  const t = useT();
  const [owner, setOwner] = useState<any>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [commentCount, setCommentCount] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [joinRequested, setJoinRequested] = useState(false);
  const [trailCompletions, setTrailCompletions] = useState(0);
  const [trailStarted, setTrailStarted] = useState(false);
  const [displayTitle, setDisplayTitle] = useState(item?.title || '');
  const [displayDescription, setDisplayDescription] = useState(item?.description || '');
  const [displayCategory, setDisplayCategory] = useState(item?.category || '');
  const [saved, setSaved] = useState(false);
  const [trailStops, setTrailStops] = useState<TrailStop[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [completed, setCompleted] = useState<number[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [contributionText, setContributionText] = useState('');
  const [addingPhoto, setAddingPhoto] = useState(false);
  const [submittingText, setSubmittingText] = useState(false);
  const [readProgress, setReadProgress] = useState(0);
  // Scroll: time-locked creator preview (demo SDetail) — owner flips into the reader.
  const [creatorPreview, setCreatorPreview] = useState(false);
  // Gathering: creator-side join requests (demo 4048-4062).
  const [joinRequests, setJoinRequests] = useState<any[]>([]);
  // Trail: timeline ↔ map toggle + tapped-marker highlight (demo TDetail 6838/7099).
  const [trailViewMode, setTrailViewMode] = useState<'timeline' | 'map'>('timeline');
  const [highlightStopIdx, setHighlightStopIdx] = useState<number | null>(null);
  // Trail: a freshly-opened stop reveals content before advancing (demo 6965/7324).
  const [openedStop, setOpenedStop] = useState<number | null>(null);
  // Gathering reveal overlay (demo "Break the Seal" 3623+) — guarded to fire once.
  const [showReveal, setShowReveal] = useState(false);
  const revealFiredRef = useRef(false);
  const revealScale = useRef(new Animated.Value(0.6)).current;
  const revealOpacity = useRef(new Animated.Value(0)).current;
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    setOwner(null);
    setAddress(null);
    setDisplayTitle(item?.title || '');
    setDisplayDescription(item?.description || '');
    setDisplayCategory(item?.category || '');
    setSaved(false);
    setTrailStops([]);
    setCurrentIdx(0);
    setCompleted([]);
    setContributions([]);
    setContributionText('');
    setJoinRequested(false);
    setTrailCompletions(0);
    setTrailStarted(false);
    setReadProgress(0);
    setCreatorPreview(false);
    setJoinRequests([]);
    setTrailViewMode('timeline');
    setHighlightStopIdx(null);
    setOpenedStop(null);
    setShowReveal(false);
    revealFiredRef.current = false;
    if (item?.owner_id) loadOwner(item.owner_id);
    // Prefer the cap's stored place name; only hit the (rate-limited) geocoder
    // when there's no name to show.
    if (item?.location_name) setAddress(item.location_name);
    else if (item?.lat && item?.lng) loadAddress(item.lat, item.lng);
    if (item?.id) loadCommentCount();
    if (item?.id) loadSaved();
    if (item?.id && item?.type === 'trail') { loadTrailStops(); loadTrailProgress(); loadTrailCompletions(); }
    if (item?.id && item?.type === 'gathering') loadContributions();
    checkOwnership();
  }, [item?.id]);

  // Creator-side join requests (demo 4048-4062): load once we know we're the owner.
  useEffect(() => {
    if (isOwner && item?.id && item?.type === 'gathering') loadJoinRequests();
  }, [isOwner, item?.id]);

  const loadJoinRequests = async () => {
    try {
      const rows = await GatheringService.listJoinRequests(item.id);
      setJoinRequests(rows);
    } catch (e) { if (__DEV__) console.error(e); }
  };

  const handleRespondJoin = async (requestId: string, approve: boolean) => {
    // Optimistic removal; reload to reconcile.
    setJoinRequests((prev) => prev.filter((r) => r.id !== requestId));
    try {
      await GatheringService.respondToJoinRequest(requestId, approve);
    } catch (e) { if (__DEV__) console.error(e); }
    loadJoinRequests();
  };

  // Gathering reveal overlay — ember glow + scale, ~2s, fires once per open cap.
  const playReveal = useCallback(() => {
    if (revealFiredRef.current) return;
    revealFiredRef.current = true;
    setShowReveal(true);
    revealScale.setValue(0.6);
    revealOpacity.setValue(0);
    Animated.sequence([
      Animated.parallel([
        Animated.timing(revealOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.spring(revealScale, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }),
      ]),
      Animated.delay(1300),
      Animated.timing(revealOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) setShowReveal(false);
    });
  }, [revealScale, revealOpacity]);

  const loadTrailCompletions = async () => {
    try {
      const n = await TrailService.getCompletionCount(item.id);
      setTrailCompletions(n);
    } catch (e) { if (__DEV__) console.error(e); }
  };

  const loadSaved = async () => {
    try {
      const s = await SavedService.isSaved(item.id);
      setSaved(s);
    } catch (e) { if (__DEV__) console.error(e); }
  };

  const toggleSaved = async () => {
    const prev = saved;
    setSaved(!prev); // optimistic
    const { saved: newSaved, error } = await SavedService.toggle(item.id);
    if (error) {
      setSaved(prev); // revert on failure
    } else {
      setSaved(newSaved);
    }
  };

  const loadTrailStops = async () => {
    try {
      const stops = await TrailService.getStops(item.id);
      setTrailStops(stops);
    } catch (e) { if (__DEV__) console.error(e); }
  };

  const loadTrailProgress = async () => {
    try {
      const p = await TrailService.getProgress(item.id);
      setCurrentIdx(p?.current_stop_idx ?? 0);
      setCompleted(p?.completed_stops ?? []);
      // A progress row means the user already started walking this trail.
      setTrailStarted(!!p);
    } catch (e) { if (__DEV__) console.error(e); }
  };

  const handleStartTrail = () => {
    setTrailStarted(true);
    // Persist a started-but-no-progress row so it shows in "Active trails".
    TrailService.setProgress(item.id, 0, []).catch(() => {});
  };

  const handleRequestJoin = async () => {
    setJoinRequested(true);
    try {
      await GatheringService.requestJoin(item.id);
    } catch (e) { if (__DEV__) console.error(e); }
  };

  const cur = trailStops[currentIdx];
  const trailActive = item?.type === 'trail' && currentIdx < trailStops.length;
  const { distanceM, withinRange, denied: stopDenied, unavailable: stopUnavailable } = useProximity(
    { lat: cur?.lat, lng: cur?.lng },
    trailActive,
  );

  // Open-to-advance (demo 6965/7324): opening reveals the stop's content + marks
  // it completed, but stays on the same stop. A separate "Continue" advances.
  const handleOpenStop = async () => {
    const nextCompleted = completed.includes(currentIdx) ? completed : [...completed, currentIdx];
    const isLast = currentIdx >= trailStops.length - 1;
    setCompleted(nextCompleted);
    setOpenedStop(currentIdx);
    try {
      // Mark completed; advance the persisted index only on the final stop so the
      // trail registers as finished (completed_at) without skipping the reveal.
      await TrailService.setProgress(item.id, isLast ? trailStops.length : currentIdx, nextCompleted, isLast);
    } catch (e) { if (__DEV__) console.error(e); }
    if (isLast) loadTrailCompletions();
  };

  const handleAdvanceStop = async () => {
    const nextIdx = currentIdx + 1;
    setCurrentIdx(nextIdx);
    setOpenedStop(null);
    try {
      await TrailService.setProgress(item.id, nextIdx, completed, nextIdx >= trailStops.length);
    } catch (e) { if (__DEV__) console.error(e); }
  };

  const loadContributions = async () => {
    try {
      const rows = await GatheringService.getContributions(item.id);
      setContributions(rows);
    } catch (e) { if (__DEV__) console.error(e); }
  };

  const handleAddContribution = async () => {
    const text = contributionText.trim();
    if (!text || addingPhoto || submittingText) return;
    setSubmittingText(true);
    const { error } = await GatheringService.addContribution(item.id, { text });
    setSubmittingText(false);
    if (error) {
      Alert.alert(t('capDetail.errorTitle'), t('capDetail.contributionFailed'));
      return;
    }
    setContributionText('');
    loadContributions();
  };

  const handleAddPhoto = async () => {
    if (addingPhoto) return;
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') return;
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 });
      if (r.canceled || !r.assets?.[0]) return;
      setAddingPhoto(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const up = await MediaService.uploadMedia(r.assets[0].uri, user.id, item.id);
      if (!up) {
        Alert.alert(t('capDetail.errorTitle'), t('capDetail.contributionFailed'));
        return;
      }
      const { error } = await GatheringService.addContribution(item.id, { media_url: up.url, media_type: up.type });
      if (error) {
        Alert.alert(t('capDetail.errorTitle'), t('capDetail.contributionFailed'));
        return;
      }
      loadContributions();
    } catch (e) {
      if (__DEV__) console.error('addPhoto', e);
      Alert.alert(t('capDetail.errorTitle'), t('capDetail.contributionFailed'));
    } finally {
      setAddingPhoto(false);
    }
  };

  const checkOwnership = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        if (item?.owner_id) setIsOwner(user.id === item.owner_id);
      }
    } catch (e) {
      // silently fail
    }
  };

  const handleMoreOptions = () => {
    Alert.alert(
      t('capDetail.options'),
      undefined,
      [
        {
          text: t('capDetail.reportCap'),
          onPress: () => {
            Alert.alert(
              t('capDetail.reportCap'),
              t('capDetail.selectReason'),
              [
                ...REPORT_REASONS.map((reason) => ({
                  text: reason,
                  onPress: async () => {
                    const { error } = await ReportService.reportContent('capsule', item.id, reason);
                    if (error) {
                      Alert.alert(t('capDetail.errorTitle'), t('capDetail.reportFailed'));
                    } else {
                      Alert.alert(t('capDetail.reportedTitle'), t('capDetail.reportedMsg'));
                    }
                  },
                })),
                { text: t('common.cancel'), style: 'cancel' },
              ]
            );
          },
        },
        {
          text: t('capDetail.blockUser'),
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              t('capDetail.blockUser'),
              t('capDetail.blockConfirm', { name: owner?.display_name || owner?.username || t('capDetail.thisUser') }),
              [
                { text: t('common.cancel'), style: 'cancel' },
                {
                  text: t('capDetail.block'),
                  style: 'destructive',
                  onPress: async () => {
                    if (!item?.owner_id) return;
                    const { error } = await ReportService.blockUser(item.owner_id);
                    if (error) {
                      Alert.alert(t('capDetail.errorTitle'), t('capDetail.blockFailed'));
                    } else {
                      Alert.alert(t('capDetail.blockedTitle'), t('capDetail.blockedMsg'));
                      onClose();
                    }
                  },
                },
              ]
            );
          },
        },
        { text: t('common.cancel'), style: 'cancel' },
      ]
    );
  };

  useEffect(() => {
    onPause?.(showComments || showEditSheet || showShare);
  }, [showComments, showEditSheet, showShare]);

  const loadCommentCount = async () => {
    const { CommentService } = require('../services/commentService');
    const count = await CommentService.getCommentCount(item.id);
    setCommentCount(count);
  };


  const loadOwner = async (ownerId: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url')
        .eq('id', ownerId)
        .maybeSingle();
      setOwner(data);
    } catch (e) { if (__DEV__) console.error(e); }
  };

  const loadAddress = async (lat: number, lng: number) => {
    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    const cached = geocodeCache.get(key);
    if (cached) { setAddress(cached); return; }
    try {
      const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (results.length > 0) {
        const a = results[0];
        const name = [a.city, a.region].filter(Boolean).join(', ');
        if (name) { geocodeCache.set(key, name); setAddress(name); }
      }
    } catch { /* OS geocoder rate-limit / offline — non-fatal, leave address unset */ }
  };

  const mediaUrl = getMediaUrl(item);
  const locked = isLocked(item?.open_at);

  // Distance lock — the core Voorcap mechanic: you must physically be near a
  // cap to open it. Owners can always preview; trails gate per-stop instead;
  // caps without coordinates aren't distance-gated.
  const distanceGated = !isOwner && item?.type !== 'trail' && item?.lat != null && item?.lng != null;
  const capProx = useProximity({ lat: item?.lat, lng: item?.lng }, distanceGated && !locked);
  const distanceLocked = distanceGated && !locked && !capProx.withinRange;
  const sealed = locked || distanceLocked;

  // Whisper recipient gate + self-whisper (demo 8114-8181).
  const isWhisper = item?.type === 'whisper';
  const isSelfWhisper = isWhisper && (
    item?.is_self_whisper ||
    (item?.owner_id && item?.recipient_id && item.owner_id === item.recipient_id)
  );
  // A normal (non-self) whisper's content is only for the addressed recipient or
  // the owner. Everyone else hits a gated state even after the cap is open.
  const whisperRecipientGated = isWhisper && !isSelfWhisper && !!item?.recipient_id
    && !isOwner && currentUserId !== item.recipient_id;

  // Record that the viewer opened this cap (powers Discover "Unopened" + profile "Opened").
  useEffect(() => {
    if (item?.id && !sealed && !isOwner) CapsuleService.recordOpen(item.id);
  }, [item?.id, sealed, isOwner]);

  // Gathering reveal — play once when a gathering is open (not sealed), guarded by a ref.
  useEffect(() => {
    if (item?.type === 'gathering' && !sealed && item?.id) playReveal();
  }, [item?.id, item?.type, sealed, playReveal]);

  // Gathering contribution visibility (mirrors the demo): open caps after seal
  // show all; while sealed, blind hides every contribution (even from the owner),
  // open mode lets the owner see all but others only their own.
  const visibleContributions = (() => {
    if (item?.type !== 'gathering') return contributions;
    if (!sealed) return contributions;
    if (item?.gathering_blind) return contributions.filter((c) => c.user_id === currentUserId);
    return isOwner ? contributions : contributions.filter((c) => c.user_id === currentUserId);
  })();
  const hiddenContributions = contributions.length - visibleContributions.length;

  // Scroll caps get a dedicated, vertically-scrollable article reader (the story
  // overlay can't show a long article). The locked state still uses the story layout.
  const isScrollCap = item?.type === 'scroll' && Array.isArray(item?.body) && item.body.length > 0;
  const scrollWords = isScrollCap ? countScrollWords(item.body) : 0;
  const readMin = Math.max(1, Math.round(scrollWords / 200));

  // Scroll creator preview (demo SDetail): an owner of a time-locked scroll can
  // flip into the reader early. `locked` here means time-locked (open_at in future).
  const scrollCreatorPreviewing = isScrollCap && locked && isOwner && creatorPreview;

  // Trail creator preview: an owner of a time-locked trail can preview their own
  // route early. Trails are time-gated only (sealed === locked); not distance-gated.
  const trailCreatorPreviewing = item?.type === 'trail' && locked && isOwner && creatorPreview;

  if (isScrollCap && (!sealed || scrollCreatorPreviewing)) {
    const cover = item.cover_photo_url || mediaUrl;
    return (
      <View style={styles.scrollPage}>
        <View style={styles.readProgressTrack}>
          <View style={[styles.readProgressFill, { width: `${Math.round(readProgress * 100)}%` }]} />
        </View>
        <View style={styles.scrollTopBar}>
          <TouchableOpacity
            style={styles.ownerRow}
            onPress={() => owner && onOwnerPress?.(owner)}
            disabled={!onOwnerPress || !owner}
            activeOpacity={0.8}
          >
            <View style={styles.avatarDark}>
              {owner?.avatar_url ? (
                <Image source={{ uri: owner.avatar_url }} style={styles.avatarImg} />
              ) : (
                <Ionicons name="person" size={16} color={COLORS.text2} />
              )}
            </View>
            <Text style={styles.scrollOwnerName} numberOfLines={1}>
              {owner?.display_name || owner?.username || '...'}
            </Text>
          </TouchableOpacity>
          <View style={styles.topBarRight}>
            {!isOwner && (
              <TouchableOpacity onPress={handleMoreOptions} style={styles.moreBtn}>
                <Ionicons name="ellipsis-vertical" size={22} color={COLORS.text} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={26} color={COLORS.text} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.scrollArticle}
          contentContainerStyle={styles.scrollArticleContent}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          onScroll={(e) => {
            const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
            const max = contentSize.height - layoutMeasurement.height;
            setReadProgress(max > 0 ? Math.min(1, Math.max(0, contentOffset.y / max)) : 0);
          }}
        >
          {scrollCreatorPreviewing && (
            <View style={styles.creatorPreviewBanner}>
              <Ionicons name="eye-outline" size={14} color={COLORS.ember} />
              <View style={{ flex: 1 }}>
                <Text style={styles.creatorPreviewLabel}>{t('capDetail.creatorPreview', { defaultValue: 'Creator preview' })}</Text>
                <Text style={styles.creatorPreviewSub}>
                  {t('capDetail.creatorPreviewSub', { defaultValue: 'Only you can see this. Readers see a sealed state until it opens.' })}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setCreatorPreview(false)} style={styles.creatorPreviewExit} activeOpacity={0.8}>
                <Text style={styles.creatorPreviewExitText}>{t('capDetail.exitPreview', { defaultValue: 'Exit preview' })}</Text>
              </TouchableOpacity>
            </View>
          )}
          {cover ? <Image source={{ uri: cover }} style={styles.scrollCover} resizeMode="cover" /> : null}
          <View style={styles.typeBadgeRow}>
            <CapTypeBadge type={item?.type} size="md" />
          </View>
          <Text style={styles.scrollTitle}>{displayTitle}</Text>
          <Text style={styles.scrollByline}>
            {[
              owner?.display_name || owner?.username || '',
              item?.created_at ? formatDate(item.created_at) : '',
              scrollWords > 0 ? t('capDetail.readTime', { min: readMin }) : '',
              item?.view_count > 0 ? t('capDetail.viewCount', { defaultValue: '%{n} reads', n: item.view_count }) : '',
            ].filter(Boolean).join('  ·  ')}
          </Text>
          <ScrollRenderer blocks={item.body} />

          {(displayDescription || address || scrollWords > 0) ? (
            <View style={styles.aboutBox}>
              <Text style={styles.aboutTitle}>{t('capDetail.aboutScroll')}</Text>
              {displayDescription ? <Text style={styles.aboutText}>{displayDescription}</Text> : null}
              {address ? (
                <View style={styles.aboutRow}>
                  <Ionicons name="location-outline" size={14} color={COLORS.text2} />
                  <Text style={styles.aboutMeta}>{address}</Text>
                </View>
              ) : null}
              {scrollWords > 0 ? <Text style={styles.aboutMeta}>{t('capDetail.wordCount', { n: scrollWords })}</Text> : null}
            </View>
          ) : null}

          <ReactionBar capsuleId={item.id} />

          <View style={styles.scrollActionRow}>
            <TouchableOpacity onPress={() => setShowComments(true)} style={styles.actionBtn} activeOpacity={0.7}>
              <Ionicons name="chatbubble-outline" size={22} color={COLORS.text} />
              {commentCount > 0 && <Text style={[styles.actionCount, { color: COLORS.text }]}>{commentCount}</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowShare(true)} style={styles.actionBtn} activeOpacity={0.7}>
              <Ionicons name="share-outline" size={22} color={COLORS.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleSaved} style={styles.actionBtn} activeOpacity={0.7}>
              <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={22} color={saved ? COLORS.ember : COLORS.text} />
            </TouchableOpacity>
            {isOwner && (
              <TouchableOpacity onPress={() => setShowEditSheet(true)} style={styles.actionBtn} activeOpacity={0.7}>
                <Ionicons name="pencil-outline" size={22} color={COLORS.text} />
              </TouchableOpacity>
            )}
            {item?.lat && item?.lng && (
              <TouchableOpacity onPress={() => openDirections(item.lat, item.lng, item.title)} style={styles.actionBtn} activeOpacity={0.7}>
                <Ionicons name="navigate" size={22} color={COLORS.text} />
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>

        <CommentSheet capsuleId={item.id} visible={showComments} onClose={() => setShowComments(false)} onCountChange={(c) => setCommentCount(c)} />
        <ShareSheet visible={showShare} cap={item} onClose={() => setShowShare(false)} />
        <EditCapsuleSheet
          capsuleId={item.id}
          visible={showEditSheet}
          onClose={() => setShowEditSheet(false)}
          initialTitle={displayTitle}
          initialDescription={displayDescription}
          initialCategory={displayCategory}
          onSaved={(updated) => {
            setDisplayTitle(updated.title);
            setDisplayDescription(updated.description);
            setDisplayCategory(updated.category);
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.page}>
      {/* Background image */}
      {mediaUrl && !sealed && !whisperRecipientGated && item?.media_type !== 'audio' ? (
        <Image source={{ uri: mediaUrl }} style={styles.bgImage} resizeMode="cover" />
      ) : (
        <View style={[styles.bgImage, { backgroundColor: COLORS.bg2 }]} />
      )}

      {/* Top gradient */}
      <LinearGradient colors={['rgba(0,0,0,0.55)', 'transparent']} style={styles.topGradient} />

      {/* Bottom gradient */}
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.65)']} style={styles.bottomGradient} />

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.ownerRow}
          onPress={() => owner && onOwnerPress?.(owner)}
          disabled={!onOwnerPress || !owner}
          activeOpacity={0.8}
        >
          <View style={styles.avatar}>
            {owner?.avatar_url ? (
              <Image source={{ uri: owner.avatar_url }} style={styles.avatarImg} />
            ) : (
              <Ionicons name="person" size={16} color="#fff" />
            )}
          </View>
          <Text style={styles.ownerName} numberOfLines={1}>
            {owner?.display_name || owner?.username || '...'}
          </Text>
          <Text style={styles.timeText}>{timeAgo(item.created_at)}</Text>
        </TouchableOpacity>
        <View style={styles.topBarRight}>
          {!isOwner && (
            <TouchableOpacity onPress={handleMoreOptions} style={styles.moreBtn}>
              <Ionicons name="ellipsis-vertical" size={22} color="#fff" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Center locked (time) — hidden while the owner previews their own trail
          so the lock overlay never overlaps the previewed timeline (B3 overlap). */}
      {locked && !trailCreatorPreviewing && (
        <View style={styles.centerContent}>
          <View style={styles.lockedCircle}>
            <Ionicons name="lock-closed" size={34} color={COLORS.ember} />
          </View>
          <Text style={styles.lockedTitle}>{t('capDetail.sealed')}</Text>
          {item.open_at && <Text style={styles.lockedDate}>{t('capDetail.opens', { date: formatDate(item.open_at) })}</Text>}
          {item.open_at && <Countdown target={item.open_at} />}
          {/* Owner-only note: only the creator can preview a sealed cap. */}
          {isOwner && (
            <View style={styles.ownerSealNote}>
              <Ionicons name="eye-outline" size={13} color={COLORS.ember} />
              <Text style={styles.ownerSealNoteText}>
                {t('capDetail.ownerSealNote', { defaultValue: "You're the creator — only you can preview this sealed cap" })}
              </Text>
            </View>
          )}
          {/* Scroll creator preview: flip into the article reader early. */}
          {isScrollCap && isOwner && (
            <TouchableOpacity
              style={styles.previewAsCreatorBtn}
              onPress={() => setCreatorPreview(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="eye-outline" size={16} color={COLORS.ember} />
              <Text style={styles.previewAsCreatorText}>
                {t('capDetail.previewAsCreator', { defaultValue: 'Preview as creator' })}
              </Text>
            </TouchableOpacity>
          )}
          {/* Trail creator preview: flip into the route timeline early. */}
          {item?.type === 'trail' && isOwner && (
            <TouchableOpacity
              style={styles.previewAsCreatorBtn}
              onPress={() => setCreatorPreview(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="eye-outline" size={16} color={COLORS.ember} />
              <Text style={styles.previewAsCreatorText}>
                {t('capDetail.previewAsCreator', { defaultValue: 'Preview as creator' })}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Center locked (distance) — walk here to open */}
      {!locked && distanceLocked && (
        <View style={styles.centerContent}>
          <View style={styles.lockedCircle}>
            <Ionicons name="walk" size={34} color={COLORS.ember} />
          </View>
          <Text style={styles.lockedTitle}>{t('capDetail.walkHere')}</Text>
          <Text style={styles.lockedSubtitle}>
            {t('capDetail.unlockOnArrival', { defaultValue: 'Its photo & message unlock when you arrive.' })}
          </Text>
          <Text style={styles.lockedDate}>
            {capProx.denied
              ? t('capDetail.locationNeeded')
              : capProx.unavailable
                ? t('capDetail.distanceUnknown')
                : capProx.distanceM == null
                  ? t('capDetail.locating')
                  : capProx.distanceM >= 1000
                    ? t('capDetail.kmAway', { km: (capProx.distanceM / 1000).toFixed(1) })
                    : t('capDetail.mAway', { m: Math.round(capProx.distanceM) })}
          </Text>
          {!capProx.denied && (
            <Text style={styles.lockedHint}>{t('capDetail.walkWithin', { m: ARRIVE_RADIUS_M })}</Text>
          )}
          {capProx.denied ? (
            <TouchableOpacity
              style={styles.takeMeThereBtn}
              onPress={() => Linking.openSettings()}
              activeOpacity={0.8}
            >
              <Ionicons name="location-outline" size={16} color="#fff" />
              <Text style={styles.takeMeThereText}>{t('capDetail.enableLocation', { defaultValue: 'Enable location' })}</Text>
            </TouchableOpacity>
          ) : item?.lat != null && item?.lng != null ? (
            <TouchableOpacity
              style={styles.takeMeThereBtn}
              onPress={() => openDirections(item.lat, item.lng, item.title)}
            >
              <Ionicons name="navigate" size={16} color="#fff" />
              <Text style={styles.takeMeThereText}>{t('capDetail.takeMeThere')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      {/* Center no media */}
      {!mediaUrl && !sealed && (
        <View style={styles.centerContent}>
          <Ionicons name="time-outline" size={52} color="rgba(255,255,255,0.4)" />
        </View>
      )}

      {/* Bottom content */}
      <View style={styles.bottomContent}>
        <View style={styles.typeBadgeRow}>
          <CapTypeBadge type={item?.type} size="md" />
        </View>
        <Text style={styles.title}>{displayTitle}</Text>

        {/* Self-whisper banner — "A letter to yourself" (demo 8125-8160). */}
        {isSelfWhisper && (
          <View style={styles.selfWhisperBanner}>
            <Ionicons name="time-outline" size={14} color={COLORS.ember} />
            <View style={{ flex: 1 }}>
              <Text style={styles.selfWhisperTo}>{t('capDetail.selfWhisperTo', { defaultValue: 'To: Future you' })}</Text>
              <Text style={styles.selfWhisperSub}>{t('capDetail.selfWhisperSub', { defaultValue: 'A letter to yourself' })}</Text>
            </View>
          </View>
        )}

        {/* Whisper recipient gate — not addressed to this viewer (demo 8114-8181). */}
        {whisperRecipientGated && !sealed ? (
          <View style={styles.whisperGate}>
            <Ionicons name="lock-closed" size={18} color={COLORS.text2} />
            <Text style={styles.whisperGateText}>
              {t('capDetail.whisperNotForYou', { defaultValue: "This whisper isn't addressed to you" })}
            </Text>
          </View>
        ) : item?.type === 'scroll' && Array.isArray(item?.body) && item.body.length ? (
          <ScrollRenderer blocks={item.body} />
        ) : displayDescription ? (
          <Text style={styles.description} numberOfLines={3}>{displayDescription}</Text>
        ) : null}
        {item?.media_type === 'audio' && mediaUrl && !sealed && !whisperRecipientGated && <AudioPlayer uri={mediaUrl} />}

        {/* Trail walking — only when the trail is open OR the owner is previewing.
            Gating by (!sealed || trailCreatorPreviewing) closes the non-owner
            pre-open leak (B4) and prevents the timeline overlapping the lock
            overlay (B3). */}
        {item?.type === 'trail' && trailStops.length > 0 && (!sealed || trailCreatorPreviewing) && (() => {
          const gold = getCapType('trail').color;
          const done = currentIdx >= trailStops.length;
          // Trail completion summary stats (demo 7446).
          const distanceLabel = item?.total_distance_km != null
            ? t('capDetail.kmAway', { km: Number(item.total_distance_km).toFixed(1) }).replace(/\s*away$/i, '')
            : null;
          const minutesValue = item?.total_minutes != null ? Number(item.total_minutes) : null;
          const timeLabel = minutesValue != null
            ? (minutesValue >= 60 ? `${Math.floor(minutesValue / 60)}h ${minutesValue % 60 > 0 ? `${minutesValue % 60}m` : ''}`.trim() : `${minutesValue}m`)
            : null;
          const stats = [
            { label: t('capDetail.statStops', { defaultValue: 'Stops' }), value: String(trailStops.length) },
            distanceLabel ? { label: t('capDetail.statDistance', { defaultValue: 'Distance' }), value: distanceLabel } : null,
            timeLabel ? { label: t('capDetail.statTime', { defaultValue: 'Time' }), value: timeLabel } : null,
          ].filter(Boolean) as { label: string; value: string }[];
          return (
            <ScrollView
              style={styles.trailBodyScroll}
              contentContainerStyle={styles.trailBodyScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
            <View style={styles.extraSection}>
              {/* Creator preview banner — owner is previewing a still-sealed trail. */}
              {trailCreatorPreviewing && (
                <View style={styles.creatorPreviewBanner}>
                  <Ionicons name="eye-outline" size={14} color={COLORS.ember} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.creatorPreviewLabel}>{t('capDetail.creatorPreview', { defaultValue: 'Creator preview' })}</Text>
                    <Text style={styles.creatorPreviewSub}>
                      {t('capDetail.creatorPreviewSub', { defaultValue: 'Only you can see this. Readers see a sealed state until it opens.' })}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setCreatorPreview(false)} style={styles.creatorPreviewExit} activeOpacity={0.8}>
                    <Text style={styles.creatorPreviewExitText}>{t('capDetail.exitPreview', { defaultValue: 'Exit preview' })}</Text>
                  </TouchableOpacity>
                </View>
              )}
              <Text style={styles.extraSectionTitle}>
                {done
                  ? t('capDetail.trailStopsCount', { count: trailStops.length })
                  : t('capDetail.trailStopProgress', { n: Math.min(currentIdx + 1, trailStops.length), count: trailStops.length })}
              </Text>

              {/* Opened progress bar (N of M opened) */}
              {!done && (
                <View style={styles.trailProgressWrap}>
                  <View style={styles.trailProgressTrack}>
                    <View style={[styles.trailProgressFill, { width: `${Math.round((completed.length / trailStops.length) * 100)}%`, backgroundColor: gold }]} />
                  </View>
                  <Text style={styles.trailProgressLabel}>{t('capDetail.stopsOpened', { done: completed.length, total: trailStops.length })}</Text>
                </View>
              )}

              {/* Completion summary — trophy + stats + completed-by (demo 7446) */}
              {done && (
                <View style={[styles.trailCompleteCard, { borderColor: gold }]}>
                  <View style={[styles.trailCompleteTrophy, { backgroundColor: `${gold}22` }]}>
                    <Ionicons name="trophy" size={30} color={gold} />
                  </View>
                  <Text style={styles.trailCompleteEyebrow}>{t('capDetail.trailComplete')}</Text>
                  <Text style={[styles.trailCompleteTitle, { color: COLORS.text }]} numberOfLines={2}>{displayTitle}</Text>
                  <Text style={styles.trailStopLocation}>{t('capDetail.trailCompleteSub')}</Text>
                  {stats.length > 0 && (
                    <View style={styles.trailStatsRow}>
                      {stats.map((s, i) => (
                        <View key={s.label} style={[styles.trailStat, i < stats.length - 1 && styles.trailStatDivider]}>
                          <Text style={styles.trailStatValue}>{s.value}</Text>
                          <Text style={[styles.trailStatLabel, { color: gold }]}>{s.label}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {trailCompletions > 1 && (
                    <Text style={styles.trailCompletedBy}>{t('capDetail.completedByOthers', { n: trailCompletions - 1 })}</Text>
                  )}
                </View>
              )}

              {/* Start gate — stop 1 stays locked until the walker starts */}
              {!done && !trailStarted && (
                <TouchableOpacity style={[styles.trailStartCard, { borderColor: gold }]} onPress={handleStartTrail} activeOpacity={0.85}>
                  <Ionicons name="footsteps-outline" size={22} color={gold} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.trailStartTitle, { color: gold }]}>{t('capDetail.readyToStart')}</Text>
                    <Text style={styles.trailStopLocation}>{t('capDetail.startTrailSub')}</Text>
                  </View>
                  <View style={[styles.trailStartBtn, { backgroundColor: gold }]}>
                    <Text style={styles.trailStartBtnText}>{t('capDetail.startTrail')}</Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* Timeline ↔ map toggle (demo TDetail 6838/7099) */}
              {!done && (
                <View style={styles.trailToggleRow}>
                  <TouchableOpacity
                    style={[styles.trailToggleBtn, trailViewMode === 'timeline' && { backgroundColor: gold, borderColor: gold }]}
                    onPress={() => setTrailViewMode('timeline')}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.trailToggleText, trailViewMode === 'timeline' && styles.trailToggleTextActive]}>
                      {t('capDetail.trailTimeline', { defaultValue: 'Timeline' })}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.trailToggleBtn, trailViewMode === 'map' && { backgroundColor: gold, borderColor: gold }]}
                    onPress={() => setTrailViewMode('map')}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.trailToggleText, trailViewMode === 'map' && styles.trailToggleTextActive]}>
                      {t('capDetail.trailMapView', { defaultValue: 'Map view' })}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Map view — numbered/colored markers per stop state (demo TrailMap 6186) */}
              {!done && trailViewMode === 'map' && (() => {
                const coordStops = trailStops.filter((s) => s.lat != null && s.lng != null);
                const first = coordStops[0];
                if (!first) {
                  return <Text style={styles.trailProgressLabel}>{t('capDetail.noStopCoords', { defaultValue: 'No stop locations to map yet.' })}</Text>;
                }
                return (
                  <MapView
                    ref={mapRef}
                    provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                    customMapStyle={DARK_MAP_STYLE}
                    style={styles.trailMap}
                    initialRegion={{
                      latitude: first.lat as number,
                      longitude: first.lng as number,
                      latitudeDelta: 0.04,
                      longitudeDelta: 0.04,
                    }}
                    showsUserLocation
                    showsMyLocationButton={false}
                    pitchEnabled={false}
                    rotateEnabled={false}
                  >
                    {trailStops.map((stop, idx) => {
                      if (stop.lat == null || stop.lng == null) return null;
                      const isDoneStop = completed.includes(idx);
                      const isCurrentStop = idx === currentIdx;
                      const markerColor = isDoneStop ? gold : isCurrentStop ? COLORS.ember : COLORS.text3;
                      const isHighlighted = highlightStopIdx === idx;
                      return (
                        <Marker
                          key={stop.id || idx}
                          coordinate={{ latitude: stop.lat as number, longitude: stop.lng as number }}
                          onPress={() => { setHighlightStopIdx(idx); setTrailViewMode('timeline'); }}
                          tracksViewChanges={false}
                        >
                          <View style={[
                            styles.trailMapMarker,
                            { backgroundColor: markerColor, borderColor: isHighlighted ? COLORS.text : '#000' },
                          ]}>
                            {isDoneStop ? (
                              <Ionicons name="checkmark" size={13} color="#000" />
                            ) : (
                              <Text style={[styles.trailMapMarkerText, isCurrentStop && { color: '#fff' }]}>{(stop.ordinal ?? idx) + 1}</Text>
                            )}
                          </View>
                        </Marker>
                      );
                    })}
                  </MapView>
                );
              })()}

              {!done && trailViewMode === 'timeline' && (
              <ScrollView style={styles.extraScroll} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                {trailStops.map((stop, idx) => {
                  const isDone = completed.includes(idx);
                  const isCurrent = idx === currentIdx && !done;
                  const isLockedStop = idx > currentIdx;
                  const hasCoords = stop.lat != null && stop.lng != null;
                  // A current stop just opened (content revealed, not yet advanced).
                  const justOpened = isCurrent && openedStop === idx;
                  const revealStop = isDone || justOpened;
                  const isHighlighted = highlightStopIdx === idx;
                  return (
                    <View
                      key={stop.id || idx}
                      style={[
                        styles.trailStopRow,
                        isCurrent && [styles.trailStopCurrent, { borderColor: gold }],
                        isHighlighted && { borderColor: COLORS.ember, borderWidth: 1.5, borderRadius: 12 },
                      ]}
                    >
                      <View
                        style={[
                          styles.trailStopNumber,
                          { borderColor: gold },
                          isDone && { backgroundColor: gold },
                          isLockedStop && styles.trailStopNumberLocked,
                        ]}
                      >
                        {isDone ? (
                          <Ionicons name="checkmark" size={14} color="#000" />
                        ) : isLockedStop ? (
                          <Ionicons name="lock-closed" size={12} color={COLORS.text3} />
                        ) : (
                          <Text style={[styles.trailStopNumberText, { color: gold }]}>
                            {stop.ordinal + 1}
                          </Text>
                        )}
                      </View>
                      <View style={styles.trailStopBody}>
                        {isLockedStop ? (
                          <Text style={[styles.trailStopTitle, styles.trailStopDimmed]} numberOfLines={1}>
                            {stop.title || t('capDetail.lockedStop')}
                          </Text>
                        ) : (
                          <>
                            {stop.title ? (
                              <Text style={styles.trailStopTitle} numberOfLines={1}>{stop.title}</Text>
                            ) : null}
                            {stop.location_name ? (
                              <Text style={styles.trailStopLocation} numberOfLines={1}>{stop.location_name}</Text>
                            ) : null}
                            {stop.estimated_minutes ? (
                              <Text style={styles.trailStopLocation}>{t('capDetail.estMinutes', { min: stop.estimated_minutes })}</Text>
                            ) : null}
                            {stop.photo_url ? (
                              (stop as any).media_type === 'video' ? (
                                <TouchableOpacity activeOpacity={0.85} onPress={() => Linking.openURL(stop.photo_url as string)}>
                                  <Image source={{ uri: stop.photo_url }} style={styles.trailStopPhoto} resizeMode="cover" />
                                  <View style={styles.trailStopPlay}>
                                    <Ionicons name="play-circle" size={40} color="#fff" />
                                  </View>
                                </TouchableOpacity>
                              ) : (
                                <Image source={{ uri: stop.photo_url }} style={styles.trailStopPhoto} resizeMode="cover" />
                              )
                            ) : null}
                            {/* Reveal the stop's payoff once it's been opened (arrived + tapped). */}
                            {revealStop && stop.content ? (
                              <Text style={styles.trailStopContent}>{stop.content}</Text>
                            ) : null}
                            {revealStop && stop.tip ? (
                              <View style={styles.trailTipBox}>
                                <Text style={styles.trailTipLabel}>{t('capDetail.proTip')}</Text>
                                <Text style={styles.trailTipText}>{stop.tip}</Text>
                              </View>
                            ) : null}
                          </>
                        )}

                        {isCurrent && !justOpened && hasCoords && (
                          <Text style={[styles.trailStopDistance, { color: withinRange ? gold : COLORS.text2 }]}>
                            {withinRange
                              ? t('capDetail.youreHere')
                              : distanceM != null
                                ? t('capDetail.mAwayShort', { m: Math.round(distanceM) })
                                : (stopDenied || stopUnavailable)
                                  ? t('capDetail.distanceUnknown')
                                  : t('capDetail.locating')}
                          </Text>
                        )}

                        {/* Open-to-advance (demo 6965/7324): open reveals content,
                            then a separate Continue button advances the trail. */}
                        {isCurrent && !justOpened && (
                          <View style={styles.trailStopActions}>
                            <TouchableOpacity
                              style={[
                                styles.trailOpenBtn,
                                { backgroundColor: gold },
                                !(trailStarted && (isOwner || withinRange || !hasCoords)) && styles.trailOpenBtnDisabled,
                              ]}
                              onPress={handleOpenStop}
                              disabled={!(trailStarted && (isOwner || withinRange || !hasCoords))}
                              activeOpacity={0.8}
                            >
                              <Text style={styles.trailOpenBtnText}>{t('capDetail.openThisStop')}</Text>
                            </TouchableOpacity>
                            {hasCoords && (
                              <TouchableOpacity
                                style={styles.trailDirBtn}
                                onPress={() => openDirections(stop.lat as number, stop.lng as number, stop.title || undefined)}
                                activeOpacity={0.8}
                              >
                                <Ionicons name="navigate" size={14} color={COLORS.text} />
                                <Text style={styles.trailDirBtnText}>{t('capDetail.directions')}</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        )}

                        {justOpened && (
                          <TouchableOpacity
                            style={[styles.trailContinueBtn, { backgroundColor: gold }]}
                            onPress={handleAdvanceStop}
                            activeOpacity={0.85}
                          >
                            <Text style={styles.trailContinueText}>
                              {idx < trailStops.length - 1
                                ? t('capDetail.continueToNext', { defaultValue: 'Continue to next stop →' })
                                : t('capDetail.finishTrail', { defaultValue: 'Finish trail →' })}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
              )}
            </View>
            </ScrollView>
          );
        })()}

        {/* Gathering contributions */}
        {item?.type === 'gathering' && (
          <View style={styles.extraSection}>
            <Text style={styles.extraSectionTitle}>{t('capDetail.gatheringCount', { count: contributions.length })}</Text>
            {visibleContributions.length > 0 ? (
              <ScrollView style={styles.extraScroll} keyboardShouldPersistTaps="handled">
                {visibleContributions.map((c, idx) => (
                  <View key={c.id || idx} style={styles.contributionRow}>
                    <Text style={styles.contributionAuthor} numberOfLines={1}>
                      {c.author?.display_name || c.author?.username || t('capDetail.someone')}
                    </Text>
                    {!!c.media_url && (
                      <Image source={{ uri: c.media_url }} style={styles.contributionImage} resizeMode="cover" />
                    )}
                    {!!(c.emoji || c.text) && (
                      <Text style={styles.contributionText}>
                        {c.emoji ? `${c.emoji} ` : ''}{c.text || ''}
                      </Text>
                    )}
                  </View>
                ))}
              </ScrollView>
            ) : null}
            {hiddenContributions > 0 && (
              <View style={styles.blindNote}>
                <Ionicons name="eye-off-outline" size={20} color={COLORS.text3} />
                <Text style={styles.blindNoteText}>{t('capDetail.gatheringHidden', { count: hiddenContributions })}</Text>
              </View>
            )}
            {!sealed && (
            <View style={styles.contributionInputRow}>
              <TouchableOpacity
                style={styles.contributionPhotoBtn}
                onPress={handleAddPhoto}
                disabled={addingPhoto}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={t('capDetail.addPhoto')}
              >
                {addingPhoto
                  ? <ActivityIndicator size="small" color={COLORS.ember} />
                  : <Ionicons name="image-outline" size={22} color={COLORS.ember} />}
              </TouchableOpacity>
              <TextInput
                style={styles.contributionInput}
                value={contributionText}
                onChangeText={setContributionText}
                placeholder={t('capDetail.addContributionPlaceholder')}
                placeholderTextColor={COLORS.text3}
                onFocus={() => onPause?.(true)}
                onBlur={() => onPause?.(false)}
              />
              <TouchableOpacity
                style={[styles.contributionAddBtn, submittingText && { opacity: 0.5 }]}
                onPress={handleAddContribution}
                disabled={submittingText}
                activeOpacity={0.8}
              >
                <Text style={styles.contributionAddText}>{t('capDetail.add')}</Text>
              </TouchableOpacity>
            </View>
            )}
            {!isOwner && item?.allow_join_requests && !!currentUserId && (
              <TouchableOpacity style={styles.joinBtn} onPress={handleRequestJoin} disabled={joinRequested} activeOpacity={0.85}>
                <Ionicons name={joinRequested ? 'checkmark-circle' : 'person-add-outline'} size={16} color={joinRequested ? COLORS.text2 : COLORS.ember} />
                <Text style={styles.joinBtnText}>{joinRequested ? t('capDetail.requestSent') : t('capDetail.requestToJoin')}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Gathering join requests (creator side) — demo 4048-4062. */}
        {isOwner && item?.type === 'gathering' && joinRequests.length > 0 && (
          <View style={styles.extraSection}>
            <Text style={styles.extraSectionTitle}>
              {t('capDetail.joinRequestsCount', { defaultValue: 'Join requests (%{count})', count: joinRequests.length })}
            </Text>
            <ScrollView style={styles.extraScroll} keyboardShouldPersistTaps="handled">
              {joinRequests.map((r, idx) => {
                const name = r.requester?.display_name || r.requester?.username || t('capDetail.someone');
                return (
                  <View key={r.id || idx} style={styles.joinRequestRow}>
                    <View style={styles.joinRequestAvatar}>
                      {r.requester?.avatar_url ? (
                        <Image source={{ uri: r.requester.avatar_url }} style={styles.joinRequestAvatarImg} />
                      ) : (
                        <Ionicons name="person" size={16} color={COLORS.purple} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.joinRequestName} numberOfLines={1}>{name}</Text>
                      {r.requester?.username ? (
                        <Text style={styles.joinRequestHandle} numberOfLines={1}>@{r.requester.username}</Text>
                      ) : null}
                    </View>
                    <TouchableOpacity
                      style={styles.joinDeclineBtn}
                      onPress={() => handleRespondJoin(r.id, false)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.joinDeclineText}>{t('capDetail.decline', { defaultValue: 'Decline' })}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.joinApproveBtn}
                      onPress={() => handleRespondJoin(r.id, true)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.joinApproveText}>{t('capDetail.approve', { defaultValue: 'Approve' })}</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Reactions */}
        <ReactionBar capsuleId={item.id} />

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity onPress={() => setShowComments(true)} style={styles.actionBtn} activeOpacity={0.7}>
            <Ionicons name="chatbubble-outline" size={22} color="#fff" />
            {commentCount > 0 && <Text style={styles.actionCount}>{commentCount}</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowShare(true)}
            style={styles.actionBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="share-outline" size={22} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity onPress={toggleSaved} style={styles.actionBtn} activeOpacity={0.7}>
            <Ionicons
              name={saved ? 'bookmark' : 'bookmark-outline'}
              size={22}
              color={saved ? COLORS.ember : '#fff'}
            />
          </TouchableOpacity>

          {isOwner && (
            <TouchableOpacity
              onPress={() => setShowEditSheet(true)}
              style={styles.actionBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="pencil-outline" size={22} color="#fff" />
            </TouchableOpacity>
          )}

          {item?.lat && item?.lng && (
            <TouchableOpacity
              onPress={() => openDirections(item.lat, item.lng, item.title)}
              style={styles.actionBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="navigate" size={22} color="#fff" />
              <Text style={styles.actionCount}>{t('capDetail.takeMeThere')}</Text>
            </TouchableOpacity>
          )}

          <View style={styles.actionSpacer} />

          {displayCategory && displayCategory !== 'general' && (
            <View style={styles.pill}>
              <Text style={styles.pillText}>{displayCategory}</Text>
            </View>
          )}

          {address && (
            <View style={styles.pill}>
              <Ionicons name="location-outline" size={13} color="#fff" />
              <Text style={styles.pillText} numberOfLines={1}>{address}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Comment Sheet */}
      <CommentSheet
        capsuleId={item.id}
        visible={showComments}
        onClose={() => setShowComments(false)}
        onCountChange={(count) => setCommentCount(count)}
      />

      {/* Share Sheet */}
      <ShareSheet visible={showShare} cap={item} onClose={() => setShowShare(false)} />

      {/* Edit Capsule Sheet */}
      <EditCapsuleSheet
        capsuleId={item.id}
        visible={showEditSheet}
        onClose={() => setShowEditSheet(false)}
        initialTitle={displayTitle}
        initialDescription={displayDescription}
        initialCategory={displayCategory}
        onSaved={(updated) => {
          setDisplayTitle(updated.title);
          setDisplayDescription(updated.description);
          setDisplayCategory(updated.category);
        }}
      />

      {/* Gathering reveal overlay — ember glow + scale, plays once (demo 3623+). */}
      {item?.type === 'gathering' && showReveal && (
        <Animated.View style={[styles.revealOverlay, { opacity: revealOpacity }]} pointerEvents="none">
          <Animated.View style={{ transform: [{ scale: revealScale }], alignItems: 'center' }}>
            <View style={styles.revealGlow}>
              <LinearGradient colors={GRADIENTS.gathering as any} style={styles.revealCircle}>
                <Ionicons name="people" size={40} color="#fff" />
              </LinearGradient>
            </View>
            <Text style={styles.revealEyebrow}>{t('capDetail.gatheringComplete', { defaultValue: 'The gathering is complete' })}</Text>
            <Text style={styles.revealTitle} numberOfLines={3}>{displayTitle}</Text>
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
};

const STORY_DURATION = 5000; // 5 seconds per capsule

const CapsuleDetailModal: React.FC<CapsuleDetailModalProps> = ({
  visible,
  capsule,
  capsules,
  onClose,
  onOwnerPress,
  onExplore,
}) => {
  const flatListRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const progressAnims = useRef<Animated.Value[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const list = capsules && capsules.length > 0 ? capsules : capsule ? [capsule] : [];

  const initialIndex = capsule && list.length > 1
    ? Math.max(0, list.findIndex((c: any) => c.id === capsule.id))
    : 0;

  // Initialize progress anims when list changes
  useEffect(() => {
    progressAnims.current = list.map(() => new Animated.Value(0));
  }, [list.length]);

  // Reset and start when modal opens
  useEffect(() => {
    if (visible && list.length > 0) {
      // Reset all bars
      progressAnims.current.forEach(a => a.setValue(0));
      // Fill completed bars before initial
      for (let i = 0; i < initialIndex; i++) {
        progressAnims.current[i]?.setValue(1);
      }
      setActiveIndex(initialIndex);

      // Scroll to initial
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: initialIndex, animated: false });
      }, 50);

      startTimer(initialIndex);
    }
    return () => stopTimer();
  }, [visible, capsule?.id]);

  const fillBarsUpTo = (index: number) => {
    progressAnims.current.forEach((a, i) => {
      if (i < index) a.setValue(1);
      else if (i > index) a.setValue(0);
    });
  };

  const startTimer = (index: number) => {
    stopTimer();
    fillBarsUpTo(index);
    // Scroll caps are a dedicated reader — never auto-advance off an article.
    if (list[index]?.type === 'scroll') return;
    const anim = progressAnims.current[index];
    if (!anim) return;

    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: STORY_DURATION,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        goToNext(index);
      }
    });
  };

  const stopTimer = () => {
    progressAnims.current.forEach(a => a.stopAnimation());
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const goToNext = (currentIndex: number) => {
    progressAnims.current[currentIndex]?.setValue(1);
    const next = currentIndex + 1;
    if (next >= list.length) {
      if (onExplore) {
        onExplore();
      } else {
        onClose();
      }
      return;
    }
    setActiveIndex(next);
    flatListRef.current?.scrollToIndex({ index: next, animated: true });
    startTimer(next);
  };

  const goToPrev = (currentIndex: number) => {
    progressAnims.current[currentIndex]?.setValue(0);
    const prev = currentIndex - 1;
    if (prev < 0) {
      startTimer(0);
      return;
    }
    progressAnims.current[prev]?.setValue(0);
    setActiveIndex(prev);
    flatListRef.current?.scrollToIndex({ index: prev, animated: true });
    startTimer(prev);
  };

  const handleScrollEnd = (e: any) => {
    const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
    if (newIndex !== activeIndex && newIndex >= 0 && newIndex < list.length) {
      setActiveIndex(newIndex);
      startTimer(newIndex);
    }
  };

  // Tap left/right to navigate (disabled when paused/comments open)
  const handleTap = (tapX: number) => {
    if (paused) return;
    // Don't hijack taps inside the scroll reader (links, scrolling, buttons).
    if (list[activeIndex]?.type === 'scroll') return;
    if (tapX < width * 0.3) {
      goToPrev(activeIndex);
    } else if (tapX > width * 0.7) {
      goToNext(activeIndex);
    }
  };

  if (!capsule) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={onClose}>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        {/* Progress bars */}
        {list.length > 1 && (
          <View style={styles.progressContainer}>
            {list.map((_, i) => (
              <View key={i} style={styles.progressBarBg}>
                <Animated.View
                  style={[
                    styles.progressBarFill,
                    {
                      width: progressAnims.current[i]
                        ? progressAnims.current[i].interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0%', '100%'],
                          })
                        : i < activeIndex ? '100%' : '0%',
                    },
                  ]}
                />
              </View>
            ))}
          </View>
        )}

        <FlatList
          ref={flatListRef}
          data={list}
          keyExtractor={(item, i) => item.id || String(i)}
          horizontal
          pagingEnabled
          scrollEnabled={!paused}
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
          onMomentumScrollEnd={handleScrollEnd}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => handleTap(e.nativeEvent.locationX)}
              style={{ width, height }}
            >
              <CapsulePage
                item={item}
                onClose={onClose}
                onOwnerPress={onOwnerPress}
                onPause={(p) => {
                  setPaused(p);
                  if (p) stopTimer();
                  else startTimer(activeIndex);
                }}
              />
            </TouchableOpacity>
          )}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  page: {
    width,
    height,
  },

  // Scroll cap — dedicated article reader
  scrollPage: {
    width,
    height,
    backgroundColor: COLORS.bg,
  },
  readProgressTrack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    zIndex: 30,
  },
  readProgressFill: {
    height: '100%',
    backgroundColor: COLORS.ember,
  },
  scrollTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: COLORS.bg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  avatarDark: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.bg3,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  scrollOwnerName: {
    ...font('label'),
    color: COLORS.text,
    marginLeft: 10,
    flexShrink: 1,
  },
  scrollArticle: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollArticleContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 140,
  },
  scrollCover: {
    width: '100%',
    height: 200,
    borderRadius: 14,
    marginBottom: 16,
    backgroundColor: COLORS.bg2,
  },
  scrollTitle: {
    ...font('display'),
    color: COLORS.text,
    marginTop: 6,
    marginBottom: 6,
  },
  scrollByline: {
    ...font('caption'),
    color: COLORS.text2,
    marginBottom: 16,
  },
  aboutBox: {
    marginTop: 24,
    padding: 16,
    borderRadius: 14,
    backgroundColor: COLORS.bg2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  aboutTitle: {
    ...font('eyebrow'),
    color: COLORS.text2,
    marginBottom: 8,
  },
  aboutText: {
    ...font('body'),
    color: COLORS.text,
    marginBottom: 8,
  },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  aboutMeta: {
    ...font('caption'),
    color: COLORS.text2,
  },
  scrollActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },

  // Background
  bgImage: {
    ...StyleSheet.absoluteFillObject,
    width,
    height,
    backgroundColor: COLORS.bg2,
  },

  // Gradients
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 150,
    zIndex: 1,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 260,
    zIndex: 1,
  },

  // Progress bars
  progressContainer: {
    position: 'absolute',
    top: 50,
    left: 12,
    right: 12,
    flexDirection: 'row',
    gap: 4,
    zIndex: 20,
  },
  progressBarBg: {
    flex: 1,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 2,
  },

  // Top bar
  topBar: {
    position: 'absolute',
    top: 60,
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
    gap: 8,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: COLORS.ember,
  },
  avatarImg: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.bg2,
  },
  ownerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  timeText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  moreBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Center
  centerContent: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  lockedCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: COLORS.emberSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 2,
    borderColor: COLORS.emberGlow,
  },
  lockedTitle: {
    ...font('subtitle'),
    fontSize: 18,
    color: '#fff',
  },
  lockedSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 24,
  },
  lockedDate: {
    fontSize: 14,
    color: COLORS.ember,
    marginTop: 8,
    fontWeight: '600',
  },
  lockedHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 4,
  },
  takeMeThereBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: COLORS.ember,
  },
  takeMeThereText: {
    ...font('label'),
    color: '#fff',
  },

  // Bottom
  bottomContent: {
    position: 'absolute',
    bottom: 44,
    left: 18,
    right: 18,
    zIndex: 10,
  },
  typeBadgeRow: {
    marginBottom: 8,
  },
  title: {
    ...font('title'),
    fontSize: 22,
    color: '#fff',
    letterSpacing: -0.3,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    marginBottom: 5,
  },
  description: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 20,
    marginBottom: 10,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  actionCount: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  actionSpacer: {
    flex: 1,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  pillText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },

  // Trail / Gathering sections
  extraSection: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  extraSectionTitle: {
    ...font('labelBold'),
    color: COLORS.text,
    marginBottom: 8,
  },
  extraScroll: {
    maxHeight: 180,
  },
  // Trail body wrapper — lets long trails (many stops / map open) scroll within
  // the modal instead of overflowing the bottom-anchored content and clipping
  // the start / map-toggle / progress controls off-screen (U4).
  trailBodyScroll: {
    maxHeight: height * 0.55,
    marginBottom: 10,
  },
  trailBodyScrollContent: {
    flexGrow: 1,
  },
  trailStopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  trailStopNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    backgroundColor: COLORS.bg3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trailStopNumberText: {
    fontSize: 12,
    fontWeight: '700',
  },
  trailStopBody: {
    flex: 1,
  },
  trailStopTitle: {
    ...font('bodyBold'),
    color: COLORS.text,
  },
  trailStopLocation: {
    ...font('caption'),
    color: COLORS.text2,
  },
  trailStopPhoto: { width: '100%', height: 120, borderRadius: 10, marginTop: 8, backgroundColor: COLORS.bg3 },
  trailStopPlay: { position: 'absolute', top: 8, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  trailStopContent: { ...font('body'), color: COLORS.text, marginTop: 8, lineHeight: 20 },
  trailTipBox: { marginTop: 8, padding: 10, borderRadius: 10, backgroundColor: 'rgba(212,162,76,0.12)', borderWidth: 1, borderColor: 'rgba(212,162,76,0.3)' },
  trailTipLabel: { ...font('eyebrow'), color: getCapType('trail').color, marginBottom: 2 },
  trailTipText: { ...font('caption'), color: COLORS.text, lineHeight: 17 },
  blindNote: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 16, paddingHorizontal: 14, backgroundColor: COLORS.bg3, borderRadius: 12 },
  blindNoteText: { ...font('caption'), color: COLORS.text2, flex: 1 },
  trailStopCurrent: {
    backgroundColor: COLORS.bg3,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 10,
    paddingVertical: 10,
    alignItems: 'flex-start',
    marginVertical: 2,
  },
  trailStopNumberLocked: {
    opacity: 0.5,
    borderColor: COLORS.text3,
  },
  trailStopDimmed: {
    color: COLORS.text3,
  },
  trailStopDistance: {
    ...font('caption'),
    fontWeight: '700',
    marginTop: 4,
  },
  trailStopActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  trailOpenBtn: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  trailOpenBtnDisabled: {
    opacity: 0.4,
  },
  trailOpenBtnText: {
    ...font('labelBold'),
    color: '#000',
  },
  trailDirBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.bg2,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  trailDirBtnText: {
    ...font('label'),
    color: COLORS.text,
  },
  trailCompleteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  trailCompleteTitle: {
    ...font('bodyBold'),
  },
  trailProgressWrap: { marginBottom: 12 },
  trailProgressTrack: { height: 6, borderRadius: 3, backgroundColor: COLORS.bg3, overflow: 'hidden' },
  trailProgressFill: { height: '100%', borderRadius: 3 },
  trailProgressLabel: { ...font('caption'), color: COLORS.text2, marginTop: 6 },
  trailCompleteCard: {
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    gap: 6,
  },
  trailCompleteTrophy: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  trailCompletedBy: { ...font('caption'), color: COLORS.text2, marginTop: 4 },
  trailStartCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  trailStartTitle: { ...font('bodyBold') },
  trailStartBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999 },
  trailStartBtnText: { ...font('label'), color: '#000', fontWeight: '700' },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.ember,
  },
  joinBtnText: { ...font('label'), color: COLORS.ember },
  contributionRow: {
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  contributionAuthor: {
    ...font('labelBold'),
    color: COLORS.text,
    marginBottom: 2,
  },
  contributionText: {
    ...font('body'),
    color: COLORS.text2,
  },
  contributionImage: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    marginTop: 4,
    backgroundColor: COLORS.bg3,
  },
  contributionPhotoBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.bg3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contributionInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  contributionInput: {
    flex: 1,
    backgroundColor: COLORS.bg3,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: COLORS.text,
    ...font('body'),
  },
  contributionAddBtn: {
    backgroundColor: COLORS.ember,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  contributionAddText: {
    ...font('labelBold'),
    color: '#fff',
  },

  // ── Whisper recipient gate + self-whisper (demo 8114-8181) ──
  selfWhisperBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: COLORS.emberSoft,
    borderWidth: 1,
    borderColor: COLORS.emberGlow,
    marginBottom: 10,
  },
  selfWhisperTo: { ...font('labelBold'), color: COLORS.ember },
  selfWhisperSub: { ...font('caption'), color: COLORS.text2 },
  whisperGate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.35)',
    marginBottom: 10,
  },
  whisperGateText: { ...font('body'), color: COLORS.text2, flex: 1 },
  ownerSealNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: COLORS.emberSoft,
    borderWidth: 1,
    borderColor: COLORS.emberGlow,
    maxWidth: width - 60,
  },
  ownerSealNoteText: { ...font('caption'), color: COLORS.ember, flex: 1, textAlign: 'center' },

  // ── Scroll creator preview (demo SDetail) ──
  previewAsCreatorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.ember,
  },
  previewAsCreatorText: { ...font('label'), color: COLORS.ember },
  creatorPreviewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    backgroundColor: COLORS.emberSoft,
    borderWidth: 1,
    borderColor: COLORS.emberGlow,
    marginBottom: 14,
  },
  creatorPreviewLabel: { ...font('eyebrow'), color: COLORS.ember },
  creatorPreviewSub: { ...font('caption'), color: COLORS.text2, marginTop: 2 },
  creatorPreviewExit: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.emberGlow,
  },
  creatorPreviewExitText: { ...font('label'), color: COLORS.ember },

  // ── Gathering join requests (demo 4048-4062) ──
  joinRequestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  joinRequestAvatar: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: `${COLORS.purple}25`,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  joinRequestAvatarImg: { width: 36, height: 36, borderRadius: 11 },
  joinRequestName: { ...font('bodyBold'), color: COLORS.text },
  joinRequestHandle: { ...font('caption'), color: COLORS.text3 },
  joinDeclineBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.bg3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  joinDeclineText: { ...font('label'), color: COLORS.text2 },
  joinApproveBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.purple,
  },
  joinApproveText: { ...font('label'), color: '#fff' },

  // ── Gathering reveal overlay (demo 3623+) ──
  revealOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
    backgroundColor: 'rgba(4,6,10,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  revealGlow: {
    marginBottom: 28,
    borderRadius: 60,
    ...SHADOWS.glow(COLORS.ember),
  },
  revealCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  revealEyebrow: { ...font('eyebrow'), color: COLORS.purple, textAlign: 'center', marginBottom: 10 },
  revealTitle: { ...font('display'), color: COLORS.text, textAlign: 'center' },

  // ── Trail map toggle + map + completion stats (demo 6838/7099/7446/6186) ──
  trailToggleRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  trailToggleBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 9,
    backgroundColor: COLORS.bg3,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  trailToggleText: { ...font('label'), color: COLORS.text2 },
  trailToggleTextActive: { color: '#fff' },
  trailMap: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 4,
  },
  trailMapMarker: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trailMapMarkerText: { ...font('labelBold'), color: '#000' },
  trailCompleteEyebrow: { ...font('eyebrow'), color: getCapType('trail').color, marginBottom: 2 },
  trailStatsRow: {
    flexDirection: 'row',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(212,162,76,0.25)',
    alignSelf: 'stretch',
  },
  trailStat: { flex: 1, alignItems: 'center' },
  trailStatDivider: { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: COLORS.border },
  trailStatValue: { ...font('title'), color: COLORS.text },
  trailStatLabel: { ...font('eyebrow'), marginTop: 4 },
  trailContinueBtn: {
    marginTop: 10,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  trailContinueText: { ...font('labelBold'), color: '#000' },
});

export default CapsuleDetailModal;
