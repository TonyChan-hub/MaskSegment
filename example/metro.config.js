const path = require('path');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration for the example app.
 *
 * Key goal: in monorepo / "file:.." / npm link setups, ensure all peer dependencies with native/JSI/Fabric code
 * resolve to exactly the one copy under **example/node_modules**.
 *
 * Duplicate resolution causes various "similar-looking" errors:
 * - SkiaPictureView config getter is undefined
 * - createAnimatedNode: Animated node[...] already exists (Reanimated)
 * - Various View registration conflicts, Invalid hook calls, etc.
 *
 * Maintenance rule: any peerDependency listed in package.json that contains native code must be forced to a singleton here.
 */

const parentRoot = path.resolve(__dirname, '..');
const exampleNodeModules = path.resolve(__dirname, 'node_modules');

// Singleton dependency list (from this library's peerDependencies + commonly conflicting packages).
// When adding new peer dependencies, remember to update this list.
const singletonPackages = [
  'react',
  'react-native',
  'react-native-reanimated',
  '@shopify/react-native-skia',
  'react-native-gesture-handler',
  'react-native-fast-opencv',
  'react-native-safe-area-context',
  'react-native-fs',
  // Optional peer
  'react-native-image-picker',
];

const config = {
  watchFolders: [parentRoot],
  resolver: {
    nodeModulesPaths: [exampleNodeModules],

    // Method 1 (strongest): extraNodeModules forces aliases
    // so import 'xxx' always gets the instance in example/node_modules
    extraNodeModules: singletonPackages.reduce((acc, pkg) => {
      acc[pkg] = path.resolve(exampleNodeModules, pkg);
      return acc;
    }, {}),

    // Method 2 (double safety): blockList completely prevents Metro from finding these packages in the parent node_modules
    blockList: singletonPackages.map(
      (pkg) => new RegExp(`/MaskSegmentApp/node_modules/${pkg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/`),
    ),
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
