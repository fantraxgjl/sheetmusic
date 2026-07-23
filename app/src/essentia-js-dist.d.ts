// essentia.js's browser-targeted WASM/core builds have no bundled type
// declarations for their deep dist paths (only the Node-oriented main entry
// does). Declared loosely here since this app treats the Essentia instance
// as `any` internally anyway — see src/lib/essentiaEngine.ts for why the
// deep imports are necessary in the first place.
declare module 'essentia.js/dist/essentia-wasm.web.js' {
  const factory: (opts?: object) => Promise<unknown>
  export default factory
}

declare module 'essentia.js/dist/essentia.js-core.es.js' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Essentia: new (wasmModule: unknown) => any
  export default Essentia
}
