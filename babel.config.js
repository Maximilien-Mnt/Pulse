// Under Jest, a leftover `import()` would execute as a native dynamic import
// inside the CommonJS test VM, which throws without --experimental-vm-modules
// (and would bypass jest.mock anyway). babel-preset-jest only adds syntax
// plugins, so tests get an inline equivalent of babel-plugin-dynamic-import-node:
// `import(x)` → `Promise.resolve().then(() => require(x))`.
// Gated on the Jest worker id so Metro / expo export builds are untouched.
const dynamicImportToRequire = ({ types: t }) => ({
  visitor: {
    CallExpression(path) {
      if (path.node.callee.type !== "Import") return;
      const source = t.cloneNode(path.node.arguments[0]);
      path.replaceWith(
        t.callExpression(
          t.memberExpression(
            t.callExpression(t.memberExpression(t.identifier("Promise"), t.identifier("resolve")), []),
            t.identifier("then"),
          ),
          [t.arrowFunctionExpression([], t.callExpression(t.identifier("require"), [source]))],
        ),
      );
    },
  },
});

module.exports = function (api) {
  api.cache(true);
  const isJest = !!process.env.JEST_WORKER_ID;
  return {
    presets: ["babel-preset-expo", "nativewind/babel"],
    plugins: [
      ...(isJest ? [dynamicImportToRequire] : []),
      "react-native-reanimated/plugin",
    ],
  };
};