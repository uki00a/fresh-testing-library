import type { PartialProps } from "$fresh/runtime.ts";
import { Partial } from "$fresh/runtime.ts";
import type { Manifest } from "$fresh/server.ts";
import { h, VNode } from "preact";
import type { Props as ClientNavContainerProps } from "./ClientNavContainer.tsx";
import type { PartialsUpdater } from "./ClientNavContainer.tsx";
import { ClientNavContainer } from "./ClientNavContainer.tsx";
// TODO: Don't import this from `./mod.ts`.
import { findMatchingRouteAndPathPatternFromManifest } from "./mod.ts";

interface VNodeHook {
  (vnode: VNode): void;
}

interface CreateVnodeHookResult {
  vnode: VNodeHook;
  cleanup(): void;
}

const kFreshClientNav = "f-client-nav";

interface ManifestAccessor {
  (): Manifest | undefined;
}

function createPartialsUpdater(
  manifestAccessor: ManifestAccessor,
): PartialsUpdater {
  function updatePartials(event: Event, url: URL) {
    const manifest = manifestAccessor();
    if (manifest == null) {
      // TODO: Output warnings?
      return;
    }
    const request = new Request(url);
    const maybeRouteAndPattern = findMatchingRouteAndPathPatternFromManifest(
      request,
      manifest,
    );
    if (maybeRouteAndPattern == null) {
      // TODO: Output warnings?
      return;
    }

    event.preventDefault();
    const [_route] = maybeRouteAndPattern;
    // TODO: implement route handling.
    return;
  }
  return updatePartials;
}

export function createVnodeHook(
  next: VNodeHook | undefined,
  manifestAccessor: ManifestAccessor,
  maybeLocation?: Location,
): CreateVnodeHookResult {
  const encounteredPartialNames = new Set<string>();
  const updatePartials = createPartialsUpdater(manifestAccessor);
  const origin = maybeLocation ? maybeLocation.origin : "http://localhost:8000";
  function vnode(vnode: VNode): void {
    if (hasFreshClientNavContainerAttr(vnode)) {
      vnode.props.children = h(ClientNavContainer, {
        children: vnode.props.children,
        updatePartials,
        origin,
      });
    }
    if (isPartial(vnode)) {
      encounteredPartialNames.add(vnode.props.name);
    }

    return next?.(vnode);
  }
  function cleanup(): void {
    encounteredPartialNames.clear();
  }
  return { vnode, cleanup };
}

function hasFreshClientNavContainerAttr(
  // deno-lint-ignore no-explicit-any
  vnode: VNode<any>,
): vnode is VNode<ClientNavContainerProps> {
  return vnode.type !== ClientNavContainer && vnode.props[kFreshClientNav] &&
    vnode.props.children != null;
}

function isPartial(
  // deno-lint-ignore no-explicit-any
  vnode: VNode<any>,
): vnode is VNode<PartialProps> {
  return vnode.type === Partial;
}
