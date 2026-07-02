export type MaskSemanticColor = {
    name: string;
    hex: string;
    /** reference color (BGR, consistent with mask buffer channel) */
    bgr: {
        b: number;
        g: number;
        r: number;
    };
};
/** mask semantic color table (consistent with backend partition color reference) */
export declare const MASK_SEMANTIC_COLORS: MaskSemanticColor[];
export declare const BASEBOARD_SEMANTIC_NAME = "baseboard";
/** classify mask pixel to the nearest semantic color (baseboard only strictly hit orange) */
export declare function classifyBgrPixelToSemantic(b: number, g: number, r: number): string;
export declare function getSemanticColorByName(name: string): MaskSemanticColor | undefined;
/**
 * The baseboard must be closer to #F58231 and significantly better than the yellow cabinet / blue wall, to avoid being mistakenly judged as a whole yellow area.
 */
export declare function isStrictBaseboardPixel(b: number, g: number, r: number): boolean;
export declare function isBaseboardPixel(b: number, g: number, r: number): boolean;
/** quantized color of the wall/cabinet junction strip on the mask */
export declare const BASEBOARD_STRIP_QUANT_KEYS: Set<string>;
/** quantized color of the wall on the mask */
export declare const WALL_QUANT_KEYS: Set<string>;
/** quantized color of the cabinet/floor on the mask */
export declare const CABINET_QUANT_KEYS: Set<string>;
export declare function getBaseboardStripQuantKeys(): Set<string>;
export declare function getWallQuantKeys(): Set<string>;
export declare function getCabinetQuantKeys(): Set<string>;
