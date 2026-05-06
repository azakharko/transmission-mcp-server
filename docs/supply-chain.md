# Supply chain and vulnerability reporting

## npm audit

Run periodically:

```bash
npm audit
```

As of early 2026, `npm audit` may report **moderate** findings in **dev** dependencies (for example the Vitest/Vite/esbuild chain) and in transitive dependencies of **`@modelcontextprotocol/sdk`**. These typically affect **development tooling** or **server frameworks bundled by the SDK**, not the minimal runtime path of this MCP server (`node dist/index.js` with stdio).

- **Vitest / esbuild:** Fixes may require a **major Vitest upgrade** (`npm audit fix --force`). Track upstream releases and upgrade the test stack when practical.
- **MCP SDK / express-rate-limit / ip-address:** Bumps to **`@modelcontextprotocol/sdk`** may resolve nested advisories; re-run `npm audit` after upgrades.

Do not use `npm audit fix --force` in CI without reviewing breaking changes.

## Automation

[Dependabot](../.github/dependabot.yml) opens weekly PRs for npm and monthly PRs for GitHub Actions.

## Reporting security issues

Use [GitHub Security Advisories](https://github.com/azakharko/transmission-mcp-server/security) or private contact with the maintainers, per repository policy when added.
