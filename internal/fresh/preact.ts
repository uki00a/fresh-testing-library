import type { PartialProps } from "$fresh/runtime.ts";
import { Partial } from "$fresh/runtime.ts";
import type { ComponentChildren } from "preact";
import { Fragment, h, VNode } from "preact";
import { useEffect } from "preact/hooks";

interface VNodeHook {
  (vnode: VNode): void;
}

interface CreateVnodeHookResult {
  vnode: VNodeHook;
  cleanup(): void;
}

function enablePartialNavigation(): () => void {
  const freshClientNavContainers = document.querySelectorAll(
    `[${kFreshClientNav}]`,
  );
  const events: Array<
    [HTMLElement, string, (...args: Array<unknown>) => unknown]
  > = [];

  for (const container of freshClientNavContainers) {
    if (container.getAttribute(kFreshClientNav) === "false") {
      continue;
    }

    const anchors = container.querySelectorAll("a");
    for (const anchor of anchors) {
      if (anchor.hasAttribute(kFreshPartial)) {
        // TODO: implement this.
      } else {
        const href = anchor.getAttribute("href");
        if (href == null) {
          continue;
        }

        const kClick = "click";
        const onClick = (): void => {
          console.info("hello");
          return;
        };
        anchor.addEventListener(kClick, onClick);
        events.push([anchor, kClick, onClick]);
      }
    }
  }

  function cleanup(): void {
    for (const [element, event, listener] of events) {
      element.removeEventListener(event, listener);
    }
  }

  return cleanup;
}

interface PartialDetectorProps {
  children?: ComponentChildren;
}

const kFreshClientNav = "f-client-nav";
const kFreshPartial = "f-partial";
function PartialDetector(props: PartialDetectorProps) {
  useEffect(() => {
    const cleanup = enablePartialNavigation();
    return cleanup;
  }, []);

  return h(Fragment, null, props.children);
}

export function createVnodeHook(
  maybePrviousHook: VNodeHook | undefined,
): CreateVnodeHookResult {
  const encounteredPartialNames = new Set<string>();
  let partialDetectorEnabled = false;
  function vnode(vnode: VNode): void {
    if (isPartial(vnode)) {
      encounteredPartialNames.add(vnode.props.name);
      if (!partialDetectorEnabled) {
        partialDetectorEnabled = true;
        vnode.props.children = h(
          PartialDetector,
          { children: vnode.props.children },
        );
      }
    }

    if (maybePrviousHook) {
      return maybePrviousHook(vnode);
    }
    return;
  }
  function cleanup(): void {
    encounteredPartialNames.clear();
    partialDetectorEnabled = false;
  }
  return { vnode, cleanup };
}

function isPartial(
  // deno-lint-ignore no-explicit-any
  vnode: VNode<any>,
): vnode is VNode<PartialProps> {
  return vnode.type === Partial;
}
