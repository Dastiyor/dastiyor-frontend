import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Icon } from '@/components/Icon';
import type { PortfolioProject } from '@dastiyor/types';
import { api, uploadFile } from '@/lib/api-client';
import { Alert } from '@/lib/dialog';
import { useTheme } from '@/contexts/ThemeContext';
import { GradientButton, Input } from '@/components/Premium';

const MAX_PHOTOS = 8;

export interface PortfolioLabels {
  addProject: string; projectTitle: string; projectDescription: string; addPhotos: string; photo: string;
  saveProject: string; cancel: string; edit: string; delete: string; deleteQuestion: string;
  moveUp: string; moveDown: string; empty: string; error: string; photoPermission: string;
}

type Draft = { id: string | null; title: string; description: string; images: string[] };

/** Provider's own portfolio: add, edit, delete and reorder projects. Each change saves immediately. */
export function PortfolioEditor({ labels: l }: { labels: PortfolioLabels }) {
  const { colors } = useTheme();
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get<{ projects: PortfolioProject[] }>('/api/profile/portfolio')
      .then((res) => setProjects(res.projects ?? []))
      .catch((e) => Alert.alert(l.error, (e as Error).message))
      .finally(() => setLoading(false));
    // Load once on mount; labels changing language mid-screen doesn't need a refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addPhotos() {
    if (!draft) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert(l.error, l.photoPermission); return; }
    const room = MAX_PHOTOS - draft.images.length;
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: room, quality: 0.7,
    });
    if (picked.canceled) return;
    setBusy(true);
    try {
      const urls: string[] = [];
      for (const a of picked.assets.slice(0, room)) {
        urls.push(await uploadFile(a.uri, a.mimeType ?? 'image/jpeg', a.fileName ?? 'photo.jpg'));
      }
      setDraft((d) => d && { ...d, images: [...d.images, ...urls] });
    } catch (e) {
      Alert.alert(l.error, (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!draft) return;
    setBusy(true);
    const body = { title: draft.title, description: draft.description, images: draft.images };
    try {
      if (draft.id) {
        const res = await api.put<{ project: PortfolioProject }>(`/api/profile/portfolio/${draft.id}`, body);
        setProjects((list) => list.map((p) => (p.id === draft.id ? res.project : p)));
      } else {
        const res = await api.post<{ project: PortfolioProject }>('/api/profile/portfolio', body);
        setProjects((list) => [...list, res.project]);
      }
      setDraft(null);
    } catch (e) {
      Alert.alert(l.error, (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function remove(id: string) {
    Alert.alert(l.deleteQuestion, '', [
      { text: l.cancel, style: 'cancel' },
      {
        text: l.delete, style: 'destructive',
        onPress: () => {
          api.del(`/api/profile/portfolio/${id}`)
            .then(() => setProjects((list) => list.filter((p) => p.id !== id)))
            .catch((e) => Alert.alert(l.error, (e as Error).message));
        },
      },
    ]);
  }

  function move(index: number, delta: -1 | 1) {
    const next = [...projects];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    setProjects(next);
    api.patch('/api/profile/portfolio', { order: next.map((p) => p.id) })
      .catch((e) => Alert.alert(l.error, (e as Error).message));
  }

  if (loading) return <ActivityIndicator color="#2563EB" style={{ marginTop: 24 }} />;

  const input = [styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text }];
  const iconBtn = [styles.iconBtn, { borderColor: colors.border }];

  return (
    <View style={{ gap: 12 }}>
      {draft ? (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.text }]}>{l.projectTitle}</Text>
          <Input accessibilityLabel={l.projectTitle} style={input} value={draft.title} maxLength={100}
            onChangeText={(title) => setDraft({ ...draft, title })} />
          <Text style={[styles.label, { color: colors.text }]}>{l.projectDescription}</Text>
          <Input accessibilityLabel={l.projectDescription} style={[...input, { minHeight: 80 }]} value={draft.description}
            multiline textAlignVertical="top" maxLength={1000} onChangeText={(description) => setDraft({ ...draft, description })} />
          <View style={styles.photos}>
            {draft.images.map((src, i) => (
              <TouchableOpacity key={src + i} onPress={() => setDraft({ ...draft, images: draft.images.filter((_, j) => j !== i) })}>
                <Image source={{ uri: src }} style={styles.thumb} accessibilityLabel={`${l.photo} ${i + 1}`} />
                <Icon name="close-circle" size={20} color="#DC2626" style={styles.thumbX} />
              </TouchableOpacity>
            ))}
            {draft.images.length < MAX_PHOTOS && (
              <TouchableOpacity style={[styles.thumb, styles.addThumb, { borderColor: colors.border }]} onPress={addPhotos}
                disabled={busy} accessibilityRole="button" accessibilityLabel={l.addPhotos}>
                {busy ? <ActivityIndicator color="#2563EB" /> : <Icon name="images-outline" size={24} color={colors.textSecondary} />}
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.row}>
            <TouchableOpacity style={[styles.btn, styles.btnOutline, { borderColor: colors.border }]} onPress={() => setDraft(null)} accessibilityRole="button">
              <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>{l.cancel}</Text>
            </TouchableOpacity>
            <GradientButton style={[styles.btn, (busy || !draft.title.trim()) && { opacity: 0.6 }]} onPress={save}
              disabled={busy || !draft.title.trim()} accessibilityRole="button">
              <Text style={styles.btnText}>{l.saveProject}</Text>
            </GradientButton>
          </View>
        </View>
      ) : (
        <GradientButton style={styles.btn} onPress={() => setDraft({ id: null, title: '', description: '', images: [] })}
          disabled={projects.length >= 20} accessibilityRole="button">
          <Text style={styles.btnText}>{l.addProject}</Text>
        </GradientButton>
      )}

      {projects.length === 0 && !draft && <Text style={{ color: colors.textSecondary }}>{l.empty}</Text>}

      {projects.map((p, i) => (
        <View key={p.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>{p.title}</Text>
              {p.description ? <Text style={{ color: colors.textSecondary, marginTop: 2 }}>{p.description}</Text> : null}
            </View>
            <TouchableOpacity style={iconBtn} disabled={i === 0} onPress={() => move(i, -1)} accessibilityLabel={l.moveUp}>
              <Icon name="arrow-up" size={16} color={i === 0 ? colors.border : colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={iconBtn} disabled={i === projects.length - 1} onPress={() => move(i, 1)} accessibilityLabel={l.moveDown}>
              <Icon name="arrow-down" size={16} color={i === projects.length - 1 ? colors.border : colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={iconBtn} accessibilityLabel={l.edit}
              onPress={() => setDraft({ id: p.id, title: p.title, description: p.description ?? '', images: p.images })}>
              <Icon name="pencil" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={iconBtn} onPress={() => remove(p.id)} accessibilityLabel={l.delete}>
              <Icon name="trash-outline" size={16} color="#DC2626" />
            </TouchableOpacity>
          </View>
          {p.images.length > 0 && (
            <View style={styles.photos}>
              {p.images.map((src, j) => <Image key={src + j} source={{ uri: src }} style={styles.thumb} accessibilityLabel={`${p.title} ${j + 1}`} />)}
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 15, fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '700' },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 15 },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumb: { width: 72, height: 72, borderRadius: 8 },
  thumbX: { position: 'absolute', top: -6, right: -6 },
  addThumb: { borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  iconBtn: { width: 34, height: 34, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  btn: { flex: 1, backgroundColor: '#2563EB', borderRadius: 12, padding: 14, alignItems: 'center' },
  btnOutline: { backgroundColor: 'transparent', borderWidth: 1 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
