/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import type { Manifest } from "$fresh/server.ts";
import { createHandler } from "$fresh/server.ts";
import { createDocument } from "../jsdom/mod.ts";
import { kFreshPartialQueryParam } from "./constants.ts";

export interface PartialsUpdater {
  (event: Event, request: Request): Promise<unknown>;
}

export interface PartialBoundary {
  name: string;
  index: number;
  start: Comment;
  end: Comment;
}

export function extractPartialBoundaries(
  document: Document,
): Array<PartialBoundary> {
  function findPartialComments(
    node: Node,
    found: Array<PartialBoundary>,
  ): void {
    for (let i = 0; i < node.childNodes.length; i++) {
      const child = node.childNodes[i];
      if (!isComment(child)) {
        findPartialComments(child, found);
        continue;
      }

      if (!child.data.startsWith(kFreshPartialStartMarkerCommentPrefix)) {
        continue;
      }

      const startMarker = parsePartialMarkerComment(child);
      for (let j = i + 1; j < node.childNodes.length; j++) {
        const sibling = node.childNodes[j];
        if (!isComment(sibling)) {
          continue;
        }

        if (!sibling.data.startsWith(kFreshPartialEndMarkerCommentPrefix)) {
          continue;
        }

        const endMarker = parsePartialMarkerComment(sibling);
        if (
          startMarker.name === endMarker.name &&
          startMarker.index === endMarker.index
        ) {
          found.push({
            name: startMarker.name,
            index: startMarker.index,
            start: startMarker.node,
            end: endMarker.node,
          });
          break;
        }
      }
    }
  }

  const found: Array<PartialBoundary> = [];
  findPartialComments(document, found);
  return found;
}

function isComment(node: Node): node is Comment {
  return node.nodeType === 8;
}

interface PartialMarker {
  node: Comment;
  name: string;
  index: number;
}

function parsePartialMarkerComment(comment: Comment): PartialMarker {
  const [, name, index] = comment.data.split(":");
  return { node: comment, name, index: Number.parseInt(index) };
}

/**
 * ```html
 * <!--frsh-partial:<partial-name>:<index>:-->
 * ```
 */
const kFreshPartialStartMarkerCommentPrefix = "frsh-partial:";
/**
 * ```html
 * <!--/frsh-partial:<partial-name>:<index>:-->
 * ```
 */
const kFreshPartialEndMarkerCommentPrefix =
  `/${kFreshPartialStartMarkerCommentPrefix}`;

interface CreatePartialMarkerCommentOptions {
  name: string;
  index: number;
  endMarker?: boolean;
}
export function createPartialMarkerComment(
  { name, index, endMarker }: CreatePartialMarkerCommentOptions,
): string {
  const body = `${name}:${index}:`;
  const prefix = endMarker
    ? kFreshPartialEndMarkerCommentPrefix
    : kFreshPartialStartMarkerCommentPrefix;
  return `${prefix}${body}`;
}

const kFreshPartialAttribute = "f-partial";
export function enablePartialNavigation(
  container: HTMLElement,
  origin: string,
  updatePartials: PartialsUpdater,
): () => void {
  const events: Array<
    [HTMLElement, string, (event: Event) => unknown]
  > = [];

  function addEventListener(
    element: HTMLElement,
    event: string,
    listener: (event: Event) => unknown,
  ) {
    // @ts-ignore This line is covered by the test
    element.addEventListener(event, listener);
    events.push([element, event, listener]);
  }

  const anchors = container.querySelectorAll("a");
  for (const anchor of anchors) {
    const partial = anchor.getAttribute(kFreshPartialAttribute);
    const href = partial ?? anchor.getAttribute("href");
    if (href == null || !href.startsWith("/")) {
      continue;
    }

    addEventListener(anchor, "click", (event) => {
      const url = new URL(href, origin);
      url.searchParams.set(kFreshPartialQueryParam, "true");
      const request = new Request(url);
      updatePartials(event, request);
    });
  }

  // TODO: support buttons.
  // TODO: support form partials.

  function cleanup(): void {
    for (const [element, event, listener] of events) {
      // @ts-ignore This line is covered by the test
      element.removeEventListener(event, listener);
    }
  }

  return cleanup;
}

interface ManifestAccessor {
  (): Manifest | undefined;
}

interface FreshHandler {
  (request: Request): Promise<Response>;
}

export function createPartialsUpdater(
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
