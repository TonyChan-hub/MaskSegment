import type { BgrColor, SavePaintResult } from '../components/MaskSegmentCanvas.types';
import type { SkImage } from '@shopify/react-native-skia';
export type CompositePaintInput = {
    originBuffer: Uint8Array;
    cols: number;
    rows: number;
    pickBuffer: Uint8Array;
    paintedRegions: Map<number, BgrColor>;
    destDir?: string;
    /**
     * Preferred path for rich export: PNG base64 from makeImageSnapshot() — written
     * directly to disk without an extra decode/re-encode round trip.
     */
    exportPngBase64?: string;
    /**
     * Preferred path for rich export: if the caller (MaskSegmentCanvas) provides bytes
     * that were produced by makeImageSnapshot() on a high-resolution Canvas rendering the
     * exact same PaintShaderLayer + regionPaint SkSL at work resolution, we write them
     * directly. This captures the live editor appearance (lighting + high/low-freq texture)
     * without CPU pixel math and without a second declarative drawAsImage.
     */
    exportPngBytes?: Uint8Array;
    /**
     * Fallback rich path (when no pre-captured snapshot bytes): pass the live textures
     * so we can try renderPaintedImageOffscreen (drawAsImage with the shader tree).
     */
    shaderTextures?: {
        originImage: SkImage;
        paintColorMap: SkImage;
        lowFreqImage: SkImage;
        highFreqImage: SkImage;
    };
    /** The logical size at which to render the shader tree for export (typically the work image res). */
    renderWidth?: number;
    renderHeight?: number;
};
/** Export painted regions as a recolored PNG.
 * Priority (best to fallback):
 * 1. exportPngBytes (full shader result captured by caller via makeImageSnapshot on high-res Canvas) — recommended "snapshot" path, no CPU per-pixel, no secondary drawAsImage.
 * 2. shaderTextures + render* (rebuild same PaintShaderLayer + SkSL via renderPaintedImageOffscreen / drawAsImage).
 * 3. CPU per-pixel recolor (flat, no lighting/texture, last-resort fallback ensuring save never breaks).
 */
export declare function compositePaintedImage(input: CompositePaintInput): Promise<SavePaintResult>;
