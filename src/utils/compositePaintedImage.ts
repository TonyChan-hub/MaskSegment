import { Buffer } from 'buffer';
import RNFS from 'react-native-fs';
import type { BgrColor, SavePaintResult } from '../components/MaskSegmentCanvas.types';
import type { SkImage } from '@shopify/react-native-skia';
// upng-js: used for PNG encode of CPU recolor.
import UPNG from 'upng-js';
import { renderPaintedImageOffscreen } from './paintShaderRuntime';
import { writePngBase64ToFile, writePngBytesToFile } from './exportUtils';

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

/**
 * CPU recolor: directly map pick codes to painted BGR colors (or copy origin).
 * Produces RGBA PNG bytes via upng-js. This is the *fallback* path when rich shader offscreen
 * is not available or fails. It produces flat colors without the editor's lighting + freq texture.
 */
function cpuRecolorToPngBytes(
  originBgr: Uint8Array,
  pickBuffer: Uint8Array,
  paintedRegions: Map<number, BgrColor>,
  cols: number,
  rows: number,
): Uint8Array {
  const pixelCount = cols * rows;
  const rgba = new Uint8Array(pixelCount * 4);
  const colorByPickCode = new Map<number, BgrColor>();
  for (const [regionId, color] of paintedRegions) {
    colorByPickCode.set(regionId + 1, color);
  }
  for (let i = 0; i < pixelCount; i++) {
    const code = pickBuffer[i];
    const color = code > 0 ? colorByPickCode.get(code) : undefined;
    const d = i * 4;
    if (color) {
      rgba[d] = color.r;
      rgba[d + 1] = color.g;
      rgba[d + 2] = color.b;
      rgba[d + 3] = 255;
    } else {
      const s = i * 3;
      rgba[d] = originBgr[s + 2]; // RGB <- BGR
      rgba[d + 1] = originBgr[s + 1];
      rgba[d + 2] = originBgr[s];
      rgba[d + 3] = 255;
    }
  }
  const png = UPNG.encode([rgba.buffer], cols, rows, 0);
  return new Uint8Array(png as ArrayBuffer);
}

/** Export painted regions as a recolored PNG.
 * Priority (best to fallback):
 * 1. exportPngBytes (full shader result captured by caller via makeImageSnapshot on high-res Canvas) — recommended "snapshot" path, no CPU per-pixel, no secondary drawAsImage.
 * 2. shaderTextures + render* (rebuild same PaintShaderLayer + SkSL via renderPaintedImageOffscreen / drawAsImage).
 * 3. CPU per-pixel recolor (flat, no lighting/texture, last-resort fallback ensuring save never breaks).
 */
export async function compositePaintedImage(
  input: CompositePaintInput,
): Promise<SavePaintResult> {
  const {
    originBuffer,
    cols,
    rows,
    pickBuffer,
    paintedRegions,
    destDir,
    exportPngBase64,
    exportPngBytes,
    shaderTextures,
    renderWidth,
    renderHeight,
  } = input;
  if (paintedRegions.size === 0) {
    throw new Error('No painted regions, cannot save');
  }

  if (pickBuffer.length !== cols * rows) {
    const msg = 'pickMap size does not match image';
    console.error('[VIZ-SAVE] composite will throw:', msg, { pickLen: pickBuffer.length, expected: cols * rows, cols, rows });
    throw new Error(msg);
  }
  if (originBuffer.length !== cols * rows * 3) {
    const msg = 'Original buffer size does not match image';
    console.error('[VIZ-SAVE] composite will throw:', msg, { originLen: originBuffer.length, expected: cols * rows * 3, cols, rows });
    throw new Error(msg);
  }

  let pngBytesForWrite: Uint8Array | undefined;
  let pngBase64ForWrite: string | undefined;
  let usedSnapshot = false;
  let usedRichShader = false;

  // 1) Highest priority: pre-encoded PNG base64 from makeImageSnapshot (no extra conversion).
  if (exportPngBase64 && exportPngBase64.length > 0) {
    pngBase64ForWrite = exportPngBase64;
    usedSnapshot = true;
  }
  // 1b) Snapshot bytes fallback (legacy callers).
  else if (exportPngBytes && exportPngBytes.length > 0) {
    pngBytesForWrite = exportPngBytes;
    usedSnapshot = true;
  }
  // 2) Rich fallback: use live textures + drawAsImage to rebuild shader result matching the editor (with lighting + freq texture).
  else if (shaderTextures && renderWidth && renderHeight) {
    try {
      const offImg = await renderPaintedImageOffscreen({
        originImage: shaderTextures.originImage,
        paintColorMap: shaderTextures.paintColorMap,
        lowFreqImage: shaderTextures.lowFreqImage,
        highFreqImage: shaderTextures.highFreqImage,
        width: renderWidth,
        height: renderHeight,
        showOrigin: false,
      });
      if (offImg) {
        let b64 = '';
        try {
          const enc = (offImg as any).encodeToBase64;
          if (typeof enc === 'function') {
            b64 = enc.call(offImg) || '';
          }
        } catch (encErr) {
          console.warn('[VIZ-SAVE] offscreen encodeToBase64 failed:', encErr);
        }
        if (b64 && b64.length > 0) {
          pngBytesForWrite = new Uint8Array(Buffer.from(b64, 'base64'));
          usedRichShader = true;
        }
        try {
          const disp = (offImg as any).dispose;
          if (typeof disp === 'function') disp.call(offImg);
        } catch {}
      }
    } catch (e) {
      console.warn('[VIZ-SAVE] rich shader offscreen for export failed (will fallback):', e);
    }
  }

  // 3) Last-resort fallback: CPU per-pixel (flat color, no editor appearance).
  if (!pngBase64ForWrite && !pngBytesForWrite) {
    try {
      pngBytesForWrite = cpuRecolorToPngBytes(originBuffer, pickBuffer, paintedRegions, cols, rows);
    } catch (e) {
      throw new Error('CPU recolor PNG decoding failed');
    }
  }
  const dir = destDir ?? RNFS.CachesDirectoryPath;
  const filePath = `${dir}/painted_${Date.now()}.png`;
  try {
    if (pngBase64ForWrite) {
      await writePngBase64ToFile(filePath, pngBase64ForWrite);
    } else {
      await writePngBytesToFile(filePath, pngBytesForWrite!);
    }
    void usedSnapshot;
    void usedRichShader;
  } catch (e) {
    console.error('[VIZ-SAVE] composite writeFile threw:', e, { filePath, dir });
    throw e;
  }

  return {
    filePath,
    width: cols,
    height: rows,
    paintedCount: paintedRegions.size,
  };
}
