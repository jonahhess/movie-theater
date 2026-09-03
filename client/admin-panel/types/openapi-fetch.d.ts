declare module "openapi-fetch" {
  export * from "openapi-fetch/dist/index.cjs";

  import createClient = require("openapi-fetch/dist/index.cjs");
  export default createClient;
}
