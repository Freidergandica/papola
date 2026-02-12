const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Monorepo: watch the entire monorepo for changes
config.watchFolders = [monorepoRoot];

// Monorepo: resolve node_modules from both the app and the root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// Force ALL react imports to resolve from mobile-app's own node_modules
// to prevent duplicate React instances from the hoisted root copy (19.2.4 vs 19.1.0)
const appReactDir = path.resolve(projectRoot, "node_modules/react");
const reactRedirects = {
  react: path.join(appReactDir, "index.js"),
  "react/jsx-runtime": path.join(appReactDir, "jsx-runtime.js"),
  "react/jsx-dev-runtime": path.join(appReactDir, "jsx-dev-runtime.js"),
};

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (reactRedirects[moduleName]) {
    return { filePath: reactRedirects[moduleName], type: "sourceFile" };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
