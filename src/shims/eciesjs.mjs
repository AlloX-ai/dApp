/**
 * ESM facade for eciesjs (CJS). @metamask/connect-multichain does
 * `const { PrivateKey } = await import("eciesjs")`; Vite's CJS interop can
 * leave PrivateKey undefined on the namespace object.
 */
import * as eciesNamespace from "../../node_modules/eciesjs/dist/index.js";

const ecies =
  typeof eciesNamespace.PrivateKey === "function"
    ? eciesNamespace
    : eciesNamespace.default ?? eciesNamespace;

export const PrivateKey = ecies.PrivateKey;
export const PublicKey = ecies.PublicKey;
export const encrypt = ecies.encrypt;
export const decrypt = ecies.decrypt;
export const ECIES_CONFIG = ecies.ECIES_CONFIG;
export const utils = ecies.utils;

export default ecies;
