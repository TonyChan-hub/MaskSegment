import { type SkImage } from '@shopify/react-native-skia';
/** Continuous RGBA buffer → Skia image (direct memory transfer for freq layers / work buffer origin, avoids PNG roundtrip) */
export declare function rgbaBufferToSkiaImage(buffer: Uint8Array, cols: number, rows: number): SkImage | null;
