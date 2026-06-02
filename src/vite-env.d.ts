/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SHOW_FULL_AUTH_UI?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
