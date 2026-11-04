declare module "*.css";

interface ImportMetaEnv {
  readonly VITE_MARKET_WS_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
