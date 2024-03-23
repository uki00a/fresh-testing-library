import type { ComponentChildren } from "preact";
import { cloneElement, Fragment, h, isValidElement } from "preact";
import { useEffect, useRef } from "preact/hooks";
import type { PartialsUpdater } from "./partials.ts";
import { enablePartialNavigation } from "./partials.ts";

export interface Props {
  children: ComponentChildren;
  updatePartials: PartialsUpdater;
  origin: string;
}

export function ClientNavContainer(props: Props) {
  const containerRef = useRef<HTMLElement>();
  useEffect(() => {
    if (containerRef.current == null) {
      return;
    }
    return enablePartialNavigation(
      // TODO: `containerRef.current` is not a container. It's parent element should be used instead.
      containerRef.current,
      props.origin,
      props.updatePartials,
    );
  }, [props.updatePartials, props.origin]);

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
