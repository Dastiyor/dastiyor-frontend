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
import { api } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

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

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(' ');
  const ini = parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
  return <View style={styles.avatar}><Text style={styles.avatarText}>{ini}</Text></View>;
}

export default function ProviderProfileScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const { user } = useAuth();
  const { t } = useLanguage();
  const pv = t.provider;
  const navigation = useNavigation();
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (name) navigation.setOptions({ title: name }); }, [name]);

  useEffect(() => {
    if (!id) return;
    api.get<{ user: ProviderProfile }>(`/api/users/${id}`)
      .then((res) => setProfile(res.user))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <ActivityIndicator style={styles.center} size="large" color="#2563EB" />;

  if (!profile) return <View style={styles.center}><Text style={styles.errorText}>{pv.notFound}</Text></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <View style={styles.header}>
        <Initials name={profile.fullName} />
        <Text style={styles.name}>{profile.fullName}</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{profile.completedCount}</Text>
            <Text style={styles.statLabel}>{pv.completed}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>
              {profile.avgRating > 0 ? profile.avgRating.toFixed(1) : '—'}
            </Text>
            <Text style={styles.statLabel}>{profile.reviewCount} {pv.reviews}</Text>
          </View>
        </View>
      </View>

      {profile.bio ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{pv.bio}</Text>
          <Text style={styles.cardText}>{profile.bio}</Text>
        </View>
      ) : null}

      {profile.skills ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{pv.skills}</Text>
          <View style={styles.skillsRow}>
            {profile.skills.split(',').map((s, i) => (
              <View key={i} style={styles.skillBadge}>
                <Text style={styles.skillText}>{s.trim()}</Text>
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
            <Text style={styles.sectionTitle}>{pv.reviews} ({profile.reviewCount})</Text>
            {profile.reviews.map((r) => (
              <View key={r.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewerName}>{r.reviewer.fullName}</Text>
                  <Text style={styles.reviewStars}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</Text>
                </View>
                <Text style={styles.reviewTask} numberOfLines={1}>{r.task.title}</Text>
                {r.comment ? <Text style={styles.reviewComment}>{r.comment}</Text> : null}
                <Text style={styles.reviewDate}>{new Date(r.createdAt).toLocaleDateString('ru-RU')}</Text>
              </View>
            ))}
          </>
        ) : (
          <View style={styles.noReviews}><Text style={styles.noReviewsText}>{pv.noReviews}</Text></View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 60 },
  errorText: { color: '#6B7280', fontSize: 15 },
  scroll: { paddingBottom: 40 },
  header: { alignItems: 'center', backgroundColor: '#fff', paddingTop: 40, paddingBottom: 28, marginBottom: 16 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#fff' },
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
  skillText: { fontSize: 13, color: '#2563EB', fontWeight: '600' },
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
