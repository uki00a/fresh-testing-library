// TODO: Remove this file
import type { ClassAttributes, VNode } from "preact";
import { h } from "preact";
import { render as renderToString } from "../../deps/preact-render-to-string.ts";
import type {
  FreshContext,
  Manifest,
  MiddlewareHandler,
  PageProps,
} from "$fresh/server.ts";

type MiddlewareModule = {
  handler: MiddlewareHandler | Array<MiddlewareHandler>;
};
type RouteModule = Exclude<Manifest["routes"][string], MiddlewareModule>;
export function isRouteModule(
  module: Manifest["routes"][string],
): module is RouteModule {
  return (module as RouteModule)
    .default != null;
}

type AsyncRouteComponent = Required<RouteModule>["default"];
interface SyncRouteComponent {
  (props: PageProps): VNode;
}

export function isSyncRouteComponent(
  component: AsyncRouteComponent | SyncRouteComponent,
): component is SyncRouteComponent {
  return component.length === 1;
}

const kContainerElement = "div";
export function renderSyncRouteComponent(
  ctx: FreshContext,
  routeComponent: SyncRouteComponent,
) {
  const vnode = h(kContainerElement, {}, h(routeComponent, ctx));
  const html = renderToString(vnode);
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=UTF-8",
    },
  });
}

export async function renderAsyncRouteComponent(
  routeComponent: AsyncRouteComponent,
  request: Request,
  ctx: FreshContext,
): Promise<Response> {
  const result = await routeComponent(
    request,
    ctx,
  );
  if (result instanceof Response) {
    return result;
  }

  // NOTE: It seems that there is a mismatch between the type definitions of `preact` and `preact-render-to-string`.
  const vnode = h(kContainerElement, {}, result) as VNode<
    ClassAttributes<HTMLElement>
  >; // TODO: remove this type casting.
  const html = renderToString(vnode);
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=UTF-8",
    },
  });
}
