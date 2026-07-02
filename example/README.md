# MaskSegmentCanvas Example

A Demo project that **fully simulates real-world business integration**, showing how to integrate `react-native-mask-segment-canvas` into your React Native project.

## Difference from the Library's Own Demo

| Project | Import Method | Purpose |
| ---- | -------- | ---- |
| Root `App.tsx` | `import ... from './src'` (internal source) | Library author self-testing |
| **This example/** | `import ... from 'react-native-mask-segment-canvas'` (public API) | **Business integration reference** |

This example only depends on the library's public API and does not touch any `src/` internals. It serves as a template you can directly copy into your project.

## Quick Start

```bash
# 1. Enter the example directory
cd example

# 2. Install dependencies (auto-links the parent library)
npm install

# 3. Apply postinstall patches (patch-package patches react-native-fast-opencv)
#    Automatically runs after npm install. If it didn't, run manually:
npx patch-package

# 4. iOS: Install native dependencies
cd ios && pod install && cd ..

# 5. Start Metro
npm start

# 6. In another terminal, run
npm run ios
# or
npm run android
```

## File Overview

```
example/
├── App.tsx              # ★ Core: Complete integration example page
├── index.js             # RN entry (registers gesture-handler + Buffer polyfill)
├── app.json             # App name config
├── package.json         # Standalone dependency config, "react-native-mask-segment-canvas": "file:.."
├── metro.config.js      # Metro config (watchFolders pointing to parent directory)
├── babel.config.js      # Babel config (includes reanimated plugin)
├── tsconfig.json        # TypeScript config
└── README.md            # This file
```

## Features Covered in App.tsx

`App.tsx` is a complete page you can reference directly, covering:

| Feature | Relevant Code Location |
| ---- | ------------ |
| **PNG pre-warming** | `useEffect` → `prewarmPngBgrCacheAsync` |
| **State management** | `watchState` / `isInteractive` / `isOutlineReady` derived states |
| **onWatch callback** | `handleWatch` — tracks initialization stages |
| **onPaintCallback** | `handlePaintCallback` — handles both successful paint and missing-brush scenarios |
| **onError callback** | `handleError` — captures segmentation/load failures |
| **Ref operations** | `save` / `reset` / `swap` / `clearAllPaint` / `session` |
| **setPaintColor** | Preset brush colors via `ref.setPaintColor` |
| **Custom semantic color table** | `GYM_CUSTOM_COLORS` example + mode toggle UI |
| **Pipeline resolution toggle** | `pipelinePreset` low/medium/high resolution switching |
| **Toast notifications** | `brush_required` callback when no brush is selected + custom Toast |
| **Loading/error UI** | PNG pre-warm loading, initialization Loading, error display |
| **Draft recovery** | `sessionDraft` state + `initialSession` prop |

## Integrating into Your Own Project

### Option 1: npm install (recommended for production)

```bash
npm install react-native-mask-segment-canvas
```

### Option 2: Local development

```bash
# In the library directory
npm link

# In your project
npm link react-native-mask-segment-canvas
```

Your `metro.config.js` needs to add:

```js
const path = require('path');

module.exports = mergeConfig(getDefaultConfig(__dirname), {
  watchFolders: [path.resolve(__dirname, '../MaskSegmentApp')],
  resolver: {
    nodeModulesPaths: [path.resolve(__dirname, 'node_modules')],
  },
});
```

### Option 3: file: dependency (used by this example)

```json
{
  "dependencies": {
    "react-native-mask-segment-canvas": "file:../MaskSegmentApp"
  }
}
```

### Required peerDependencies

```bash
npm install @shopify/react-native-skia react-native-reanimated react-native-fast-opencv react-native-fs buffer
# If using photo library picker
npm install react-native-image-picker
# Safe area insets
npm install react-native-safe-area-context
```

### postinstall Configuration

Your `package.json` needs:

```json
{
  "scripts": {
    "postinstall": "patch-package"
  },
  "devDependencies": {
    "patch-package": "^8.0.1"
  }
}
```

## Common Issues

**Getting "module not found" after `npm install`?**
- Make sure `postinstall` ran (`npx patch-package`)
- Check that Metro config's `watchFolders` includes the library directory

**`pod install` fails?**
```bash
cd ios
bundle install
bundle exec pod install --repo-update
```

**Android build errors?**
```bash
cd android && ./gradlew clean && cd ..
```

**Duplicate module errors at runtime (most common)**

In monorepo, npm link, or `file:..` setups, you'll frequently encounter these "similar-looking" errors:

- `SkiaPictureView must be a function (received 'undefined')`
- `createAnimatedNode: Animated node[...] already exists` (including UIFrameGuarded variants)
- Other Fabric ViewManager / native module singleton conflicts

**Root cause**: Metro is loading multiple copies of `@shopify/react-native-skia`, `react-native-reanimated`, `react-native-gesture-handler`, `react-native-fast-opencv`, `react-native-safe-area-context`, and other peer dependencies.

**Recommended complete solution** (copy directly into your project):

1. **At the very top of index.js** (must come first):

   ```js
   import 'react-native-gesture-handler';
   import 'react-native-reanimated';
   import '@shopify/react-native-skia';
   ```

2. **metro.config.js** (use extraNodeModules + blockList for double safety):

   ```js
   const path = require('path');
   const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

   const yourNodeModules = path.resolve(__dirname, 'node_modules');

   const singletons = [
     'react', 'react-native',
     'react-native-reanimated',
     '@shopify/react-native-skia',
     'react-native-gesture-handler',
     'react-native-fast-opencv',
     'react-native-safe-area-context',
     'react-native-fs',
     'react-native-image-picker',
   ];

   module.exports = mergeConfig(getDefaultConfig(__dirname), {
     watchFolders: [path.resolve(__dirname, '../MaskSegmentApp')],
     resolver: {
       nodeModulesPaths: [yourNodeModules],
       extraNodeModules: singletons.reduce((acc, p) => (acc[p] = path.resolve(yourNodeModules, p), acc), {}),
       blockList: singletons.map(p => new RegExp(`/MaskSegmentApp/node_modules/${p.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}/`)),
     },
   });
   ```

   > `example/metro.config.js` is already written following this standard template. You can reference it directly.

After completing the two steps above, you **must**:
- Restart Metro (`npx react-native start --reset-cache`)
- Reinstall the app (recommend `cd android && ./gradlew clean` first, or re-run after iOS pod install)

This will resolve all "similar" duplicate-module runtime errors in one shot.
