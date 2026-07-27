/**
 * Shared shape for "text I cannot render yet".
 *
 * Modules that are deliberately language-free (hooks talking to the
 * camera/WASM, the pure engine) hand back a stable key plus interpolation
 * data; only the React layer turns it into a sentence.
 *
 * Type-only module: importing it pulls in no i18next runtime.
 */
export interface TextNote {
  /** i18n key, e.g. `camera.error.permissionDenied`. */
  key: string;
  /** Interpolation values for the key. */
  params?: Record<string, string | number>;
}
