import { ScrollView } from 'react-native';
import { Text } from '@/components/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PortfolioEditor } from '@/components/PortfolioEditor';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';

export default function PortfolioScreen() {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const ep = t.editProfile;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40, gap: 12 }} keyboardShouldPersistTaps="handled">
      <Text style={{ color: colors.textSecondary }}>{ep.portfolioHint}</Text>
      <PortfolioEditor labels={{
        addProject: ep.addProject, projectTitle: ep.projectTitle, projectDescription: ep.projectDescription,
        addPhotos: ep.addPhotos, photo: ep.projectPhoto, saveProject: ep.saveProject, cancel: t.common.cancel,
        edit: ep.edit, delete: ep.deleteProject, deleteQuestion: ep.deleteQuestion, moveUp: ep.moveUp,
        moveDown: ep.moveDown, empty: ep.portfolioEmpty, error: t.common.error, photoPermission: ep.photoPermission,
      }} />
    </ScrollView>
  );
}
