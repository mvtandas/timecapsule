import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  Keyboard,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CommentService, CommentWithProfile } from '../services/commentService';
import { ReportService, REPORT_REASONS } from '../services/reportService';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { timeAgo } from '../utils/dateUtils';
import { COLORS, font } from '../constants/theme';
import { useT } from '../i18n';

const { height } = Dimensions.get('window');
const SHEET_HEIGHT = height * 0.55;

interface CommentSheetProps {
  capsuleId: string;
  visible: boolean;
  onClose: () => void;
  onCountChange?: (count: number) => void;
}

const CommentSheet: React.FC<CommentSheetProps> = ({ capsuleId, visible, onClose, onCountChange }) => {
  const t = useT();
  const { user } = useAuthStore();
  const [comments, setComments] = useState<CommentWithProfile[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionResults, setMentionResults] = useState<any[]>([]);
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const flatListRef = useRef<FlatList>(null);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    if (visible) {
      loadComments();
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 10,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: SHEET_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
    return () => {
      translateY.stopAnimation();
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [visible]);

  const loadComments = async () => {
    setLoading(true);
    const { data } = await CommentService.getComments(capsuleId);
    if (isMounted.current) {
      setComments(data);
      setLoading(false);
      setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
    }
  };

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    Keyboard.dismiss();
    const { data, error } = await CommentService.addComment(capsuleId, text.trim());
    if (!error && data) {
      const updated = [...comments, data as any];
      setComments(updated);
      setText('');
      onCountChange?.(updated.length);
      setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
    }
    setSending(false);
  };

  const handleDelete = (comment: CommentWithProfile) => {
    Alert.alert(t('comments.delete_title'), t('comments.delete_message'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          const { error } = await CommentService.deleteComment(comment.id);
          if (!error) {
            const updated = comments.filter(c => c.id !== comment.id);
            setComments(updated);
            onCountChange?.(updated.length);
          }
        },
      },
    ]);
  };

  const handleReportComment = (comment: CommentWithProfile) => {
    Alert.alert(
      t('comments.report_title'),
      t('comments.report_message'),
      [
        ...REPORT_REASONS.map((reason) => ({
          text: reason,
          onPress: async () => {
            const { error } = await ReportService.reportContent('comment', comment.id, reason);
            if (error) {
              Alert.alert(t('comments.error_title'), t('comments.report_error_message'));
            } else {
              Alert.alert(t('comments.report_success_title'), t('comments.report_success_message'));
            }
          },
        })),
        { text: t('common.cancel'), style: 'cancel' },
      ]
    );
  };

  const handleLongPress = (comment: CommentWithProfile) => {
    const isOwn = user?.id === comment.user_id;

    if (isOwn) {
      Alert.alert(t('comments.action_sheet_title'), undefined, [
        {
          text: t('comments.action_copy'),
          onPress: () => {
            // Could use Clipboard.setStringAsync but keeping simple
          },
        },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => handleDelete(comment),
        },
        { text: t('common.cancel'), style: 'cancel' },
      ]);
    } else {
      Alert.alert(t('comments.action_sheet_title'), undefined, [
        {
          text: t('comments.action_copy'),
          onPress: () => {
            // Could use Clipboard.setStringAsync but keeping simple
          },
        },
        {
          text: t('comments.action_report'),
          style: 'destructive',
          onPress: () => handleReportComment(comment),
        },
        { text: t('common.cancel'), style: 'cancel' },
      ]);
    }
  };

  const renderCommentContent = (content: string) => {
    const parts = content.split(/(@\w+)/g);
    return parts.map((part, i) => {
      if (part.match(/^@\w+$/)) {
        return <Text key={i} style={{ color: COLORS.ember, fontWeight: '600' }}>{part}</Text>;
      }
      return part;
    });
  };

  const handleTextChange = (newText: string) => {
    setText(newText);

    // Check for @mention
    const match = newText.match(/@(\w*)$/);
    if (match && match[1].length >= 1) {
      const query = match[1].toLowerCase();
      setMentionQuery(query);

      if (searchTimeout.current) clearTimeout(searchTimeout.current);
      searchTimeout.current = setTimeout(async () => {
        const { data } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url')
          .ilike('username', `${query}%`)
          .limit(5);
        if (isMounted.current) {
          setMentionResults((data as any[]) || []);
        }
      }, 300);
    } else {
      setMentionQuery(null);
      setMentionResults([]);
    }
  };

  const insertMention = (username: string) => {
    const newText = text.replace(/@(\w*)$/, `@${username} `);
    setText(newText);
    setMentionQuery(null);
    setMentionResults([]);
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
          keyboardVerticalOffset={0}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.handleBar} />
            <Text style={styles.headerTitle}>
              {comments.length > 0
                ? t('comments.title_with_count', { count: comments.length })
                : t('comments.title')}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.headerClose}>
              <Ionicons name="close" size={22} color={COLORS.text2} />
            </TouchableOpacity>
          </View>

          {/* Comments list */}
          <FlatList
            ref={flatListRef}
            data={comments}
            keyExtractor={(item) => item.id}
            style={styles.list}
            contentContainerStyle={comments.length === 0 ? styles.emptyContainer : undefined}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>{loading ? t('comments.loading') : t('comments.empty_title')}</Text>
                <Text style={styles.emptySubtext}>{t('comments.empty_subtitle')}</Text>
              </View>
            }
            renderItem={({ item }) => {
              const isOwn = user?.id === item.user_id;
              return (
                <TouchableOpacity
                  style={styles.commentRow}
                  onLongPress={() => handleLongPress(item)}
                  activeOpacity={0.7}
                  delayLongPress={400}
                >
                  <View style={styles.commentAvatar}>
                    {item.profiles?.avatar_url ? (
                      <Image source={{ uri: item.profiles.avatar_url }} style={styles.commentAvatarImg} />
                    ) : (
                      <Ionicons name="person" size={14} color={COLORS.text2} />
                    )}
                  </View>
                  <View style={styles.commentContent}>
                    <Text style={styles.commentText}>
                      <Text style={styles.commentUsername}>
                        {item.profiles?.username || item.profiles?.display_name || t('comments.unknown_user')}
                      </Text>
                      {'  '}{renderCommentContent(item.content)}
                    </Text>
                    <View style={styles.commentMeta}>
                      <Text style={styles.commentTime}>{timeAgo(item.created_at)}</Text>
                      {isOwn && (
                        <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <Ionicons name="trash-outline" size={14} color={COLORS.text3} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
          />

          {/* Mention Autocomplete */}
          {mentionResults.length > 0 && (
            <View style={styles.mentionList}>
              {mentionResults.map((u) => (
                <TouchableOpacity
                  key={u.id}
                  style={styles.mentionItem}
                  onPress={() => insertMention(u.username)}
                >
                  <View style={styles.mentionAvatar}>
                    {u.avatar_url ? (
                      <Image source={{ uri: u.avatar_url }} style={styles.mentionAvatarImg} />
                    ) : (
                      <Ionicons name="person" size={12} color={COLORS.text2} />
                    )}
                  </View>
                  <Text style={styles.mentionUsername}>@{u.username}</Text>
                  <Text style={styles.mentionName} numberOfLines={1}>{u.display_name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Input */}
          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              placeholder={t('comments.input_placeholder')}
              placeholderTextColor={COLORS.text3}
              value={text}
              onChangeText={handleTextChange}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={!text.trim() || sending}
              style={styles.sendBtn}
            >
              <Text style={[styles.sendText, (!text.trim() || sending) && { opacity: 0.4 }]}>
                {t('comments.post')}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  backdrop: {
    flex: 1,
    backgroundColor: COLORS.overlay,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  header: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.text3,
    marginBottom: 10,
  },
  headerTitle: {
    ...font('subtitle'),
    fontSize: 15,
    color: COLORS.text,
  },
  headerClose: {
    position: 'absolute',
    right: 16,
    top: 18,
  },
  list: {
    flex: 1,
    paddingHorizontal: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    ...font('bodyBold'),
    fontSize: 15,
    color: COLORS.text2,
  },
  emptySubtext: {
    ...font('body'),
    color: COLORS.text3,
    marginTop: 4,
  },
  commentRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    gap: 10,
  },
  commentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.bg3,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  commentAvatarImg: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  commentContent: {
    flex: 1,
  },
  commentText: {
    ...font('body'),
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 19,
  },
  commentUsername: {
    fontWeight: '700',
    color: COLORS.text,
  },
  commentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  commentTime: {
    ...font('caption'),
    color: COLORS.text3,
  },
  mentionList: {
    borderTopWidth: 0.5,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.bg2,
  },
  mentionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  mentionAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.bg3,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  mentionAvatarImg: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  mentionUsername: {
    ...font('bodyBold'),
    fontSize: 14,
    color: COLORS.text,
  },
  mentionName: {
    ...font('body'),
    color: COLORS.text2,
    flex: 1,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.border,
    paddingBottom: 34,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.bg3,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    color: COLORS.text,
    maxHeight: 80,
  },
  sendBtn: {
    marginLeft: 10,
  },
  sendText: {
    ...font('bodyBold'),
    fontSize: 15,
    color: COLORS.ember,
  },
});

export default CommentSheet;
