/**
 * @format
 */

import 'react-native-gesture-handler';
import 'react-native-reanimated';
import '@shopify/react-native-skia';

import { Buffer } from 'buffer';

global.Buffer = global.Buffer || Buffer;

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);
