/**
 * @format
 */

// [CRITICAL - Must be at the very top] Import libraries with JSI/native registration side effects in this order.
// Recommended order:
//   1. react-native-gesture-handler
//   2. react-native-reanimated
//   3. @shopify/react-native-skia
//
// Used together with example/metro.config.js extraNodeModules + blockList,
// this completely avoids duplicate module issues in monorepo/file: setups:
//   - SkiaPictureView config getter undefined
//   - createAnimatedNode: Animated node already exists
//   - Other Fabric / ViewManager conflicts
import 'react-native-gesture-handler';
import 'react-native-reanimated';
import '@shopify/react-native-skia';

import { Buffer } from 'buffer';
global.Buffer = global.Buffer || Buffer;

import { AppRegistry } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => RootComponent);

function RootComponent() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <App />
    </GestureHandlerRootView>
  );
}
