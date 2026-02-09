const path = require("path");

// Set expo-router app root before anything else loads
process.env.EXPO_ROUTER_APP_ROOT = "./app";

const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");
const appNodeModules = path.resolve(projectRoot, "node_modules");

const config = getDefaultConfig(projectRoot);

// Monorepo: watch the entire monorepo for changes
config.watchFolders = [monorepoRoot];

// Monorepo: resolve node_modules from both the app and the root
config.resolver.nodeModulesPaths = [
  appNodeModules,
  path.resolve(monorepoRoot, "node_modules"),
];

// Force ALL "react" imports to resolve from the app's node_modules (react@19.1.0)
// react-native@0.81.5's renderer was built for 19.1.0, but the root has 19.2.3
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "react" || moduleName.startsWith("react/")) {
    try {
      const resolved = require.resolve(moduleName, { paths: [appNodeModules] });
      return { type: "sourceFile", filePath: resolved };
    } catch {}
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
