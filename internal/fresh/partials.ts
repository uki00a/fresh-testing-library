/// <reference lib="dom" />

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
