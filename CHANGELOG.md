# Changelog

All notable changes to **pi-agent-mind** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Initial project scaffolding with professional configuration files
- `tsconfig.json` with strict TypeScript configuration
- `eslint.config.js` with TypeScript-aware linting
- `.prettierrc` with consistent code formatting rules
- `.npmignore` for clean npm package publication
- `CONTRIBUTING.md` with comprehensive contribution guidelines
- `examples/` folder with usage demonstrations
- Triple-store memory architecture: episodic, semantic, and procedural layers
- Core memory engine with query routing and cross-layer search

### Changed

### Deprecated

### Removed

### Fixed

### Security

---

## [0.1.0] — 2025-01-01

### Added
- Project initialization
- Core memory engine (`src/core/memory-engine.ts`)
- Episodic memory store (`src/episodic/`)
- Semantic memory store (`src/semantic/`)
- Procedural memory store (`src/procedural/`)
- Type definitions (`src/types/`)
- Shared utilities (`src/utils/`)
- Unit test suite (`tests/`)
- Developer documentation (`docs/`)

### Changed

### Deprecated

### Removed

### Fixed

### Security

---

## Versioning Policy

We use [Semantic Versioning](https://semver.org/):

- **MAJOR** version — Breaking changes to public API
- **MINOR** version — New functionality (backward-compatible)
- **PATCH** version — Bug fixes and internal changes

### Release Schedule

- **Patch releases** — As needed, for critical bug fixes
- **Minor releases** — Monthly, for new features
- **Major releases** — Rare, only for breaking changes

---

## Deprecation Policy

When deprecated features are removed, they follow this cycle:

1. **Announcement** — Documented in changelog with `[!DEPRECATED]` marker
2. **Warning period** — Minimum 2 minor releases (60 days)
3. **Removal** — In the next major release

Example deprecation notice:
```markdown
### Deprecated
- `MemoryStore.getByTag()` — Use `SemanticStore.queryByTag()` instead.
  Will be removed in v2.0.0. (Since 0.5.0)
```

---

## Git History

For full commit history, see the [git log](https://github.com/VandeeFeng/pi-agent-mind/commits/main)
or run:

```bash
git log --oneline --graph --all
```

---

## Migration Guides

When upgrading between major versions, check the `docs/migration/` folder
for step-by-step migration instructions.

---

*Changelog auto-generated using [git-changelog](https://github.com/antfu/git-changelog) or manual curation.*
