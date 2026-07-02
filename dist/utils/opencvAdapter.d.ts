import { DataTypes, ColorConversionCodes, ThresholdTypes, MorphShapes, MorphTypes, RetrievalModes, ContourApproximationModes, InterpolationFlags, type Mat, type PointVector } from 'react-native-fast-opencv';
import type { SkImage } from '@shopify/react-native-skia';
type Point = {
    x: number;
    y: number;
};
type BBox = {
    x: number;
    y: number;
    width: number;
    height: number;
};
type BgrColor = {
    b: number;
    g: number;
    r: number;
};
export declare class WrappedMat {
    readonly mat: Mat;
    cols: number;
    rows: number;
    readonly channels: number;
    constructor(mat: Mat, cols: number, rows: number, channels?: number);
    release(): void;
    clone(): Promise<WrappedMat>;
}
export declare class ContourWrapper {
    readonly pointVector: PointVector;
    constructor(pointVector: PointVector);
    release(): void;
}
declare const cv: {
    IMREAD_GRAYSCALE: number;
    THRESH_BINARY: ThresholdTypes;
    MORPH_RECT: MorphShapes;
    MORPH_ELLIPSE: MorphShapes;
    MORPH_OPEN: MorphTypes;
    MORPH_CLOSE: MorphTypes;
    RETR_EXTERNAL: RetrievalModes;
    CHAIN_APPROX_SIMPLE: ContourApproximationModes;
    CHAIN_APPROX_NONE: ContourApproximationModes;
    COLOR_BGR2GRAY: ColorConversionCodes;
    COLOR_BGR2Lab: ColorConversionCodes;
    COLOR_Lab2BGR: ColorConversionCodes;
    COLOR_GRAY2BGR: ColorConversionCodes;
    CV_8UC1: DataTypes;
    CV_16SC1: DataTypes;
    INTER_LINEAR: InterpolationFlags;
    INTER_NEAREST: InterpolationFlags;
    ensurePngPath(path: string, cacheFileName?: string): Promise<string>;
    imread(path: string, flags?: number): Promise<WrappedMat>;
    createMat(cols: number, rows: number, channels?: 1 | 3 | 4): WrappedMat;
    cvtColor(src: WrappedMat, code: ColorConversionCodes): Promise<WrappedMat>;
    /** Three-channel color space conversion (BGR/Lab etc.) */
    cvtColorBgr(src: WrappedMat, code: ColorConversionCodes): WrappedMat;
    /** Grayscale Mat → 3-channel BGR (for Skia display) */
    grayToBgr(src: WrappedMat): WrappedMat;
    /** Normalize mask to 3-channel BGR; return as-is if already 3-channel, color order checked by segmentation side swapBr */
    ensureBgr3(src: WrappedMat): Promise<WrappedMat>;
    /** JS binary buffer (0/255) → single-channel Mat */
    binaryBufferToMat(buffer: Uint8Array, cols: number, rows: number): WrappedMat;
    /** Continuous BGR buffer → 3-channel Mat */
    bgrBufferToMat(buffer: Uint8Array, cols: number, rows: number): WrappedMat;
    /** Write JS-side grayscale binary image to temp PGM and read back as Mat */
    grayBufferToMat(gray: Uint8Array, cols: number, rows: number): Promise<WrappedMat>;
    /**
     * Export Mat pixels. Clone first to ensure contiguous memory, avoiding row misalignment from native matToBuffer ignoring step.
     */
    matToBuffer(src: WrappedMat): {
        buffer: Uint8Array;
        cols: number;
        rows: number;
        channels: number;
    };
    inRangeBgr(src: WrappedMat, color: BgrColor, tolerance: number, dst: WrappedMat): Promise<void>;
    resize(src: WrappedMat, dst: WrappedMat, size: {
        width: number;
        height: number;
    }, interpolation?: InterpolationFlags): Promise<void>;
    /** Native BGR buffer resize (mask uses semantic colors, default nearest-neighbor) */
    resizeBgrBuffer(buffer: Uint8Array, srcCols: number, srcRows: number, dstCols: number, dstRows: number, interpolation?: InterpolationFlags): Promise<Uint8Array>;
    /** BGR Mat → RGBA continuous buffer (for Skia direct transfer) */
    matToRgbaBuffer(src: WrappedMat): Promise<{
        buffer: Uint8Array;
        cols: number;
        rows: number;
    }>;
    /** BGR Mat → Skia image (bypasses low/high freq PNG encoding) */
    matToSkiaImage(src: WrappedMat): Promise<SkImage | null>;
    /** Single-channel grayscale Mat → Skia RGBA (bypasses BGR pseudocolor + 4-channel matToBuffer) */
    grayMatToSkiaImage(src: WrappedMat): SkImage | null;
    /** Continuous BGR buffer → Skia image (work-resolution origin / freq layers, reusing OpenCV decode result) */
    bgrBufferToSkiaImage(buffer: Uint8Array, cols: number, rows: number): Promise<SkImage | null>;
    threshold(src: WrappedMat, dst: WrappedMat, thresh: number, maxval: number, type: number): Promise<void>;
    getStructuringElement(shape: MorphShapes, ksize: {
        width: number;
        height: number;
    }): Promise<WrappedMat>;
    morphologyEx(src: WrappedMat, dst: WrappedMat, op: MorphTypes, kernel: WrappedMat): Promise<void>;
    findContours(image: WrappedMat, mode: RetrievalModes, method: ContourApproximationModes): Promise<ContourWrapper[]>;
    contourArea(contour: ContourWrapper): Promise<number>;
    boundingRect(contour: ContourWrapper): Promise<BBox>;
    arcLength(contour: ContourWrapper, closed: boolean): Promise<number>;
    approxPolyDP(contour: ContourWrapper, epsilon: number, closed: boolean): Promise<Point[]>;
    GaussianBlur(src: WrappedMat, dst: WrappedMat, ksize: {
        width: number;
        height: number;
    }, sigma: number): Promise<void>;
    extractChannel(src: WrappedMat, dst: WrappedMat, channel: number): void;
    convertTo(src: WrappedMat, dst: WrappedMat, rtype: number, alpha?: number, beta?: number): void;
    subtract(src1: WrappedMat, src2: WrappedMat, dst: WrappedMat): Promise<void>;
    addWeighted(src1: WrappedMat, alpha: number, src2: WrappedMat | null, beta: number, gamma: number, dst: WrappedMat): Promise<void>;
    imwrite(path: string, mat: WrappedMat): Promise<void>;
};
export default cv;
