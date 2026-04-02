// 真实入口由 config 中的 alias @braintree/sanitize-url-cjs 指到 node_modules 内 dist/index.js
import pkg from "@braintree/sanitize-url-cjs";
export const sanitizeUrl = pkg.sanitizeUrl;
