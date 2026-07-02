import { type SkImage } from '@shopify/react-native-skia';
/** pickMap pixel value regionId+1 → RGBA texture (R channel stores lookup code) */
export declare function pickBufferToSkImage(pickBuffer: Uint8Array, cols: number, rows: number): SkImage | null;
