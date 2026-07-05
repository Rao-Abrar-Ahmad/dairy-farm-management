import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? 'dairy-farm-management',
  slug: config.slug ?? 'dairy-farm-management',
  plugins: ['expo-router', "expo-font",
    "expo-sqlite",
    "expo-status-bar",],
});
