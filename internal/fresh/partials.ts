/// <reference lib="dom" />

export const kFreshPartialQueryParam = "fresh-partial";

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

const kFreshPartial = "f-partial";
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
    element.addEventListener(event, listener);
    events.push([element, event, listener]);
  }

  const anchors = container.querySelectorAll("a");
  for (const anchor of anchors) {
    if (anchor.hasAttribute(kFreshPartial)) {
      // TODO: implement this.
      throw new Error(`"${kFreshPartial}" is not implemented yet.`);
    } else {
      const href = anchor.getAttribute("href");
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
  }

  // TODO: support form partials.

  function cleanup(): void {
    for (const [element, event, listener] of events) {
      element.removeEventListener(event, listener);
    }
  }

  return cleanup;
}
