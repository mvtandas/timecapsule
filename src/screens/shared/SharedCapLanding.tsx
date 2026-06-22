import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ImageBackground,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS, font, SHADOWS, SPACING, RADIUS } from '../../constants/theme';
import { getCapType } from '../../constants/capTypes';
import { CapsuleService } from '../../services/capsuleService';
import { supabase } from '../../lib/supabase';
import { VoorcapWordmark, VoorcapMark } from '../../components/common/VoorcapLogo';
import { useT } from '../../i18n';

interface SharedCapLandingProps {
  capId?: string;
  /** Proceed into the existing auth flow (e.g. 'Signup' | 'Login'). */
  onNavigate: (screen: string, data?: any) => void;
  onGoBack?: () => void;
}

/**
 * Pre-auth landing for a shared cap deep link (voorcap://cap/<id>).
 *
 * A logged-out visitor who opens a share link lands here instead of the plain
 * Welcome screen: they see a branded preview of the cap (cover / type / title /
 * location / owner, with "Sealed moment" framing) and prominent CTAs that lead
 * into the normal Signup / Login flow. The pending cap id is held by App.tsx,
 * so the cap opens automatically once they finish authenticating.
 */
const SharedCapLanding: React.FC<SharedCapLandingProps> = ({ capId, onNavigate }) => {
  const t = useT();
  const insets = useSafeAreaInsets();

  const [cap, setCap] = useState<any>(null);
  const [owner, setOwner] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!capId) {
        setLoading(false);
        return;
      }
      const { data } = await CapsuleService.getCapsule(capId);
      if (!active) return;
      setCap(data);
      if (data?.owner_id) {
        try {
          const { data: prof } = await supabase
            .from('profiles')
            .select('id, display_name, username, avatar_url')
            .eq('id', data.owner_id)
            .maybeSingle();
          if (active) setOwner(prof);
        } catch {
          // owner is optional — fall back to a generic label
        }
      }
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [capId]);

  const goSignup = () => onNavigate('Signup', capId ? { capId } : undefined);
  const goLogin = () => onNavigate('Login', capId ? { capId } : undefined);

  // ── Loading ───────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.center}>
        <VoorcapMark size={40} />
        <ActivityIndicator color={COLORS.ember} style={{ marginTop: 20 }} />
      </View>
    );
  }

  // ── Not found ─────────────────────────────────────────────────
  if (!cap) {
    return (
      <View style={[styles.center, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <Ionicons name="lock-closed-outline" size={48} color={COLORS.text3} />
        <Text style={[font('subtitle'), styles.notFoundTitle]}>
          {t('sharedLanding.notFoundTitle', { defaultValue: 'This moment isn’t available' })}
        </Text>
        <Text style={[font('body'), styles.notFoundBody]}>
          {t('sharedLanding.notFoundBody', {
            defaultValue: 'The cap may have been removed, or the link is no longer valid. Sign in to explore other sealed moments near you.',
          })}
        </Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={goSignup} activeOpacity={0.85}>
          <Text style={styles.primaryBtnText}>
            {t('sharedLanding.ctaSignup', { defaultValue: 'Sign up to open' })}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkBtn} onPress={goLogin} activeOpacity={0.7}>
          <Text style={[font('label'), { color: COLORS.text2 }]}>
            {t('sharedLanding.haveAccount', { defaultValue: 'I already have an account' })}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Preview ───────────────────────────────────────────────────
  const capType = getCapType(cap.type);
  const ownerName = owner?.username
    ? `@${String(owner.username).replace('@', '')}`
    : owner?.display_name || t('sharedLanding.someone', { defaultValue: 'someone' });
  const title = cap.title || t('sharedLanding.untitled', { defaultValue: 'A sealed moment' });
  const cover = cap.cover_photo_url || cap.media_url || null;
  const sealed = !!(cap.open_at && new Date(cap.open_at) > new Date());

  const HeroOverlay = (
    <>
      <View style={styles.heroTopRow} pointerEvents="none">
        <View style={[styles.typeBadge, { backgroundColor: capType.color }]}>
          <Ionicons name={capType.icon} size={11} color="#fff" />
          <Text style={styles.typeBadgeText}>
            {sealed
              ? t('sharedLanding.typeSealed', { defaultValue: '%{type} · Sealed', type: capType.name })
              : capType.name}
          </Text>
        </View>
        <VoorcapWordmark size={16} markSize={16} color="#fff" />
      </View>
      <View style={styles.heroBottom} pointerEvents="none">
        <Text style={styles.heroTitle} numberOfLines={3}>{title}</Text>
        <Text style={styles.heroOwner}>
          {t('sharedLanding.by', { defaultValue: 'by %{name}', name: ownerName })}
        </Text>
      </View>
    </>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + SPACING.xl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero — cover photo if present, otherwise the cap-type gradient. */}
        {cover ? (
          <ImageBackground source={{ uri: cover }} style={[styles.hero, { paddingTop: insets.top + SPACING.md }]}>
            <LinearGradient
              colors={['rgba(0,0,0,0.55)', 'transparent', 'rgba(11,14,19,0.96)']}
              locations={[0, 0.4, 1]}
              style={StyleSheet.absoluteFill}
            />
            {HeroOverlay}
          </ImageBackground>
        ) : (
          <LinearGradient
            colors={capType.gradient as readonly [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.hero, { paddingTop: insets.top + SPACING.md }]}
          >
            <LinearGradient
              colors={['rgba(0,0,0,0.35)', 'transparent', 'rgba(11,14,19,0.9)']}
              locations={[0, 0.45, 1]}
              style={StyleSheet.absoluteFill}
            />
            {HeroOverlay}
          </LinearGradient>
        )}

        <View style={styles.body}>
          {/* "Sealed moment" framing */}
          <View style={styles.framingRow}>
            <Ionicons
              name={sealed ? 'lock-closed' : 'sparkles'}
              size={14}
              color={capType.color}
            />
            <Text style={[font('eyebrow'), { color: capType.color }]}>
              {sealed
                ? t('sharedLanding.sealedEyebrow', { defaultValue: 'Sealed moment' })
                : t('sharedLanding.waitingEyebrow', { defaultValue: 'A moment is waiting' })}
            </Text>
          </View>

          {/* Location */}
          {cap.location_name ? (
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={15} color={COLORS.text3} />
              <Text style={[font('body'), { color: COLORS.text2 }]} numberOfLines={2}>
                {cap.location_name}
              </Text>
            </View>
          ) : null}

          {/* Soul / type description */}
          <Text style={[font('body'), styles.description]}>{capType.description}</Text>

          {/* CTA card */}
          <View style={styles.ctaCard}>
            <Text style={[font('subtitle'), styles.ctaTitle]}>
              {t('sharedLanding.ctaTitle', { defaultValue: 'Open this moment' })}
            </Text>
            <Text style={[font('body'), styles.ctaBody]}>
              {t('sharedLanding.ctaBody', {
                defaultValue: 'Log in or create a free account to unlock what %{name} sealed here.',
                name: ownerName,
              })}
            </Text>

            <TouchableOpacity style={styles.primaryBtn} onPress={goSignup} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>
                {t('sharedLanding.ctaSignup', { defaultValue: 'Sign up to open' })}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryBtn} onPress={goLogin} activeOpacity={0.85}>
              <Text style={styles.secondaryBtnText}>
                {t('sharedLanding.ctaLogin', { defaultValue: 'Log in to open' })}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Footer wordmark */}
          <View style={styles.footer}>
            <VoorcapWordmark size={15} markSize={15} color={COLORS.text2} />
            <Text style={[font('caption'), styles.footerTagline]}>
              {t('sharedLanding.tagline', { defaultValue: 'Location-based stories, sealed in time' })}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },

  // Hero
  hero: {
    minHeight: 320,
    paddingHorizontal: SPACING.lg,
    justifyContent: 'space-between',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
  },
  typeBadgeText: {
    ...font('eyebrow'),
    color: '#fff',
  },
  heroBottom: {
    paddingBottom: SPACING.xl,
  },
  heroTitle: {
    ...font('display'),
    fontSize: 30,
    lineHeight: 34,
    color: '#fff',
    marginBottom: SPACING.xs,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  heroOwner: {
    ...font('bodyBold'),
    color: 'rgba(255,255,255,0.92)',
  },

  // Body
  body: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  framingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING.md,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING.md,
  },
  description: {
    color: COLORS.text2,
    marginBottom: SPACING.xl,
  },

  // CTA card
  ctaCard: {
    backgroundColor: COLORS.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.borderLight,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  ctaTitle: {
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  ctaBody: {
    color: COLORS.text2,
    marginBottom: SPACING.lg,
  },
  primaryBtn: {
    width: '100%',
    height: 52,
    backgroundColor: COLORS.ember,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.sm,
    ...SHADOWS.glow(COLORS.ember),
  },
  primaryBtnText: {
    ...font('labelBold'),
    fontSize: 15,
    color: '#fff',
  },
  secondaryBtn: {
    width: '100%',
    height: 52,
    backgroundColor: COLORS.emberSoft,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginTop: SPACING.md,
  },
  secondaryBtnText: {
    ...font('labelBold'),
    fontSize: 15,
    color: COLORS.ember,
  },

  // Footer
  footer: {
    alignItems: 'center',
    gap: 6,
    paddingTop: SPACING.sm,
  },
  footerTagline: {
    color: COLORS.text3,
  },

  // Not found
  notFoundTitle: {
    color: COLORS.text,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  notFoundBody: {
    color: COLORS.text2,
    textAlign: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.xl,
    lineHeight: 20,
  },
  linkBtn: {
    marginTop: SPACING.lg,
    padding: SPACING.sm,
  },
});

export default SharedCapLanding;
