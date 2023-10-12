import { JSX } from "preact";

export function Button(props: JSX.HTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      class="px-2 py-1 border(gray-100 2) hover:bg-gray-200"
    />
  );
}
