/**
 * essentia.js ships as an Emscripten/WASM module with no reliable bundler-friendly
 * entry point: the package's default "main" is a Node-oriented UMD build that
 * silently fails to instantiate its WASM under Vite (loads without throwing, but
 * the compiled algorithm bindings are missing). The browser-targeted factory
 * build (`essentia-wasm.web.js` + a separately-fetched `.wasm` binary) is the one
 * that actually works, so it's loaded explicitly here with `locateFile` pointed
 * at the copy in `public/`. Verified working in a real browser before relying on
 * it for the rest of this pipeline.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EssentiaInstance = any

let essentiaPromise: Promise<EssentiaInstance> | undefined

export function getEssentia(): Promise<EssentiaInstance> {
  if (!essentiaPromise) {
    essentiaPromise = (async () => {
      const wasmMod = await import('essentia.js/dist/essentia-wasm.web.js')
      const factory = (wasmMod as { default: (opts?: object) => Promise<unknown> }).default
      const wasmModule = await factory({ locateFile: () => '/essentia-wasm.web.wasm' })

      const coreMod = await import('essentia.js/dist/essentia.js-core.es.js')
      const EssentiaCtor = (coreMod as { default: new (wasm: unknown) => EssentiaInstance }).default
      return new EssentiaCtor(wasmModule)
    })()
  }
  return essentiaPromise
}
