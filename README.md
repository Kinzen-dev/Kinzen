# kinzen.dev

Personal site of Kittipong "King" Khonthong. Static Next.js 16 (App Router), English at `/`, Thai at `/th`.

## Develop

```bash
pnpm install
pnpm dev            # http://localhost:3000
pnpm check          # lint, typecheck, unit tests, build, output scan
pnpm e2e            # Playwright smoke + axe against the production build
```

Node 24, pnpm 11.

## Where things live

| Path                       | What                                                                                                                                                              |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/content/`             | Every public claim, typed and validated (zod). Edit `site.ts` to change content. Entries have `visibility`; Thai is optional per field and falls back to English. |
| `src/content/forbidden.ts` | Strings that must never ship. Checked in unit tests and against the build output.                                                                                 |
| `src/i18n/`                | Interface strings per locale. Thai must match the English shape (typecheck fails otherwise).                                                                      |
| `src/app/[lang]/`          | Routes. Everything is prerendered; English is served unprefixed via rewrites.                                                                                     |
| `src/components/`          | UI. Sections are independent components composed by the home page.                                                                                                |
| `e2e/`                     | Playwright tests (both locales, 390 and 1440 viewports, axe).                                                                                                     |
| `scripts/check-output.ts`  | Post-build scan of every prerendered page and RSC payload.                                                                                                        |

## Content rules

- Every claim carries `provenance` back to the private claims ledger. Provenance is never rendered.
- No new number, client name or outcome without a ledger entry.
- No em dashes, no phone numbers (enforced).

## Deploy

Vercel project `kinzen-frontend` serves https://www.kinzen.dev. CI (GitHub Actions) must be green before a production deploy.

The previous site is preserved at tag `legacy-v1`.
