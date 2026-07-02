import { type Mat } from 'react-native-fast-opencv';
export declare const PNG_EXT = ".png";
/** PNG compression level 0 = lossless */
export declare const PNG_COMPRESSION = 0;
export declare function normalizePath(path: string): string;
/** Skia useImage requires a URI; OpenCV / RNFS use bare paths */
export declare function toSkiaUri(path: string | null | undefined): string | null;
export declare function toPngFileName(name: string): string;
export declare function isPngPath(path: string): boolean;
/** Generate fingerprint from file metadata to avoid full-file read (original base64 full hash was extremely slow on 1.5MB images) */
export declare function fileContentFingerprint(path: string): Promise<string>;
/** Any image path → PNG file path under cache dir (copy if already PNG, otherwise decode and save) */
export declare function ensurePngFile(sourcePath: string, cacheFileName: string): Promise<string>;
/** Generate a stable PNG cache name from the source path */
export declare function pngCacheName(sourcePath: string, prefix: string): string;
/** Clean up segmentation/OpenCV derived cache, keep original image and mask source files */
export declare function clearDerivedImageCache(): Promise<number>;
type PngHeader = {
    width: number;
    height: number;
    bitDepth: number;
    colorType: number;
};
/** Parse PNG IHDR from base64 (without OpenCV), used as fallback when 16-bit Mat toJSValue crashes */
export declare function readPngHeaderFromBase64(base64: string): PngHeader;
/** 16-bit / float Mat → 8-bit (fast-opencv toJSValue truncates high bits before patch).
 *  Semantic mask PNGs use 16-bit RGB where the label (0-255) is stored as value×257;
 *  use 1/257 scaling for 3+ channel 16-bit cases so the resulting 8-bit channels contain
 *  the original semantic label values (consistent with the native ensure8U patch).
 *
 *  pngHeader (optional): when toJSValue crashes due to 16-bit Mat, use PNG file header info
 *  for fallback conversion, bypassing native toJSValue call.
 */
export declare function ensureMat8U(srcMat: Mat, pngHeader?: PngHeader): {
    mat: Mat;
    extraReleaseIds: string[];
};
export type PngBgrBuffer = {
    buffer: Uint8Array;
    cols: number;
    rows: number;
};
export declare function prewarmPngBgrCache(paths: string[]): void;
export declare function prewarmPngBgrCacheAsync(paths: string[]): Promise<void>;
export declare function pngContentCacheKey(path: string): Promise<string>;
export declare function readPngBgrBuffer(path: string): Promise<PngBgrBuffer>;
export declare function resizeBgrBuffer(buffer: Uint8Array, srcCols: number, srcRows: number, dstCols: number, dstRows: number): Uint8Array;
export {};
