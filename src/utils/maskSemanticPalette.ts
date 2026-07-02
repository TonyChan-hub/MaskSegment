import {
  getMaskRuntimeRevision,
  getMaskSegmentRuntimeConfig,
} from './maskSegmentRuntime';

export type MaskSemanticColor = {
  name: string;
  hex: string;
  /** reference color (BGR, consistent with mask buffer channel) */
  bgr: { b: number; g: number; r: number };
};

/** mask semantic color table (consistent with backend partition color reference) */
export const MASK_SEMANTIC_COLORS: MaskSemanticColor[] = [
  { name: 'door', hex: '#E6194B', bgr: { b: 75, g: 25, r: 230 } },
  { name: 'ceiling', hex: '#3CB44B', bgr: { b: 75, g: 180, r: 60 } },
  { name: 'cabinet', hex: '#FFE119', bgr: { b: 25, g: 225, r: 255 } },
  { name: 'wall', hex: '#4363D8', bgr: { b: 216, g: 99, r: 67 } },
  { name: 'baseboard', hex: '#F58231', bgr: { b: 49, g: 130, r: 245 } },
  { name: 'windowFrame', hex: '#911EB4', bgr: { b: 180, g: 30, r: 145 } },
  { name: 'garageDoor', hex: '#46F0F0', bgr: { b: 240, g: 240, r: 70 } },
  { name: 'roof', hex: '#F032E6', bgr: { b: 230, g: 50, r: 240 } },
  { name: 'eave', hex: '#BCF60C', bgr: { b: 12, g: 246, r: 188 } },
];

export const BASEBOARD_SEMANTIC_NAME = 'baseboard';

type SemanticRgbEntry = {
  name: string;
  rgb: { r: number; g: number; b: number };
};

type SemanticContext = {
  baseboardMaxColorDistSq: number;
  semanticRgb: SemanticRgbEntry[];
  baseboardRgb: SemanticRgbEntry;
  cabinetRgb: SemanticRgbEntry;
  wallRgb: SemanticRgbEntry;
};

let contextRevision = -1;
let cachedContext: SemanticContext | null = null;

function buildSemanticRgb(colors: MaskSemanticColor[]): SemanticRgbEntry[] {
  return colors.map(entry => ({
    name: entry.name,
    rgb: {
      r: entry.bgr.r,
      g: entry.bgr.g,
      b: entry.bgr.b,
    },
  }));
}

function getDefaultSemanticEntry(name: string): SemanticRgbEntry {
  const color = MASK_SEMANTIC_COLORS.find(c => c.name === name)!;
  return {
    name: color.name,
    rgb: { r: color.bgr.r, g: color.bgr.g, b: color.bgr.b },
  };
}

function getSemanticContext(): SemanticContext {
  const revision = getMaskRuntimeRevision();
  if (contextRevision === revision && cachedContext) {
    return cachedContext;
  }

  const mask = getMaskSegmentRuntimeConfig().mask;
  const semanticRgb = buildSemanticRgb(mask.semanticColors);
  const baseboardRgb =
    semanticRgb.find(
      entry => entry.name === BASEBOARD_SEMANTIC_NAME,
    ) ?? getDefaultSemanticEntry(BASEBOARD_SEMANTIC_NAME);
  const cabinetRgb =
    semanticRgb.find(entry => entry.name === 'cabinet') ??
    getDefaultSemanticEntry('cabinet');
  const wallRgb =
    semanticRgb.find(entry => entry.name === 'wall') ??
    getDefaultSemanticEntry('wall');
  const maxDist = mask.baseboardMaxColorDist;

  cachedContext = {
    baseboardMaxColorDistSq: maxDist * maxDist,
    semanticRgb,
    baseboardRgb,
    cabinetRgb,
    wallRgb,
  };
  contextRevision = revision;
  return cachedContext;
}

function colorDistanceSq(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return dr * dr + dg * dg + db * db;
}

/** classify mask pixel to the nearest semantic color (baseboard only strictly hit orange) */
export function classifyBgrPixelToSemantic(
  b: number,
  g: number,
  r: number,
): string {
  const ctx = getSemanticContext();
  const pixel = { r, g, b };
  const distToBaseboard = colorDistanceSq(pixel, ctx.baseboardRgb.rgb);
  const distToCabinet = colorDistanceSq(pixel, ctx.cabinetRgb.rgb);
  const distToWall = colorDistanceSq(pixel, ctx.wallRgb.rgb);

  if (
    distToBaseboard <= ctx.baseboardMaxColorDistSq &&
    distToBaseboard < distToCabinet &&
    distToBaseboard < distToWall
  ) {
    return BASEBOARD_SEMANTIC_NAME;
  }

  let best = ctx.semanticRgb[0];
  let bestDist = Number.POSITIVE_INFINITY;

  for (const entry of ctx.semanticRgb) {
    if (entry.name === BASEBOARD_SEMANTIC_NAME) {
      continue;
    }
    const dist = colorDistanceSq(pixel, entry.rgb);
    if (dist < bestDist) {
      bestDist = dist;
      best = entry;
    }
  }

  return best?.name ?? 'wall';
}

export function getSemanticColorByName(name: string): MaskSemanticColor | undefined {
  const colors = getMaskSegmentRuntimeConfig().mask.semanticColors;
  return colors.find(entry => entry.name === name);
}

/**
 * The baseboard must be closer to #F58231 and significantly better than the yellow cabinet / blue wall, to avoid being mistakenly judged as a whole yellow area.
 */
export function isStrictBaseboardPixel(
  b: number,
  g: number,
  r: number,
): boolean {
  const ctx = getSemanticContext();
  const pixel = { r, g, b };
  const distToBaseboard = colorDistanceSq(pixel, ctx.baseboardRgb.rgb);
  const distToCabinet = colorDistanceSq(pixel, ctx.cabinetRgb.rgb);
  const distToWall = colorDistanceSq(pixel, ctx.wallRgb.rgb);

  return (
    distToBaseboard <= ctx.baseboardMaxColorDistSq &&
    distToBaseboard < distToCabinet &&
    distToBaseboard < distToWall
  );
}

export function isBaseboardPixel(b: number, g: number, r: number): boolean {
  return isStrictBaseboardPixel(b, g, r);
}

/** quantized color of the wall/cabinet junction strip on the mask */
export const BASEBOARD_STRIP_QUANT_KEYS = new Set(['0,255,255', '64,255,255']);

/** quantized color of the wall on the mask */
export const WALL_QUANT_KEYS = new Set([
  '192,128,64',
  '192,64,64',
  '128,64,64',
  '192,192,128',
  '128,128,64',
]);

/** quantized color of the cabinet/floor on the mask */
export const CABINET_QUANT_KEYS = new Set([
  '0,192,255',
  '64,192,255',
  '128,192,255',
]);

export function getBaseboardStripQuantKeys(): Set<string> {
  return getMaskSegmentRuntimeConfig().mask.baseboardStripQuantKeys;
}

export function getWallQuantKeys(): Set<string> {
  return getMaskSegmentRuntimeConfig().mask.wallQuantKeys;
}

export function getCabinetQuantKeys(): Set<string> {
  return getMaskSegmentRuntimeConfig().mask.cabinetQuantKeys;
}
