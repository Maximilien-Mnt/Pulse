module.exports = {
  EventEmitter: jest.fn().mockImplementation(() => ({
    addListener: jest.fn(),
    removeListeners: jest.fn(),
  })),
  NativeModule: {},
  SharedObject: {},
  SharedRef: {},
  requireNativeModule: jest.fn(() => ({})),
};
