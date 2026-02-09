module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: [
      require("babel-preset-expo/build/expo-router-plugin").expoRouterBabelPlugin,
      "react-native-reanimated/plugin",
    ],
  };
};
