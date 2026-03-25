/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Backend base URL with no trailing slash (e.g. https://edualign-api.fly.dev). Leave unset for local dev proxy. */
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "react-plotly.js" {
  import type { ComponentType } from "react";
  const Plot: ComponentType<Record<string, unknown>>;
  export default Plot;
}
