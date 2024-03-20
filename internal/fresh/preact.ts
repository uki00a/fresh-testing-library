import type { PartialProps } from "$fresh/runtime.ts";
import { Partial as FreshPartial } from "$fresh/runtime.ts";
import type { Manifest } from "$fresh/server.ts";
import { createHandler } from "$fresh/server.ts";
import type { VNode } from "preact";
import { h } from "preact";
import type { Props as ClientNavContainerProps } from "./ClientNavContainer.ts";
import type { PartialsUpdater } from "./partials.ts";
import { ClientNavContainer } from "./ClientNavContainer.ts";
import { Partial as FTLPartial } from "./Partial.ts";
import { extractPartialBoundaries } from "./partials.ts";
import { createDocument } from "../jsdom/mod.ts";

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
  baseDocument: Document,
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
    const newDocument = createDocument(html);
    const newPartialBoundaries = extractPartialBoundaries(newDocument);
    if (newPartialBoundaries.length === 0) {
      return;
    }
    const currentPartialBoundaries = extractPartialBoundaries(baseDocument);
    for (const newBoundary of newPartialBoundaries) {
      const currentBoundary = currentPartialBoundaries.find((x) =>
        x.name === newBoundary.name && x.index === newBoundary.index
      );
      if (currentBoundary == null) continue;

      const parent = currentBoundary.start.parentNode;
      if (parent == null) continue;

      // TODO: support `PartialProps.mode`
      let it = currentBoundary.start.nextSibling;
      while (it !== currentBoundary.end) {
        if (it == null) break;
        const toRemove = it;
        parent.removeChild(toRemove);
        it = it.nextSibling;
      }

      const fragment = baseDocument.createDocumentFragment();
      it = newBoundary.start.nextSibling;
      while (it !== newBoundary.end) {
        if (it == null) break;
        const copy = baseDocument.importNode(it, true);
        fragment.appendChild(copy);
        it = it.nextSibling;
      }
      parent.insertBefore(fragment, currentBoundary.end);
    }
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
  isCSR: () => boolean,
  document: Document,
  maybeLocation?: Location,
): CreateVnodeHookResult {
  const updatePartials = createPartialsUpdater(manifestAccessor, document);
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
  return vnode.type !== ClientNavContainer && vnode.props[kFreshClientNav] &&
    vnode.props.children != null;
}

function isPartial(
  // deno-lint-ignore no-explicit-any
  vnode: VNode<any>,
): vnode is VNode<PartialProps> {
  return vnode.type === FreshPartial;
}
