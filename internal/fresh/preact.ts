import type { PartialProps } from "$fresh/runtime.ts";
import { Partial } from "$fresh/runtime.ts";
import type { Manifest } from "$fresh/server.ts";
import { createHandler } from "$fresh/server.ts";
import type { VNode } from "preact";
import { h } from "preact";
import type { Props as ClientNavContainerProps } from "./ClientNavContainer.tsx";
import type { PartialsUpdater } from "./ClientNavContainer.tsx";
import { ClientNavContainer } from "./ClientNavContainer.tsx";

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

interface FreshHandler {
  (request: Request): Promise<Response>;
}

function createPartialsUpdater(
  manifestAccessor: ManifestAccessor,
): PartialsUpdater {
  async function updatePartials(event: Event, request: Request): Promise<void> {
    const manifest = manifestAccessor();
    if (manifest == null) {
      // TODO: Output warnings?
      return;
    }

    event.preventDefault();

    const handler = await createFreshHandler(manifest);
    const response = await handler(request);
    const html = await response.text();
    // TODO: update the current document based on `html`
    return;
  }

  let handler: FreshHandler | undefined = undefined;
  async function createFreshHandler(manifest: Manifest): Promise<FreshHandler> {
    handler ||= await createHandler(manifest);
    return handler;
  }

  return updatePartials;
}

export function createVnodeHook(
  next: VNodeHook | undefined,
  manifestAccessor: ManifestAccessor,
  maybeLocation?: Location,
): CreateVnodeHookResult {
  // TODO: Remove this
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
