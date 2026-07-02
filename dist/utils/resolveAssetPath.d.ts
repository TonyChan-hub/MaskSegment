/** Resolve a require() asset to a PNG local path (readable by OpenCV / RNFS) */
export declare function resolveAssetPath(assetModule: number, cacheFileName: string): Promise<string>;
