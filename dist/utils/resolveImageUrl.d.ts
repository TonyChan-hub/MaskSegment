export declare function hashUrl(url: string): string;
/** Resolve a local path or remote URL to a PNG local path readable by OpenCV / RNFS */
export declare function resolveImageUrl(source: string, cacheFileName?: string): Promise<string>;
