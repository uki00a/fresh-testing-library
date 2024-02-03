import type { ComponentChildren } from "preact";
import { cloneElement, Fragment, h, isValidElement } from "preact";
import { useEffect, useRef } from "preact/hooks";
import type { Manifest } from "$fresh/server.ts";
// TODO: Don't import this from `./mod.ts`.
import { findMatchingRouteAndPathPatternFromManifest } from "./mod.ts";

const kFreshPartial = "f-partial";

export interface Props {
  children: ComponentChildren;
  manifest?: Manifest;
}

export function ClientNavContainer(props: Props) {
  const containerRef = useRef<HTMLElement>();
  useEffect(() => {
    if (containerRef.current == null) {
      return;
    }
    if (props.manifest == null) {
      // TODO: output warnings?
      return;
    }
    return enablePartialNavigation(containerRef.current, props.manifest);
  }, [props.manifest]);

  return h(
    Fragment,
    null,
    isValidElement(props.children)
      ? cloneElement(props.children, {
        ref: (el: HTMLElement) => {
          containerRef.current = el;
        },
      })
      : props.children,
  );
}

function enablePartialNavigation(
  container: HTMLElement,
  manifest: Manifest,
): () => void {
  const events: Array<
    [HTMLElement, string, (...args: Array<unknown>) => unknown]
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
        // TODO: avoid using the constant URL.
        const dummyBaseURL = "http://localhost:8000";
        const request = new Request(new URL(href, dummyBaseURL));
        const maybeRouteAndPattern =
          findMatchingRouteAndPathPatternFromManifest(request, manifest);
        if (maybeRouteAndPattern == null) {
          return;
        }

        event.preventDefault();
        const [_route] = maybeRouteAndPattern;
        // TODO: implement route handling.
        return;
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
