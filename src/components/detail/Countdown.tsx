import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACING, font } from '../../constants/theme';

/** Live hh:mm:ss countdown to a target ISO date (demo whisper/sealed countdown). */
const Countdown: React.FC<{ target: string; accent?: string }> = ({ target, accent = COLORS.ember }) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);

  const ms = new Date(target).getTime() - now;
  if (isNaN(ms) || ms <= 0) return null;
  const total = Math.floor(ms / 1000);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');

  const units: [number, string][] = d > 0 ? [[d, 'd'], [h, 'h'], [m, 'm'], [s, 's']] : [[h, 'h'], [m, 'm'], [s, 's']];

  return (
    <View style={styles.row}>
      {units.map(([n, label], i) => (
        <View key={label} style={styles.unit}>
          <Text style={[styles.num, { color: accent }]}>{pad(n)}</Text>
          <Text style={styles.label}>{label}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  unit: { minWidth: 46, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: RADIUS.md, paddingVertical: 8, paddingHorizontal: 6 },
  num: { ...font('title'), fontSize: 22 },
  label: { ...font('micro'), color: COLORS.text2, textTransform: 'uppercase', marginTop: 2 },
});

export default Countdown;
