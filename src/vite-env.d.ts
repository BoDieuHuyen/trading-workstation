/// <reference types="vite/client" />

declare module "*.css";

declare module "*.js?url" {
  const url: string;
  export default url;
}
