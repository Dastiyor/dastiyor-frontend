import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router, useNavigation } from 'expo-router';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import { api } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Avatar } from '@/components/Avatar';

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  reviewer: { id: string; fullName: string };
  task: { id: string; title: string };
}

interface ProviderProfile {
  id: string;
  fullName: string;
  bio: string | null;
  skills: string | null;
  role: string;
  createdAt: string;
  completedCount: number;
  avgRating: number;
  reviewCount: number;
  reviews: Review[];
}


export default function ProviderProfileScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { colors } = useTheme();
  const pv = t.provider;
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (name) navigation.setOptions({ title: name }); }, [name]);

  function loadProfile() {
    if (!id) return;
    setLoading(true);
    setError(null);
    api.get<{ user: ProviderProfile }>(`/api/users/${id}`)
      .then((res) => setProfile(res.user))
      .catch(() => setError(pv.loadError))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadProfile(); }, [id]);

  if (loading) return <ActivityIndicator style={styles.center} size="large" color={colors.accent} />;

  if (error || !profile) return (
    <View style={styles.center}>
      <Text style={[styles.errorText, { color: colors.textSecondary }]}>{error ?? pv.notFound}</Text>
      {error ? (
        <TouchableOpacity style={styles.retryBtn} onPress={loadProfile}>
          <Text style={styles.retryBtnText}>{t.common.errorRetry}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]} contentContainerStyle={styles.scroll}>
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <View style={styles.avatarWrap}>
          <Avatar name={profile.fullName} size={80} />
        </View>
        <Text style={[styles.name, { color: colors.text }]}>{profile.fullName}</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: colors.text }]}>{profile.completedCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{pv.completed}</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>
              {profile.avgRating > 0 ? profile.avgRating.toFixed(1) : '—'}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{profile.reviewCount} {pv.reviews}</Text>
          </View>
        </View>
      </View>

      {profile.bio ? (
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{pv.bio}</Text>
          <Text style={[styles.cardText, { color: colors.textSecondary }]}>{profile.bio}</Text>
        </View>
      ) : null}

      {profile.skills ? (
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{pv.skills}</Text>
          <View style={styles.skillsRow}>
            {profile.skills.split(',').map((s) => (
              <View key={s.trim()} style={[styles.skillBadge, { backgroundColor: colors.iconBg }]}>
                <Text style={[styles.skillText, { color: colors.accent }]}>{s.trim()}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {user?.role === 'CUSTOMER' && user.id !== id ? (
        <TouchableOpacity
          style={styles.chatBtn}
          onPress={() => router.push({ pathname: '/chat/[partnerId]', params: { partnerId: profile.id, partnerName: profile.fullName } })}
        >
          <Text style={styles.chatBtnText}>{pv.chat}</Text>
        </TouchableOpacity>
      ) : null}

      <View style={styles.reviewsSection}>
        {profile.reviews.length > 0 ? (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{pv.reviews} ({profile.reviewCount})</Text>
            {profile.reviews.map((r) => (
              <View key={r.id} style={[styles.reviewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.reviewHeader}>
                  <Text style={[styles.reviewerName, { color: colors.text }]}>{r.reviewer.fullName}</Text>
                  <Text style={styles.reviewStars}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</Text>
                </View>
                <Text style={[styles.reviewTask, { color: colors.textSecondary }]} numberOfLines={1}>{r.task.title}</Text>
                {r.comment ? <Text style={[styles.reviewComment, { color: colors.textSecondary }]}>{r.comment}</Text> : null}
                <Text style={[styles.reviewDate, { color: colors.textTertiary }]}>{new Date(r.createdAt).toLocaleDateString('ru-RU')}</Text>
              </View>
            ))}
          </>
        ) : (
          <View style={styles.noReviews}><Text style={[styles.noReviewsText, { color: colors.textTertiary }]}>{pv.noReviews}</Text></View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 60 },
  errorText: { fontSize: 15, marginBottom: 16, textAlign: 'center', paddingHorizontal: 24 },
  retryBtn: { backgroundColor: '#2563EB', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  scroll: { paddingBottom: 40 },
  header: { alignItems: 'center', paddingTop: 40, paddingBottom: 28, marginBottom: 16 },
  avatarWrap: { marginBottom: 14 },
  name: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 20 },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statBox: { alignItems: 'center', paddingHorizontal: 28 },
  statValue: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 2 },
  statLabel: { fontSize: 12, color: '#6B7280' },
  statDivider: { width: 1, height: 36, backgroundColor: '#E5E7EB' },
  card: { backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 14, padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8 },
  cardText: { fontSize: 15, color: '#374151', lineHeight: 22 },
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillBadge: { backgroundColor: '#EFF6FF', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  skillText: { fontSize: 13, fontWeight: '600' },
  chatBtn: { marginHorizontal: 16, backgroundColor: '#2563EB', borderRadius: 14, padding: 15, alignItems: 'center', marginBottom: 16 },
  chatBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  reviewsSection: { marginHorizontal: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 12 },
  reviewCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  reviewerName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  reviewStars: { fontSize: 13, color: '#F59E0B' },
  reviewTask: { fontSize: 12, color: '#6B7280', marginBottom: 6 },
  reviewComment: { fontSize: 14, color: '#374151', lineHeight: 20, marginBottom: 6 },
  reviewDate: { fontSize: 11, color: '#9CA3AF' },
  noReviews: { alignItems: 'center', paddingVertical: 32 },
  noReviewsText: { color: '#9CA3AF', fontSize: 14 },
});
