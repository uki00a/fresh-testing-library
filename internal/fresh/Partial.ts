import { Fragment, h } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import type { PartialProps } from "$fresh/src/runtime/Partial.tsx";
import { createPartialMarkerComment } from "./partials.ts";

interface Props extends PartialProps {
  isCSR: boolean;
}

export function Partial(props: Props) {
  const { name, isCSR } = props;
  const isSSR = !isCSR;
  // TODO: improve `index` handling
  const index = 0;
  return h(
    Fragment,
    null,
    isSSR ? null : Comment({
      comment: createPartialMarkerComment({ name, index }),
      disposition: "after",
    }),
    props.children,
    isSSR ? null : Comment({
      comment: createPartialMarkerComment({ name, index, endMarker: true }),
      disposition: "before",
    }),
  );
}

interface CommentProps {
  comment: string;
  disposition: "before" | "after";
}

/**
 * While {@link https://github.com/preactjs/preact-render-to-string/releases/tag/v6.1.0 | `preact-render-to-string` supports rendering comment nodes}, `preact` does not yet.
 * Therefore, comment nodes cannot be rendered straightforwardly during CSR by `@testing-library/preact`.
 * To address this problem, this component supports rendering of comment nodes during CSR.
 */
function Comment({ comment, disposition }: CommentProps) {
  const noscriptRef = useRef<Element | null>(null);
  const [isNoscriptHidden, setIsNoscriptHidden] = useState(false);
  useEffect(() => {
    const noscript = noscriptRef.current;
    if (noscript == null) return;

    const parent = noscript.parentNode;
    if (parent == null) return;

    const commentNode = noscript.ownerDocument.createComment(comment);
    switch (disposition) {
      case "before":
        parent.insertBefore(commentNode, noscript);
        break;
      case "after": {
        const nextSibling = noscript.nextSibling;
        if (nextSibling == null) break;
        parent.insertBefore(commentNode, nextSibling);
        break;
      }
    }
    setIsNoscriptHidden(true);
  }, [disposition, setIsNoscriptHidden]);

  if (isNoscriptHidden) return null;

  return h("noscript", {
    ref: (v) => {
      noscriptRef.current = v;
    },
    type: "text/x-ftl-comment-placeholder",
    "data-comment": comment,
  });
}
