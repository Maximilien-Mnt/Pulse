// Mock expo-modules-core before jest-expo preset loads
// Test-env defaults so suites that import the real lib/supabase.ts can build
// its client (real suites mock "@/lib/supabase" and never use these values).
process.env.EXPO_PUBLIC_SUPABASE_URL ??= "https://test.supabase.co";
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??= "test-anon-key";

// jsdom does not provide the Web Encoding / WebCrypto globals that the Deno Edge
// runtime does. lib/openAgenda.ts derives its stable event IDs from the event
// UID with `TextEncoder` + `crypto.subtle`, so expose the Node equivalents here
// instead of weakening the production code for the test environment.
const { TextDecoder: NodeTextDecoder, TextEncoder: NodeTextEncoder } = require("node:util");
const { webcrypto } = require("node:crypto");

if (typeof globalThis.TextEncoder === "undefined") globalThis.TextEncoder = NodeTextEncoder;
if (typeof globalThis.TextDecoder === "undefined") globalThis.TextDecoder = NodeTextDecoder;

if (!globalThis.crypto?.subtle) {
  try {
    if (globalThis.crypto) {
      Object.defineProperty(globalThis.crypto, "subtle", { value: webcrypto.subtle, configurable: true });
    } else {
      Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true, writable: true });
    }
  } catch {
    Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true, writable: true });
  }
}

jest.mock('expo-modules-core', () => ({
  EventEmitter: jest.fn().mockImplementation(() => ({
    addListener: jest.fn(),
    removeListeners: jest.fn(),
  })),
  NativeModule: {},
  SharedObject: {},
  SharedRef: {},
  requireNativeModule: jest.fn(() => ({})),
  // expo-constants (and other Expo SDK modules) import this at module scope;
  // returning null means "module not available", which the SDK degrades from.
  requireOptionalNativeModule: jest.fn(() => null),
  CodedError: class CodedError extends Error {
    code;
    constructor(code, message) {
      super(message);
      this.code = code;
    }
  },
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
