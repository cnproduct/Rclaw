import { ExpoConfig, ConfigContext } from 'expo/config';

import VERSION from './versions/version.json';

export default ({ config }: ConfigContext): ExpoConfig => {
  return {
    ...config,
    name: 'Rclaw Mobile',
    slug: 'rclaw-mobile',
    version: VERSION.version,
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'rclaw-mobile',
    userInterfaceStyle: 'automatic',
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'ai.resopod.rclaw',
      buildNumber: String(VERSION.buildNumber),
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSCameraUsageDescription: 'Rclaw needs camera access to scan QR codes for server login.',
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/images/icon.png',
        backgroundColor: '#000000',
      },
      package: 'ai.resopod.rclaw',
      versionCode: VERSION.buildNumber,
    },
    web: {
      output: 'static',
      favicon: './assets/images/icon.png',
    },
    plugins: ['expo-router', 'expo-secure-store', 'expo-dev-client', 'expo-camera'],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      eas: {
        projectId: '34b66303-fd5c-4d86-a790-0665d55f2017',
      },
    },
  };
};
