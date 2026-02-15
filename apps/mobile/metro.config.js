const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

// Find the project and workspace directories
const projectRoot = __dirname;
// This can be replaced with `find-yarn-workspace-root`
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo
config.watchFolders = [monorepoRoot];

// 2. Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// 3. Enable symlinks for pnpm
config.resolver.unstable_enableSymlinks = true;

// 4. Enable package exports for pnpm
config.resolver.unstable_enablePackageExports = true;

// 5. Resolve symlinks to real paths for pnpm compatibility
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Stub out expo-notifications on ALL platforms.
  // Its dependency chain (assert -> call-bind@1.0.8) has a circular import that
  // causes "callBind is not a function" at runtime on both web and Android.
  if (
    moduleName === 'expo-notifications' ||
    moduleName.startsWith('expo-notifications/')
  ) {
    return { type: 'empty' };
  }

  // Try default resolution first
  if (originalResolveRequest) {
    try {
      return originalResolveRequest(context, moduleName, platform);
    } catch (error) {
      // Fall through to custom resolution
    }
  }

  // For pnpm, try to resolve from the project's node_modules first
  const projectModulePath = path.resolve(projectRoot, 'node_modules', moduleName);
  if (fs.existsSync(projectModulePath)) {
    try {
      const realPath = fs.realpathSync(projectModulePath);
      return {
        filePath: require.resolve(moduleName, { paths: [projectRoot] }),
        type: 'sourceFile',
      };
    } catch (e) {
      // Fall through
    }
  }

  // Let Metro handle it
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;

