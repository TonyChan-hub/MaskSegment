import { type SkImage } from '@shopify/react-native-skia';
import type { BgrColor } from '../components/MaskSegmentCanvas.types';
/** Paint color map expanded by pickMap (same size as pick, unpainted pixels have a=0). Supports maskFeather for soft-edge alpha. */
export declare function buildPaintColorMapImage(pickBuffer: Uint8Array, cols: number, rows: number, paintedRegions: Map<number, BgrColor>, featherRadius?: number): SkImage;
