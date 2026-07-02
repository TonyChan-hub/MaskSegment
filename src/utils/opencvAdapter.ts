/**
 * OpenCV convenience adapter
 * Wraps react-native-fast-opencv invoke API into async-style interfaces needed by MaskSegmentCanvas
 */
import RNFS from 'react-native-fs';
import {
  OpenCV,
  ObjectType,
  DataTypes,
  ColorConversionCodes,
  ThresholdTypes,
  MorphShapes,
  MorphTypes,
  RetrievalModes,
  ContourApproximationModes,
  InterpolationFlags,
  type Mat,
  type PointVector,
} from 'react-native-fast-opencv';
import {
  PNG_COMPRESSION,
  ensureMat8U,
  ensurePngFile,
  isPngPath,
  normalizePath,
  pngCacheName,
  readPngBgrBuffer,
  readPngHeaderFromBase64,
} from './pngImage';
import { rgbaBufferToSkiaImage } from './skiaImage';
import type { SkImage } from '@shopify/react-native-skia';

const IMREAD_GRAYSCALE = 0;

type Point = { x: number; y: number };
type BBox = { x: number; y: number; width: number; height: number };
type BgrColor = { b: number; g: number; r: number };

export class WrappedMat {
  readonly mat: Mat;
  cols: number;
  rows: number;
  readonly channels: number;

  constructor(mat: Mat, cols: number, rows: number, channels = 3) {
    this.mat = mat;
    this.cols = cols;
    this.rows = rows;
    this.channels = channels;
  }

  release() {
    OpenCV.releaseBuffers([this.mat.id]);
  }

  async clone(): Promise<WrappedMat> {
    const cloned = OpenCV.invoke('clone', this.mat) as Mat;
    return new WrappedMat(cloned, this.cols, this.rows, this.channels);
  }
}

export class ContourWrapper {
  readonly pointVector: PointVector;

  constructor(pointVector: PointVector) {
    this.pointVector = pointVector;
  }

  release() {
    OpenCV.releaseBuffers([this.pointVector.id]);
  }
}

function createScalar(a: number, b?: number, c?: number) {
  if (b === undefined) {
    return OpenCV.createObject(ObjectType.Scalar, a);
  }
  if (c === undefined) {
    return OpenCV.createObject(ObjectType.Scalar, a, b, 0);
  }
  return OpenCV.createObject(ObjectType.Scalar, a, b, c);
}

async function readImageFromPath(path: string, grayscale = false): Promise<WrappedMat> {
  const filePath = normalizePath(path);
  const base64 = await RNFS.readFile(filePath, 'base64');
  const srcMat = OpenCV.base64ToMat(base64);

  // 16-bit PNG fallback: toJSValue may crash, parse PNG header first
  let pngHeader;
  try {
    pngHeader = readPngHeaderFromBase64(base64);
  } catch {
    // Not a PNG, skip
  }

  const { mat, extraReleaseIds } = ensureMat8U(srcMat, pngHeader);
  const info = OpenCV.toJSValue(mat);

  if (grayscale) {
    const gray = OpenCV.createObject(
      ObjectType.Mat,
      info.rows,
      info.cols,
      DataTypes.CV_8UC1,
    );
    OpenCV.invoke('cvtColor', mat, gray, ColorConversionCodes.COLOR_BGR2GRAY);
    OpenCV.releaseBuffers([
      ...new Set([srcMat.id, mat.id, ...extraReleaseIds]),
    ]);
    return new WrappedMat(gray, info.cols, info.rows, 1);
  }

  const channels =
    info.type === DataTypes.CV_8UC1
      ? 1
      : info.type === DataTypes.CV_8UC4
        ? 4
        : 3;
  if (mat.id !== srcMat.id) {
    OpenCV.releaseBuffers([srcMat.id]);
  }
  return new WrappedMat(mat, info.cols, info.rows, channels);
}

function createSize(width: number, height: number) {
  return OpenCV.createObject(ObjectType.Size, width, height);
}

/** OpenCV GaussianBlur requires positive odd kernel width/height */
function normalizeGaussianKernel(size: number): number {
  const n = Math.max(1, Math.round(size));
  return n % 2 === 0 ? n + 1 : n;
}

