import type { ComponentChildren } from "preact";
import { cloneElement, Fragment, h, isValidElement } from "preact";
import type { MutableRef } from "preact/hooks";
import { useEffect, useRef } from "preact/hooks";
import type { PartialsUpdater } from "./partials.ts";
import { enablePartialNavigation } from "./partials.ts";
import { assert } from "../assert/mod.ts";
import { kFreshClientNavAttribute } from "./constants.ts";

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

    assert(
      containerRef.current.nodeType === 1,
      `[BUG] \`nodeType\` is expected to be \`1\`, but is actually \`${containerRef.current.nodeType}\``,
    );

    assert(
      containerRef.current.hasAttribute(kFreshClientNavAttribute),
      `[BUG] \`${kFreshClientNavAttribute}\` should be defined`,
    );

    return enablePartialNavigation(
      containerRef.current,
      props.origin,
      props.updatePartials,
    );
  }, [props.updatePartials, props.origin]);

  return h(
    Fragment,
    null,
    associateRefToChildren(containerRef, props.children),
  );
}

function associateRefToChildren(
  ref: MutableRef<HTMLElement | undefined>,
  children: ComponentChildren,
): ComponentChildren {
  if (isValidElement(children)) {
    return cloneElement(children, {
      ref: (el: HTMLElement) => {
        ref.current = el;
      },
      // NOTE: In this case, `f-client-nav` seems to be lost
      [kFreshClientNavAttribute]: "",
    });
  } else if (!Array.isArray(children)) {
    return children;
  } else {
    const i = children.findIndex((x) => isValidElement(x));
    if (i === -1) {
      return children;
    }
    return children.map((x, j) => {
      if (i === j) {
        return cloneElement(x, {
          ref: (el: HTMLElement) => {
            if (el?.parentElement) {
              ref.current = el.parentElement;
            }
          },
        });
      } else {
        return x;
      }
    });
  }
}
