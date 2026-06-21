import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CapsuleService } from '../../services/capsuleService';
import CapsuleDetailModal from '../../components/CapsuleDetailModal';
import { COLORS, font } from '../../constants/theme';
import { useT } from '../../i18n';

interface CapScreenProps {
  capId?: string;
  onNavigate: (screen: string, data?: any) => void;
  onGoBack?: () => void;
}

/** Landing target for incoming deep links (voorcap://cap/<id>). */
const CapScreen = ({ capId, onGoBack }: CapScreenProps) => {
  const t = useT();
  const [cap, setCap] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(true);

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
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [capId]);

  const close = () => {
    setShow(false);
    onGoBack && onGoBack();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.ember} />
      </View>
    );
  }

  if (!cap) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.text3} />
        <Text style={[font('subtitle'), { color: COLORS.text2, marginTop: 12 }]}>{t('cap.notFound')}</Text>
        <TouchableOpacity style={styles.btn} onPress={() => onGoBack && onGoBack()}>
          <Text style={[font('label'), { color: '#fff' }]}>{t('cap.goBack')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CapsuleDetailModal visible={show} capsule={cap} onClose={close} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center', padding: 32 },
  btn: {
    marginTop: 16,
    backgroundColor: COLORS.ember,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
  },
});

export default CapScreen;
