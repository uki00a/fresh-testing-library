/**
 * The version of `preact-render-to-string` should match what is loaded in [src/server/deps.ts](https://github.com/denoland/fresh/blob/main/src/server/deps.ts).
 *
 * TODO(uki00a): I'd like to automate the synchronization of `preact-render-to-string` versions.
 *
 * {@link https://github.com/denoland/fresh/pull/1684}
 * {@link https://github.com/denoland/fresh/blob/5de34aac93a0090d85d6cd449c413b97a98f018e/src/server/deps.ts#L23}
 */
export { render } from "https://esm.sh/*preact-render-to-string@6.2.2";
