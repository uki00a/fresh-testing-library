/**
 * The version of `preact-render-to-string` should match what is loaded in [src/server/deps.ts](https://github.com/denoland/fresh/blob/main/src/server/deps.ts).
 *
 * TODO(uki00a): I'd like to automate the synchronization of `preact-render-to-string` versions.
 *
 * {@link https://github.com/denoland/fresh/pull/1684}
 * {@link https://github.com/denoland/fresh/blob/1.6.0/src/server/deps.ts#L25}
 */
export { render } from "https://esm.sh/*preact-render-to-string@6.3.1";
