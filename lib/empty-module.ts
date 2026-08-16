/**
 * Stub target for the `canvas` alias in next.config.ts.
 *
 * Konva's Node build does `require("canvas")` to get a server-side 2D context.
 * We never render Konva on the server (see components/canvas/canvas-host.tsx),
 * so resolving that import to an empty module keeps the optional native
 * dependency out of the build instead of failing with "Module not found".
 */
const emptyModule = {};

export default emptyModule;
