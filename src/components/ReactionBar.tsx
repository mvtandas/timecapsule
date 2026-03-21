import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { REACTIONS, ReactionService, ReactionSummary } from '../services/reactionService';

interface ReactionBarProps {
  capsuleId: string;
  compact?: boolean;
}

const ReactionBar: React.FC<ReactionBarProps> = ({ capsuleId, compact }) => {
  const [reactions, setReactions] = useState<ReactionSummary[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    loadReactions();
  }, [capsuleId]);

  const loadReactions = async () => {
    const data = await ReactionService.getReactions(capsuleId);
    setReactions(data);
  };

  const handleReaction = async (emoji: string) => {
    // Optimistic update
    setReactions(prev => {
      const existing = prev.find(r => r.reaction === emoji);
      if (existing?.reacted) {
        return prev.map(r =>
          r.reaction === emoji ? { ...r, count: r.count - 1, reacted: false } : r
        ).filter(r => r.count > 0);
      } else {
        const withoutOld = prev.map(r =>
          r.reacted ? { ...r, count: r.count - 1, reacted: false } : r
        ).filter(r => r.count > 0);

        const target = withoutOld.find(r => r.reaction === emoji);
        if (target) {
          return withoutOld.map(r =>
            r.reaction === emoji ? { ...r, count: r.count + 1, reacted: true } : r
          );
        }
        return [...withoutOld, { reaction: emoji, count: 1, reacted: true }];
      }
    });

    setShowPicker(false);
    await ReactionService.toggleReaction(capsuleId, emoji);
  };

  const togglePicker = () => {
    if (showPicker) {
      Animated.timing(scaleAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => setShowPicker(false));
    } else {
      setShowPicker(true);
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 100, friction: 8 }).start();
    }
  };

  const totalCount = reactions.reduce((sum, r) => sum + r.count, 0);
  const userReacted = reactions.some(r => r.reacted);

  return (
    <View style={styles.container}>
      {/* Reaction pills */}
      <View style={styles.reactionsRow}>
        {reactions.map(r => (
          <TouchableOpacity
            key={r.reaction}
            style={[styles.reactionPill, r.reacted && styles.reactionPillActive]}
            onPress={() => handleReaction(r.reaction)}
            activeOpacity={0.7}
          >
            <Text style={styles.reactionEmoji}>{r.reaction}</Text>
            <Text style={[styles.reactionCount, r.reacted && styles.reactionCountActive]}>{r.count}</Text>
          </TouchableOpacity>
        ))}

        {/* Add reaction button */}
        <TouchableOpacity style={styles.addButton} onPress={togglePicker} activeOpacity={0.7}>
          <Text style={styles.addButtonText}>{userReacted ? '😊' : '+'}</Text>
        </TouchableOpacity>
      </View>

      {/* Reaction count text */}
      {totalCount > 0 && (
        <Text style={styles.reactionCountText}>
          {totalCount} {totalCount === 1 ? 'reaction' : 'reactions'}
        </Text>
      )}

      {/* Emoji picker */}
      {showPicker && (
        <Animated.View style={[styles.picker, { transform: [{ scale: scaleAnim }] }]}>
          {REACTIONS.map(emoji => (
            <TouchableOpacity
              key={emoji}
              style={styles.pickerItem}
              onPress={() => handleReaction(emoji)}
              activeOpacity={0.7}
            >
              <Text style={styles.pickerEmoji}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  reactionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  reactionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  reactionPillActive: {
    backgroundColor: 'rgba(250,198,56,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(250,198,56,0.4)',
  },
  reactionEmoji: {
    fontSize: 16,
  },
  reactionCount: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
  },
  reactionCountActive: {
    color: '#FAC638',
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 16,
    color: '#fff',
  },
  picker: {
    flexDirection: 'row',
    backgroundColor: 'rgba(30,30,50,0.95)',
    borderRadius: 24,
    padding: 8,
    gap: 4,
    position: 'absolute',
    bottom: 44,
    left: 0,
  },
  pickerItem: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerEmoji: {
    fontSize: 24,
  },
  reactionCountText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
    fontWeight: '500',
  },
});

export default ReactionBar;
