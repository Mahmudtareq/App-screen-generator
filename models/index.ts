/**
 * Registration barrel.
 *
 * Importing a model for its side effect is what makes `ref` population and
 * `syncIndexes` work regardless of which action happened to load first.
 */
export { User, type IUser } from "./User";
export { Project, type IProject } from "./Project";
export { Asset, type IAsset } from "./Asset";
