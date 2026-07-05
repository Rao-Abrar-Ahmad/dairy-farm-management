import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../components/Theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Page not found' }} />
      <View style={styles.container}>
        <Text style={styles.title}>This screen is not available yet.</Text>
        <Link href="/(tabs)/home" style={styles.link}>Return home</Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  title: { color: colors.primary, fontSize: 20, fontWeight: '700' },
  link: { marginTop: 12, color: colors.accent, fontWeight: '700' },
});
