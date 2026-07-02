import { type WrappedMat } from './opencvAdapter';
import type { SkImage } from '@shopify/react-native-skia';
export type FreqLayerImages = {
    lowFreqImage: SkImage;
    highFreqImage: SkImage;
};
export type PaintResourceBatch = {
    originImage: SkImage;
    layers: FreqLayerImages;
};
/** OpenCV 8-bit Lab L channel (BGR input, for single test and approximate comparison) */
export declare function bgrToLabL(b: number, g: number, r: number): number;
/** BGR → 8-bit Lab (L/a/b mapped to 0–255) */
export declare function bgrToLab(b: number, g: number, r: number): {
    l: number;
    a: number;
    b: number;
};
export declare function bgrBufferToRgbaBuffer(bgr: Uint8Array, cols: number, rows: number): Uint8Array;
export declare function releaseFreqLayerImages(layers: FreqLayerImages | null): void;
/** reuse the uploaded BGR Mat, avoid duplicate bufferToMat + JS↔native roundtrip */
export declare function prepareFreqLayersFromWorkMat(workMat: WrappedMat, cols: number, rows: number): Promise<FreqLayerImages | null>;
/** single time Mat upload → high/low frequency + original Skia (parallel, callback when high/low frequency is ready) */
export declare function preparePaintResourcesFromWorkBuffer(bgrBuffer: Uint8Array, cols: number, rows: number, onFreqLayersReady?: (layers: FreqLayerImages) => void): Promise<PaintResourceBatch | null>;
/** @deprecated test compatibility; production path please use preparePaintResourcesFromWorkBuffer */
export declare function prepareFreqLayersFromBgrBuffer(bgrBuffer: Uint8Array, cols: number, rows: number): Promise<FreqLayerImages | null>;
/** original BGR → Skia RGBA (OpenCV cvtColor, parallel with freq) */
export declare function originBgrBufferToSkiaImage(bgrBuffer: Uint8Array, cols: number, rows: number): Promise<SkImage | null>;
