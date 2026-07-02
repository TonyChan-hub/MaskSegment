const path = require('path');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const rootNodeModules = path.resolve(__dirname, 'node_modules');
const exampleNodeModules = path.resolve(__dirname, 'example/node_modules');

const singletonPackages = [
  'react',
  'react-native',
  'react-native-reanimated',
  '@shopify/react-native-skia',
  'react-native-gesture-handler',
  'react-native-fast-opencv',
  'react-native-safe-area-context',
  'react-native-fs',
  'react-native-image-picker',
];

const config = {
  resolver: {
    nodeModulesPaths: [rootNodeModules, exampleNodeModules],

    extraNodeModules: singletonPackages.reduce((acc, pkg) => {
      acc[pkg] = path.resolve(rootNodeModules, pkg);
      return acc;
    }, {}),

    blockList: singletonPackages.map(
      (pkg) => new RegExp(`/example/node_modules/${pkg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/`),
    ),
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
