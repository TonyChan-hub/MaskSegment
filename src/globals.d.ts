// Supplemental type declarations for global APIs available at React Native runtime

declare var performance: {
  now(): number;
};

declare function btoa(data: string): string;
declare function atob(data: string): string;

declare var TextEncoder: {
  prototype: TextEncoder;
  new (): TextEncoder;
};

declare interface TextEncoder {
  encode(input?: string): Uint8Array;
  encodeInto(input: string, dest: Uint8Array): { read: number; written: number };
  readonly encoding: string;
}
