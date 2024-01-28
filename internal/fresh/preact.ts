import type { PartialProps } from "$fresh/runtime.ts";
import { Partial } from "$fresh/runtime.ts";
import type { Manifest } from "$fresh/server.ts";
import type { ComponentChildren } from "preact";
import { Fragment, h, VNode } from "preact";
import { useEffect } from "preact/hooks";
import type { Props as ClientNavContainerProps } from "./ClientNavContainer.tsx";
import { ClientNavContainer } from "./ClientNavContainer.tsx";

interface VNodeHook {
  (vnode: VNode): void;
}

interface CreateVnodeHookResult {
  vnode: VNodeHook;
  cleanup(): void;
}

const kFreshClientNav = "f-client-nav";

export function createVnodeHook(
  next: VNodeHook | undefined,
  manifest?: Manifest,
): CreateVnodeHookResult {
  const encounteredPartialNames = new Set<string>();
  function vnode(vnode: VNode): void {
    if (hasFreshClientNavContainerAttr(vnode)) {
      vnode.props.children = h(ClientNavContainer, {
        children: vnode.props.children,
        manifest,
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
