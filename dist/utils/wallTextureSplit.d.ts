import type { SegmentMaskResult } from './maskSegmentation';
/** Placeholder value for non-wall pixels in wallSubLabels */
export declare const WALL_SUB_LABEL_NONE = 255;
/**
 * After semantic segmentation, subdivide the wall region into wall-1, wall-2… by source image texture features
 */
export declare function splitWallRegionsByTexture(result: SegmentMaskResult, originBgr: Uint8Array, cols: number, rows: number, minArea: number): SegmentMaskResult;
export declare function isWallSubRegionName(name: string): boolean;
