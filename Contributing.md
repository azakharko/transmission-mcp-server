# Contributing

Thank you for helping improve **transmission-mcp-server**.

## Development setup

- **Node.js** ≥ 18.18
- Clone the repository, then:

```bash
npm install
npm test
npm run lint
```

`npm install` runs **`prepare`** (which runs `npm run build`) so `dist/` exists for local runs and for installs from git; CI uses `npm ci` the same way.

To verify the container image locally:

```bash
docker build -t transmission-mcp-server:local .
```

## Making changes

- Keep the security model intact: **no shell execution**, only HTTP JSON-RPC to Transmission on a **loopback** URL with **required** credentials.
- Prefer small, focused pull requests with a clear description of behavior changes.
- Add or update **tests** when you fix bugs or add logic (validators, RPC client, config).
- Update **CHANGELOG.md** under `[Unreleased]` or the current version section when your change is user-visible.

## Versioning

- The npm package version in [package.json](package.json) is the canonical **semver** for releases.
- The MCP server implementation `version` field is read from `package.json` at runtime (see [src/index.ts](src/index.ts)); keep releases consistent by bumping `package.json` and documenting the release in [CHANGELOG.md](CHANGELOG.md).

## Style

- TypeScript with **strict** compiler settings; match existing patterns for imports (`.js` extensions in source), validation (Zod), and error handling.
- Run `npm run lint` before submitting; fix any new issues your change introduces.

## License

By contributing, you agree that your contributions will be licensed under the same terms as the project ([Apache-2.0](LICENSE)).
