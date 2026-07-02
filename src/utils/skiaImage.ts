import {
  Skia,
  AlphaType,
  ColorType,
  type SkImage,
} from '@shopify/react-native-skia';

/** Continuous RGBA buffer → Skia image (direct memory transfer for freq layers / work buffer origin, avoids PNG roundtrip) */
export function rgbaBufferToSkiaImage(
  buffer: Uint8Array,
  cols: number,
  rows: number,
): SkImage | null {
  const data = Skia.Data.fromBytes(buffer);
  return Skia.Image.MakeImage(
    {
      width: cols,
      height: rows,
      alphaType: AlphaType.Opaque,
      colorType: ColorType.RGBA_8888,
    },
    data,
    cols * 4,
  );
}