const cv = {
  IMREAD_GRAYSCALE,
  THRESH_BINARY: ThresholdTypes.THRESH_BINARY,
  MORPH_RECT: MorphShapes.MORPH_RECT,
  MORPH_ELLIPSE: MorphShapes.MORPH_ELLIPSE,
  MORPH_OPEN: MorphTypes.MORPH_OPEN,
  MORPH_CLOSE: MorphTypes.MORPH_CLOSE,
  RETR_EXTERNAL: RetrievalModes.RETR_EXTERNAL,
  CHAIN_APPROX_SIMPLE: ContourApproximationModes.CHAIN_APPROX_SIMPLE,
  CHAIN_APPROX_NONE: ContourApproximationModes.CHAIN_APPROX_NONE,
  COLOR_BGR2GRAY: ColorConversionCodes.COLOR_BGR2GRAY,
  COLOR_BGR2Lab: ColorConversionCodes.COLOR_BGR2Lab,
  COLOR_Lab2BGR: ColorConversionCodes.COLOR_Lab2BGR,
  COLOR_GRAY2BGR: ColorConversionCodes.COLOR_GRAY2BGR,
  CV_8UC1: DataTypes.CV_8UC1,
  CV_16SC1: DataTypes.CV_16SC1,
  INTER_LINEAR: InterpolationFlags.INTER_LINEAR,
  INTER_NEAREST: InterpolationFlags.INTER_NEAREST,

  async ensurePngPath(path: string, cacheFileName?: string): Promise<string> {
    const name = cacheFileName ?? pngCacheName(path, 'img');
    return ensurePngFile(path, name);
  },

  async imread(path: string, flags?: number): Promise<WrappedMat> {
    const filePath = normalizePath(path);
    if (isPngPath(filePath) && (await RNFS.exists(filePath))) {
      if (flags === IMREAD_GRAYSCALE) {
        return readImageFromPath(filePath, true);
      }
      const { buffer, cols, rows } = await readPngBgrBuffer(filePath);
      return cv.bgrBufferToMat(buffer, cols, rows);
    }
    const pngPath = await ensurePngFile(path, pngCacheName(path, 'imread'));
    if (flags === IMREAD_GRAYSCALE) {
      return readImageFromPath(pngPath, true);
    }
    const { buffer, cols, rows } = await readPngBgrBuffer(pngPath);
    return cv.bgrBufferToMat(buffer, cols, rows);
  },

  createMat(cols: number, rows: number, channels: 1 | 3 | 4 = 1): WrappedMat {
    const type =
      channels === 1
        ? DataTypes.CV_8UC1
        : channels === 3
          ? DataTypes.CV_8UC3
          : DataTypes.CV_8UC4;
    const mat = OpenCV.createObject(ObjectType.Mat, rows, cols, type);
    return new WrappedMat(mat, cols, rows, channels);
  },

  async cvtColor(
    src: WrappedMat,
    code: ColorConversionCodes,
  ): Promise<WrappedMat> {
    const dst = cv.createMat(src.cols, src.rows, 1);
    OpenCV.invoke('cvtColor', src.mat, dst.mat, code);
    return dst;
  },

  /** Three-channel color space conversion (BGR/Lab etc.) */
  cvtColorBgr(src: WrappedMat, code: ColorConversionCodes): WrappedMat {
    const dst = cv.createMat(src.cols, src.rows, 3);
    OpenCV.invoke('cvtColor', src.mat, dst.mat, code);
    return dst;
  },

  /** Grayscale Mat → 3-channel BGR (for Skia display) */
  grayToBgr(src: WrappedMat): WrappedMat {
    const dst = cv.createMat(src.cols, src.rows, 3);
    OpenCV.invoke(
      'cvtColor',
      src.mat,
      dst.mat,
      ColorConversionCodes.COLOR_GRAY2BGR,
    );
    return dst;
  },

  /** Normalize mask to 3-channel BGR; return as-is if already 3-channel, color order checked by segmentation side swapBr */
  async ensureBgr3(src: WrappedMat): Promise<WrappedMat> {
    if (src.channels === 3) {
      return src;
    }

    const dst = cv.createMat(src.cols, src.rows, 3);
    const code =
      src.channels === 4
        ? ColorConversionCodes.COLOR_BGRA2BGR
        : ColorConversionCodes.COLOR_GRAY2BGR;
    OpenCV.invoke('cvtColor', src.mat, dst.mat, code);
    return dst;
  },

  /** JS binary buffer (0/255) → single-channel Mat */
  binaryBufferToMat(
    buffer: Uint8Array,
    cols: number,
    rows: number,
  ): WrappedMat {
    const mat = OpenCV.bufferToMat('uint8', rows, cols, 1, buffer);
    return new WrappedMat(mat, cols, rows, 1);
  },

  /** Continuous BGR buffer → 3-channel Mat */
  bgrBufferToMat(
    buffer: Uint8Array,
    cols: number,
    rows: number,
  ): WrappedMat {
    const mat = OpenCV.bufferToMat('uint8', rows, cols, 3, buffer);
    return new WrappedMat(mat, cols, rows, 3);
  },

  /** Write JS-side grayscale binary image to temp PGM and read back as Mat */
  async grayBufferToMat(
    gray: Uint8Array,
    cols: number,
    rows: number,
  ): Promise<WrappedMat> {
    const path = `${RNFS.CachesDirectoryPath}/seg_bin_${Date.now()}.pgm`;
    const header = `P5\n${cols} ${rows}\n255\n`;
    const headerBytes = new TextEncoder().encode(header);
    const fileBytes = new Uint8Array(headerBytes.length + gray.length);
    fileBytes.set(headerBytes, 0);
    fileBytes.set(gray, headerBytes.length);

    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < fileBytes.length; i += chunkSize) {
      const slice = fileBytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...slice);
    }

    await RNFS.writeFile(path, btoa(binary), 'base64');
    try {
      return readImageFromPath(path, true);
    } finally {
      if (await RNFS.exists(path)) {
        await RNFS.unlink(path);
      }
    }
  },

  /**
   * Export Mat pixels. Clone first to ensure contiguous memory, avoiding row misalignment from native matToBuffer ignoring step.
   */
  matToBuffer(src: WrappedMat): {
    buffer: Uint8Array;
    cols: number;
    rows: number;
    channels: number;
  } {
    const continuous = OpenCV.invoke('clone', src.mat) as Mat;
    try {
      const { buffer, cols, rows, channels } = OpenCV.matToBuffer(
        continuous,
        'uint8',
      );
      return { buffer, cols, rows, channels };
    } finally {
      OpenCV.releaseBuffers([continuous.id]);
    }
  },

  async inRangeBgr(
    src: WrappedMat,
    color: BgrColor,
    tolerance: number,
    dst: WrappedMat,
  ): Promise<void> {
    const lower = createScalar(
      Math.max(0, color.b - tolerance),
      Math.max(0, color.g - tolerance),
      Math.max(0, color.r - tolerance),
    );
    const upper = createScalar(
      Math.min(255, color.b + tolerance),
      Math.min(255, color.g + tolerance),
      Math.min(255, color.r + tolerance),
    );
    OpenCV.invoke('inRange', src.mat, lower, upper, dst.mat);
  },

  async resize(
    src: WrappedMat,
    dst: WrappedMat,
    size: { width: number; height: number },
    interpolation: InterpolationFlags = InterpolationFlags.INTER_LINEAR,
  ): Promise<void> {
    const dsize = createSize(size.width, size.height);
    OpenCV.invoke('resize', src.mat, dst.mat, dsize, 0, 0, interpolation);
    dst.cols = size.width;
    dst.rows = size.height;
  },

  /** Native BGR buffer resize (mask uses semantic colors, default nearest-neighbor) */
  async resizeBgrBuffer(
    buffer: Uint8Array,
    srcCols: number,
    srcRows: number,
    dstCols: number,
    dstRows: number,
    interpolation: InterpolationFlags = InterpolationFlags.INTER_NEAREST,
  ): Promise<Uint8Array> {
    if (srcCols === dstCols && srcRows === dstRows) {
      return buffer;
    }

    const srcMat = cv.bgrBufferToMat(buffer, srcCols, srcRows);
    const dstMat = cv.createMat(dstCols, dstRows, 3);
    try {
      await cv.resize(srcMat, dstMat, { width: dstCols, height: dstRows }, interpolation);
      return cv.matToBuffer(dstMat).buffer;
    } finally {
      srcMat.release();
      dstMat.release();
    }
  },

  /** BGR Mat → RGBA continuous buffer (for Skia direct transfer) */
  async matToRgbaBuffer(src: WrappedMat): Promise<{
    buffer: Uint8Array;
    cols: number;
    rows: number;
  }> {
    const dst = cv.createMat(src.cols, src.rows, 4);
    try {
      OpenCV.invoke(
        'cvtColor',
        src.mat,
        dst.mat,
        ColorConversionCodes.COLOR_BGR2RGBA,
      );
      const { buffer, cols, rows } = cv.matToBuffer(dst);
      return { buffer, cols, rows };
    } finally {
      dst.release();
    }
  },

  /** BGR Mat → Skia image (bypasses low/high freq PNG encoding) */
  async matToSkiaImage(src: WrappedMat): Promise<SkImage | null> {
    const { buffer, cols, rows } = await cv.matToRgbaBuffer(src);
    return rgbaBufferToSkiaImage(buffer, cols, rows);
  },

  /** Single-channel grayscale Mat → Skia RGBA (bypasses BGR pseudocolor + 4-channel matToBuffer) */
  grayMatToSkiaImage(src: WrappedMat): SkImage | null {
    const { buffer, cols, rows } = cv.matToBuffer(src);
    const pixelCount = cols * rows;
    const rgba = new Uint8Array(pixelCount * 4);
    for (let i = 0; i < pixelCount; i++) {
      const value = buffer[i];
      const offset = i * 4;
      rgba[offset] = value;
      rgba[offset + 1] = value;
      rgba[offset + 2] = value;
      rgba[offset + 3] = 255;
    }
    return rgbaBufferToSkiaImage(rgba, cols, rows);
  },

  /** Continuous BGR buffer → Skia image (work-resolution origin / freq layers, reusing OpenCV decode result) */
  async bgrBufferToSkiaImage(
    buffer: Uint8Array,
    cols: number,
    rows: number,
  ): Promise<SkImage | null> {
    const mat = cv.bgrBufferToMat(buffer, cols, rows);
    try {
      return await cv.matToSkiaImage(mat);
    } finally {
      mat.release();
    }
  },

  async threshold(
    src: WrappedMat,
    dst: WrappedMat,
    thresh: number,
    maxval: number,
    type: number,
  ): Promise<void> {
    OpenCV.invoke('threshold', src.mat, dst.mat, thresh, maxval, type);
  },

  async getStructuringElement(
    shape: MorphShapes,
    ksize: { width: number; height: number },
  ): Promise<WrappedMat> {
    const size = createSize(ksize.width, ksize.height);
    const kernel = OpenCV.invoke('getStructuringElement', shape, size) as Mat;
    return new WrappedMat(kernel, ksize.width, ksize.height, 1);
  },

  async morphologyEx(
    src: WrappedMat,
    dst: WrappedMat,
    op: MorphTypes,
    kernel: WrappedMat,
  ): Promise<void> {
    OpenCV.invoke('morphologyEx', src.mat, dst.mat, op, kernel.mat);
  },

  async findContours(
    image: WrappedMat,
    mode: RetrievalModes,
    method: ContourApproximationModes,
  ): Promise<ContourWrapper[]> {
    const contours = OpenCV.createObject(ObjectType.PointVectorOfVectors);
    OpenCV.invoke('findContours', image.mat, contours, mode, method);
    const data = OpenCV.toJSValue(contours);
    const wrappers = data.array.map((_, index) => {
      const pv = OpenCV.copyObjectFromVector(contours, index) as PointVector;
      return new ContourWrapper(pv);
    });
    OpenCV.releaseBuffers([contours.id]);
    return wrappers;
  },

  async contourArea(contour: ContourWrapper): Promise<number> {
    const result = OpenCV.invoke('contourArea', contour.pointVector, false);
    return result.value;
  },

  async boundingRect(contour: ContourWrapper): Promise<BBox> {
    const rect = OpenCV.invoke('boundingRect', contour.pointVector);
    const js = OpenCV.toJSValue(rect);
    return { x: js.x, y: js.y, width: js.width, height: js.height };
  },

  async arcLength(contour: ContourWrapper, closed: boolean): Promise<number> {
    const result = OpenCV.invoke('arcLength', contour.pointVector, closed);
    return result.value;
  },

  async approxPolyDP(
    contour: ContourWrapper,
    epsilon: number,
    closed: boolean,
  ): Promise<Point[]> {
    const approx = OpenCV.createObject(ObjectType.PointVector);
    try {
      OpenCV.invoke('approxPolyDP', contour.pointVector, approx, epsilon, closed);
      return OpenCV.toJSValue(approx).array;
    } finally {
      OpenCV.releaseBuffers([approx.id]);
    }
  },

  async GaussianBlur(
    src: WrappedMat,
    dst: WrappedMat,
    ksize: { width: number; height: number },
    sigma: number,
  ): Promise<void> {
    const width = normalizeGaussianKernel(ksize.width);
    const height = normalizeGaussianKernel(ksize.height);
    const size = createSize(width, height);
    OpenCV.invoke('GaussianBlur', src.mat, dst.mat, size, sigma);
  },

  extractChannel(src: WrappedMat, dst: WrappedMat, channel: number): void {
    OpenCV.invoke('extractChannel', src.mat, dst.mat, channel);
  },

  convertTo(
    src: WrappedMat,
    dst: WrappedMat,
    rtype: number,
    alpha = 1,
    beta = 0,
  ): void {
    OpenCV.invoke('convertTo', src.mat, dst.mat, rtype, alpha, beta);
  },

  async subtract(src1: WrappedMat, src2: WrappedMat, dst: WrappedMat): Promise<void> {
    OpenCV.invoke('subtract', src1.mat, src2.mat, dst.mat);
  },

  async addWeighted(
    src1: WrappedMat,
    alpha: number,
    src2: WrappedMat | null,
    beta: number,
    gamma: number,
    dst: WrappedMat,
  ): Promise<void> {
    if (src2) {
      OpenCV.invoke('addWeighted', src1.mat, alpha, src2.mat, beta, gamma, dst.mat);
    } else {
      OpenCV.invoke('addWeighted', src1.mat, alpha, src1.mat, 0, gamma, dst.mat);
    }
  },

  async imwrite(path: string, mat: WrappedMat): Promise<void> {
    const filePath = normalizePath(path);
    OpenCV.saveMatToFile(mat.mat, filePath, 'png', PNG_COMPRESSION);
  },
};

export default cv;
