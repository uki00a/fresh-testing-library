import type { ComponentChildren } from "preact";
import { cloneElement, Fragment, h, isValidElement } from "preact";
import { useEffect, useRef } from "preact/hooks";

const kFreshPartial = "f-partial";

export interface PartialsUpdater {
  (event: Event, url: URL): unknown;
}

export interface Props {
  children: ComponentChildren;
  updatePartials: PartialsUpdater;
}

export function ClientNavContainer(props: Props) {
  const containerRef = useRef<HTMLElement>();
  useEffect(() => {
    if (containerRef.current == null) {
      return;
    }
    return enablePartialNavigation(containerRef.current, props.updatePartials);
  }, [props.updatePartials]);

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
        // TODO: avoid using the constant URL.
        const dummyBaseURL = "http://localhost:8000";
        const url = new URL(href, dummyBaseURL);
        updatePartials(event, url);
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
