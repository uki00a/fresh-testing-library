/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import type { Manifest } from "$fresh/server.ts";
import type { PartialProps } from "$fresh/src/runtime/Partial.tsx";
import { createHandler } from "$fresh/server.ts";
import { createDocument } from "../jsdom/mod.ts";
import {
  kFreshClientNavAttribute,
  kFreshPartialQueryParam,
} from "./constants.ts";
import { assert } from "../assert/mod.ts";

export interface PartialsUpdater {
  (event: Event, request: Request): Promise<unknown>;
}

export interface PartialBoundary {
  name: string;
  key: string;
  replacementMode: ReplacementMode;
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
          startMarker.key === endMarker.key
        ) {
          found.push({
            name: startMarker.name,
            key: startMarker.key,
            replacementMode: startMarker.replacementMode,
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

type ReplacementMode = NonNullable<PartialProps["mode"]>;
interface PartialMarker {
  node: Comment;
  name: string;
  key: string;
  replacementMode: ReplacementMode;
}

function parsePartialMarkerComment(comment: Comment): PartialMarker {
  assert(
    comment.data.startsWith(kFreshPartialStartMarkerCommentPrefix) ||
      comment.data.startsWith(kFreshPartialEndMarkerCommentPrefix),
    `[BUG] '${comment.data}' should start with '${kFreshPartialStartMarkerCommentPrefix}' or '${kFreshPartialEndMarkerCommentPrefix}'`,
  );
  const parts = comment.data.split(":");
  assert(
    parts.length === 4,
    `[BUG] Unexpected marker comment is detected: '${comment.data}'`,
  );
  const [, name, replacementMode, key] = parts;
  return {
    node: comment,
    name,
    replacementMode: decodeReplacementMode(replacementMode),
    key,
  };
}

/**
 * Based on {@link https://github.com/denoland/fresh/blob/1.6.8/src/constants.ts#L9-L13}.
 *
 * @license
 * MIT License
 *
 * Copyright (c) 2021-2023 Luca Casonato
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
function decodeReplacementMode(encoded: string): ReplacementMode {
  const code = Number.parseInt(encoded);
  assert(
    code === 0 || code === 1 || code === 2,
    `[BUG] Unknown replacement mode is detected: '${encoded}'`,
  );
  switch (code) {
    case 0:
      return "replace";
    case 1:
      return "append";
    case 2:
      return "prepend";
  }
}

/**
 * ```html
 * <!--frsh-partial:<partial-name>:<replacement-mode>:<key>-->
 * ```
 */
const kFreshPartialStartMarkerCommentPrefix = "frsh-partial:";
/**
 * ```html
 * <!--/frsh-partial:<partial-name>:<replacement-mode>:<key>-->
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

function isClientNavEnabled(el: Element): boolean {
  const container = el.closest(`[${kFreshClientNavAttribute}]`);
  if (container == null) return false;
  return container.getAttribute(kFreshClientNavAttribute) !== "false";
}

type PartialEventListener =
  | ((event: MouseEvent) => void)
  | ((event: SubmitEvent) => void);
const kFreshPartialAttribute = "f-partial";
export function enablePartialNavigation(
  container: HTMLElement,
  origin: string,
  updatePartials: PartialsUpdater,
): () => void {
  const events: Array<
    [Element, string, PartialEventListener]
  > = [];

  function addEventListener(
    element: Element,
    event: string,
    listener: PartialEventListener,
  ): void {
    // @ts-ignore This line is covered by the test
    element.addEventListener(event, listener);
    events.push([element, event, listener]);
  }

  const anchors = container.querySelectorAll("a");
  for (const anchor of anchors) {
    const partial = anchor.getAttribute(kFreshPartialAttribute);
    const href = partial ?? anchor.getAttribute("href");
    if (!isPartialLink(href)) {
      continue;
    }

    addEventListener(anchor, "click", createClickListener(href));
  }

  const buttons = container.querySelectorAll(
    `button[${kFreshPartialAttribute}]`,
  );
  for (const button of buttons) {
    assert(isButton(button));
    if (button.form != null) {
      continue;
    }
    const href = button.getAttribute(kFreshPartialAttribute);
    if (!isPartialLink(href)) {
      continue;
    }
    addEventListener(button, "click", createClickListener(href));
  }

  const forms = container.getElementsByTagName("form");
  const onSubmit = createSubmitListener(updatePartials, origin);
  for (const form of forms) {
    addEventListener(form, "submit", onSubmit);
  }

  function createClickListener(href: string) {
    function onClick(event: MouseEvent): void {
      const url = new URL(href, origin);
      url.searchParams.set(kFreshPartialQueryParam, "true");
      const request = new Request(url);
      updatePartials(event, request);
    }
    return onClick;
  }

  function cleanup(): void {
    for (const [element, event, listener] of events) {
      // @ts-ignore This line is covered by the test
      element.removeEventListener(event, listener);
    }
  }

  return cleanup;
}

/**
 * This function is based on {@link https://github.com/denoland/fresh/blob/1.6.8/src/runtime/entrypoints/main.ts#L1053-L1100} which is licensed as follows:
 *
 * @license
 * MIT License
 *
 * Copyright (c) 2021-2023 Luca Casonato
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
function createSubmitListener(
  updatePartials: PartialsUpdater,
  origin: string,
): (event: SubmitEvent) => void {
  return onSubmit;

  function onSubmit(event: SubmitEvent) {
    const form = event.target;
    if (form == null || !isForm(form) || event.defaultPrevented) {
      return;
    }

    const maybeSubmitter = event.submitter;
    if (maybeSubmitter == null || !isClientNavEnabled(maybeSubmitter)) {
      return;
    }

    const action = form.getAttribute(kFreshPartialAttribute) ??
      maybeSubmitter?.getAttribute("formaction") ??
      form.getAttribute(kFreshPartialAttribute) ??
      form.action;

    if (action == "") {
      return;
    }

    const method = event.submitter?.getAttribute("formmethod") ??
      form.method;
    const lowerMethod = method.toLowerCase();
    const isNotSupportedMethod = lowerMethod !== "get" &&
      lowerMethod !== "post" &&
      lowerMethod !== "dialog";
    if (isNotSupportedMethod) {
      return;
    }

    const url = new URL(action, origin);
    let requestInit: RequestInit | undefined;
    assert(
      form.ownerDocument.defaultView,
      "[BUG] `ownerDocument.defaultView` should be defined",
    );
    if (lowerMethod === "get") {
      const formData = new form.ownerDocument.defaultView.FormData(form);
      const params = new form.ownerDocument.defaultView.URLSearchParams(
        // @ts-expect-error This should be correct
        formData,
      );
      url.search = `?${params.toString()}`;
    } else {
      const _formData = new form.ownerDocument.defaultView.FormData(form);
      const body = new FormData();
      for (const [key, value] of _formData.entries()) {
        body.set(key, value);
      }
      requestInit = { body, method };
    }
    const request = new Request(url, requestInit);
    updatePartials(event, request);
  }
}

function isButton(el: Element): el is HTMLButtonElement {
  return el.tagName === "BUTTON";
}

function isForm(el: Element | EventTarget): el is HTMLFormElement {
  return "tagName" in el && el.tagName === "FORM";
}

function isPartialLink(href: string | null): href is string {
  return href != null && href.startsWith("/");
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
    await applyResponseToDocument(baseDocument, response);
    return;
  }

  let handler: FreshHandler | undefined = undefined;
  async function createFreshHandler(manifest: Manifest): Promise<FreshHandler> {
    handler ||= await createHandler(manifest);
    return handler;
  }

  return updatePartials;
}

export async function applyResponseToDocument(
  baseDocument: Document,
  response: Response,
): Promise<void> {
  const html = await response.text();
  const newDocument = createDocument(html);
  const newPartialBoundaries = extractPartialBoundaries(newDocument);
  if (newPartialBoundaries.length === 0) {
    return;
  }
  const currentPartialBoundaries = extractPartialBoundaries(baseDocument);
  for (const newBoundary of newPartialBoundaries) {
    const currentBoundary = currentPartialBoundaries.find((x) =>
      x.name === newBoundary.name && x.key === newBoundary.key
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
