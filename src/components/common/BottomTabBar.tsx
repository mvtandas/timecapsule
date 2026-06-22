import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MaterialTopTabBarProps } from '@react-navigation/material-top-tabs';
import { COLORS, GRADIENTS, SPACING, RADIUS, SHADOWS, font } from '../../constants/theme';
import GlassView from './GlassView';
import { NotificationAppService } from '../../services/notificationService';
import { useT } from '../../i18n';

/**
 * Voorcap floating "Liquid Glass" tab bar (Home · Discover · Create+ · Activity ·
 * Profile). A detached, rounded, translucent capsule that hovers over content —
 * deliberately unlike the flat edge-to-edge Instagram bar. Create is a raised
 * ember gem that opens the create flow (a screen in the parent stack).
 */

type Slot = {
  route?: string; // tab route name; undefined => Create button
  labelKey: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon?: keyof typeof Ionicons.glyphMap;
};

const SLOTS: Slot[] = [
  { route: 'Home', labelKey: 'tabs.home', icon: 'home-outline', activeIcon: 'home' },
  { route: 'Discover', labelKey: 'tabs.discover', icon: 'compass-outline', activeIcon: 'compass' },
  { labelKey: '', icon: 'add' }, // Create
  { route: 'Activity', labelKey: 'tabs.activity', icon: 'heart-outline', activeIcon: 'heart' },
  { route: 'Profile', labelKey: 'tabs.profile', icon: 'person-outline', activeIcon: 'person' },
];

const BottomTabBar: React.FC<MaterialTopTabBarProps> = ({ state, navigation }) => {
  const t = useT();
  const insets = useSafeAreaInsets();
  const activeRoute = state.routes[state.index]?.name;
  const [unread, setUnread] = useState(0);

  // Poll the unread notification count for the Activity badge. Re-checks on a
  // light interval and whenever the user leaves the Activity tab (where they'd
  // have marked things read).
  useEffect(() => {
    let alive = true;
    const refresh = () => {
      NotificationAppService.getUnreadCount()
        .then((n) => { if (alive) setUnread(n); })
        .catch(() => {});
    };
    refresh();
    const id = setInterval(refresh, 30000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  // Clear the badge optimistically when the user opens Activity.
  useEffect(() => {
    if (activeRoute === 'Activity') setUnread(0);
  }, [activeRoute]);

  const openCreate = () => {
    navigation.getParent()?.navigate('Create' as never);
  };

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: insets.bottom > 0 ? insets.bottom : SPACING.md }]}
    >
      <GlassView radius={30} style={styles.capsule} sheen>
        <View style={styles.row}>
          {SLOTS.map((slot, i) => {
            if (!slot.route) {
              // Center slot is a spacer — the raised Create gem overlays it.
              return <View key={`spacer-${i}`} style={styles.tab} />;
            }
            const isActive = activeRoute === slot.route;
            return (
              <TouchableOpacity
                key={slot.route}
                style={styles.tab}
                onPress={() => navigation.navigate(slot.route as never)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={t(slot.labelKey)}
              >
                <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
                  <Ionicons
                    name={(isActive && slot.activeIcon) || slot.icon}
                    size={22}
                    color={isActive ? COLORS.ember : COLORS.text3}
                  />
                  {slot.route === 'Activity' && unread > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </GlassView>

      {/* Raised ember gem — a squircle, distinct from the IG white-circle "+" */}
      <View pointerEvents="box-none" style={styles.createLayer}>
        <TouchableOpacity
          onPress={openCreate}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={t('a11y.createCap')}
        >
          <LinearGradient
            colors={GRADIENTS.ember as readonly [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.createBtn, SHADOWS.glow(COLORS.ember)]}
          >
            <Ionicons name="add" size={28} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const BAR_H = 60;

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: SPACING.lg,
    right: SPACING.lg,
  },
  capsule: {
    height: BAR_H,
    ...SHADOWS.lg,
  },
  row: {
    flexDirection: 'row',
    height: BAR_H,
    alignItems: 'center',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: 6,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: COLORS.ember,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    ...font('micro'),
    color: '#fff',
    fontWeight: '700',
    fontSize: 10,
  },
  iconWrapActive: {
    backgroundColor: COLORS.emberSoft,
  },
  // Overlays the center spacer, raised so the gem pokes above the capsule.
  createLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  createBtn: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -16,
  },
});

export default BottomTabBar;
