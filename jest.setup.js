// Mock expo-modules-core before jest-expo preset loads
jest.mock('expo-modules-core', () => ({
  EventEmitter: jest.fn().mockImplementation(() => ({
    addListener: jest.fn(),
    removeListeners: jest.fn(),
  })),
  NativeModule: {},
  SharedObject: {},
  SharedRef: {},
  requireNativeModule: jest.fn(() => ({})),
}), { virtual: true });

// Mock lucide-react-native (ESM-only, can't be transformed by babel-jest)
jest.mock('lucide-react-native', () => {
  const createMockIcon = () => {
    const MockIcon = (props) => null;
    MockIcon.displayName = 'MockLucideIcon';
    return MockIcon;
  };
  return new Proxy({}, {
    get: (_, prop) => {
      if (prop === '__esModule') return true;
      if (prop === 'default') return createMockIcon();
      return createMockIcon();
    },
  });
});

// Mock AsyncStorage for tests
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock @expo/vector-icons (ESM-only, can't be transformed)
jest.mock('@expo/vector-icons', () => {
  const createMockIcon = () => {
    const MockIcon = (props) => null;
    MockIcon.displayName = 'MockExpoIcon';
    return MockIcon;
  };
  return new Proxy({}, {
    get: (_, prop) => {
      if (prop === '__esModule') return true;
      if (prop === 'default') return createMockIcon();
      return createMockIcon();
    },
  });
});

// Mock expo-font
jest.mock('expo-font', () => ({
  useFonts: jest.fn(() => [true, null]),
  loadAsync: jest.fn(),
  isLoaded: jest.fn(() => true),
}));

// Mock expo-image (native-manager component not available in jsdom)
jest.mock('expo-image', () => {
  const MockImage = (props) => null;
  MockImage.displayName = 'MockExpoImage';
  return { Image: MockImage, ImageBackground: MockImage };
});

// Mock themeStore (used by useDesignTokens)
jest.mock('@/stores/themeStore', () => ({
  useThemeStore: (selector) => selector({ isDark: false }),
}));
