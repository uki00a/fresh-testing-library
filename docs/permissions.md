# Permissions

## `$fresh-testing-library/server.ts`

This module does not require any permissions.

| Permission | Value | Description |
| :--------: | :---: | :---------: |

## `$fresh-testing-library/components.ts`

|   Permission   | Value |                                 Description                                  |
| :------------: | :---: | :--------------------------------------------------------------------------: |
| `--allow-read` |  `*`  | This module depends on `jsdom` which requires the `--allow-read` permission. |
| `--allow-env`  |  `*`  | This module depends on `jsdom` which requires the `--allow-env` permission.  |

## `$fresh-testing-library/expect.ts`

|   Permission   | Value |                                    Description                                    |
| :------------: | :---: | :-------------------------------------------------------------------------------: |
| `--allow-read` |  `*`  | This module depends on `npm:expect` which requires the `--allow-read` permission. |
