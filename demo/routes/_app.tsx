import { AppProps } from "$fresh/server.ts";

export default function App({ Component }: AppProps) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>fresh-testing-library</title>
      </head>
      <body>
        <main class="p-4 mx-auto max-w-screen-md">
          <Component />
        </main>
      </body>
    </html>
  );
}
