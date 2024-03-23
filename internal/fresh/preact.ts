import type { PartialProps } from "$fresh/runtime.ts";
import { Partial as FreshPartial } from "$fresh/runtime.ts";
import type { VNode } from "preact";
import { h } from "preact";
import type { Props as ClientNavContainerProps } from "./ClientNavContainer.ts";
import type { PartialsUpdater } from "./partials.ts";
import { ClientNavContainer } from "./ClientNavContainer.ts";
import { Partial as FTLPartial } from "./Partial.ts";

interface VNodeHook {
  (vnode: VNode): void;
}

interface CreateVnodeHookResult {
  vnode: VNodeHook;
  cleanup(): void;
}

const kFreshClientNavAttribute = "f-client-nav";

export function createVnodeHook(
  next: VNodeHook | undefined,
  updatePartials: PartialsUpdater,
  isCSR: () => boolean,
  maybeLocation?: Location,
): CreateVnodeHookResult {
  const origin = maybeLocation ? maybeLocation.origin : "http://localhost:8000";
  function vnode(vnode: VNode): void {
    if (hasFreshClientNavContainerAttr(vnode)) {
      vnode.props.children = h(ClientNavContainer, {
        children: vnode.props.children,
        updatePartials,
        origin,
      });
    } else if (isPartial(vnode)) {
      vnode.props.children = h(FTLPartial, { ...vnode.props, isCSR: isCSR() });
    }

    return next?.(vnode);
  }

  function cleanup(): void {
    // NOOP
  }

  return { vnode, cleanup };
}

function hasFreshClientNavContainerAttr(
  // deno-lint-ignore no-explicit-any
  vnode: VNode<any>,
): vnode is VNode<ClientNavContainerProps> {
  return vnode.type !== ClientNavContainer &&
    vnode.props[kFreshClientNavAttribute] &&
    vnode.props.children != null;
}

function isPartial(
  // deno-lint-ignore no-explicit-any
  vnode: VNode<any>,
): vnode is VNode<PartialProps> {
  return vnode.type === FreshPartial;
}
