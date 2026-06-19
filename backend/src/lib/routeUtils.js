import { asyncHandler } from "./asyncHandler.js";

/** Encapsula método de controller com asyncHandler. */
export const ah = (controller, method) =>
  asyncHandler((req, res) => controller[method](req, res));
