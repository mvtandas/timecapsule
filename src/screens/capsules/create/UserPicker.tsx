import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING, font } from '../../../constants/theme';
import { supabase } from '../../../lib/supabase';
import { useT } from '../../../i18n';

export interface PickedUser { id: string; username?: string | null; display_name?: string | null; avatar_url?: string | null; isSelf?: boolean }

interface Props {
  selected: PickedUser[];          // selected users (single-item array when !multi)
  onChange: (users: PickedUser[]) => void;
  multi?: boolean;
  allowSelf?: boolean;
  accent?: string;
}

/** Search profiles and pick recipient(s) — recipient (whisper) or invitees (gathering). */
const UserPicker: React.FC<Props> = ({ selected, onChange, multi = false, allowSelf = false, accent = COLORS.ember }) => {
  const t = useT();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<PickedUser[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    const id = setTimeout(async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url')
          .or(`username.ilike.%${q.trim()}%,display_name.ilike.%${q.trim()}%`)
          .limit(12);
        if (active) setResults((data as any) || []);
      } catch { if (active) setResults([]); }
      finally { if (active) setLoading(false); }
    }, 280);
    return () => { active = false; clearTimeout(id); };
  }, [q]);

  const isPicked = (u: PickedUser) => selected.some((s) => s.id === u.id);
  const pick = (u: PickedUser) => {
    if (multi) {
      onChange(isPicked(u) ? selected.filter((s) => s.id !== u.id) : [...selected, u]);
    } else {
      onChange([u]); setQ('');
    }
  };

  return (
    <View>
      {/* selected */}
      {selected.length > 0 && (
        <View style={styles.chips}>
          {selected.map((u) => (
            <View key={u.id} style={[styles.chip, { borderColor: accent }]}>
              <Text style={styles.chipText} numberOfLines={1}>{u.isSelf ? t('createFlow.you') : (u.display_name || `@${u.username}`)}</Text>
              <TouchableOpacity onPress={() => onChange(selected.filter((s) => s.id !== u.id))} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Ionicons name="close-circle" size={16} color={COLORS.text2} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color={COLORS.text3} />
        <TextInput
          style={styles.input}
          value={q}
          onChangeText={setQ}
          placeholder={t('createFlow.searchPeople')}
          placeholderTextColor={COLORS.text3}
          autoCapitalize="none"
        />
        {loading && <ActivityIndicator size="small" color={accent} />}
      </View>

      {allowSelf && !q && !selected.length && (
        <SelfRow accent={accent} onPick={pick} label={t('createFlow.sendToSelf')} />
      )}

      {results.map((u) => (
        <TouchableOpacity key={u.id} style={styles.row} onPress={() => pick(u)} activeOpacity={0.8}>
          {u.avatar_url ? <Image source={{ uri: u.avatar_url }} style={styles.avatar} /> : <View style={styles.avatarFallback}><Ionicons name="person" size={16} color={COLORS.text2} /></View>}
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>{u.display_name || u.username}</Text>
            {!!u.username && <Text style={styles.handle} numberOfLines={1}>@{u.username}</Text>}
          </View>
          {isPicked(u) && <Ionicons name="checkmark-circle" size={20} color={accent} />}
        </TouchableOpacity>
      ))}
    </View>
  );
};

const SelfRow: React.FC<{ accent: string; onPick: (u: PickedUser) => void; label: string }> = ({ accent, onPick, label }) => {
  const [self, setSelf] = useState<PickedUser | null>(null);
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setSelf({ id: user.id, isSelf: true });
    })();
  }, []);
  if (!self) return null;
  return (
    <TouchableOpacity style={styles.row} onPress={() => onPick(self)} activeOpacity={0.8}>
      <View style={[styles.avatarFallback, { backgroundColor: `${accent}22` }]}><Ionicons name="bookmark" size={16} color={accent} /></View>
      <Text style={[styles.name, { flex: 1 }]}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.md },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.pill, backgroundColor: COLORS.bg3, borderWidth: 1, maxWidth: 180 },
  chipText: { ...font('label'), color: COLORS.text, flexShrink: 1 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.md, paddingVertical: 10, borderRadius: RADIUS.md, backgroundColor: COLORS.bg3, borderWidth: 1, borderColor: COLORS.border },
  input: { flex: 1, ...font('body'), color: COLORS.text, padding: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.bg3 },
  avatarFallback: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.bg3, alignItems: 'center', justifyContent: 'center' },
  name: { ...font('bodyBold'), color: COLORS.text },
  handle: { ...font('caption'), color: COLORS.text2 },
});

export default UserPicker;
