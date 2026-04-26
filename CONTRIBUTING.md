# Contributing to pi-agent-mind

Thank you for your interest in contributing to **pi-agent-mind**! This project is a cognitive architecture layer for AI agents — a persistent memory system that gives agents a structured, long-term memory with episodic, semantic, and procedural layers. We welcome contributions of all kinds: code, documentation, bug reports, and ideas.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Architecture](#project-architecture)
- [Making Changes](#making-changes)
  - [Branching Strategy](#branching-strategy)
  - [Commits](#commits)
  - [Pull Requests](#pull-requests)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Documentation](#documentation)
- [Release Process](#release-process)
- [License](#license)

---

## Code of Conduct

We are committed to providing a welcoming and respectful environment. All contributors are expected to uphold the [Contributor Covenant](https://www.contributor-covenant.org/). Please read the full [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) before participating.

**Be kind. Be constructive. Assume good intent.**

---

## Getting Started

1. **Fork the repository** on GitHub.
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/<your-username>/pi-agent-mind.git
   cd pi-agent-mind
   ```
3. **Add the upstream remote**:
   ```bash
   git remote add upstream https://github.com/VandeeFeng/pi-agent-mind.git
   ```
4. **Install dependencies**:
   ```bash
   npm install
   ```

---

## Development Setup

### Prerequisites

- **Node.js** ≥ 20.x (LTS recommended)
- **npm** ≥ 10.x (or pnpm / yarn)
- **Git** ≥ 2.40

### Common Commands

```bash
# Install dependencies
npm install

# Run in development mode (watch mode)
npm run dev

# Build for production
npm run build

# Run type checking
npm run typecheck

# Run linter
npm run lint

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Format code
npm run format
```

---

## Project Architecture

pi-agent-mind is a **triple-store memory architecture** for AI agents:

```
pi-agent-mind/
├── src/
│   ├── core/            # Core memory engine (indexing, query routing)
│   ├── episodic/        # Episodic memory store (experience timeline)
│   ├── semantic/        # Semantic memory store (facts, concepts)
│   ├── procedural/      # Procedural memory store (skills, procedures)
│   ├── utils/           # Shared utilities
│   └── types/           # TypeScript type definitions
├── tests/               # Test suites
├── examples/            # Usage examples
└── docs/                # Additional documentation
```

### Memory Layers

| Layer       | Purpose                          | Use Case                        |
|-------------|----------------------------------|---------------------------------|
| **Episodic**| Autobiographical experience      | "What did we do last session?"  |
| **Semantic**| Factual knowledge & concepts     | "What is a semantic network?"  |
| **Procedural** | Skills, procedures, how-tos   | "How do I index a repo?"        |

---

## Making Changes

### Branching Strategy

We follow a **trunk-based development** approach with short-lived feature branches:

```
main (protected)
├── feat/your-feature-name
├── fix/your-bug-fix
├── docs/your-documentation
├── refactor/your-refactor
└── chore/your-chore
```

**Branch naming conventions:**
- `feat/<short-description>` — new features
- `fix/<short-description>` — bug fixes
- `docs/<short-description>` — documentation only
- `refactor/<short-description>` — code refactoring
- `test/<short-description>` — adding or updating tests
- `chore/<short-description>` — tooling, dependencies, config

### Commits

We use **Conventional Commits** for clear, machine-readable commit messages.

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

**Types:**
- `feat` — new feature
- `fix` — bug fix
- `docs` — documentation changes
- `style` — formatting, no code change
- `refactor` — code refactoring
- `test` — adding or updating tests
- `chore` — build process, tooling, dependencies
- `perf` — performance improvement
- `ci` — CI/CD changes

**Examples:**
```bash
git commit -m "feat(episodic): add session windowing for long conversations"
git commit -m "fix(semantic): resolve memory corruption on large stores"
git commit -m "docs: update README with memory layer diagrams"
git commit -m "test: add integration tests for cross-layer queries"
```

### Pull Requests

1. **Open a draft PR early** — This signals work in progress and allows for feedback.
2. **Fill out the PR template** — Describe what changed and why.
3. **Link related issues** — Use `Fixes #123` or `Relates to #456`.
4. **Ensure all checks pass** — Tests, linting, type checking.
5. **Request review** — Tag relevant maintainers.
6. **Address feedback** — Respond to comments and push updates.

**PR Checklist:**
- [ ] Tests pass locally (`npm test`)
- [ ] TypeScript compiles without errors (`npm run typecheck`)
- [ ] Linter passes (`npm run lint`)
- [ ] Code is formatted (`npm run format`)
- [ ] Documentation updated if needed
- [ ] No console.log / debug statements left in code
- [ ] New public APIs have JSDoc comments

---

## Coding Standards

### TypeScript

- Use **strict mode** in `tsconfig.json`
- Prefer `interface` over `type` for object shapes
- Use explicit return types on public functions
- No `any` — use `unknown` and type narrowing
- Export types from `src/types/`

### Naming Conventions

| Thing           | Convention            | Example                        |
|-----------------|-----------------------|--------------------------------|
| Files           | kebab-case            | `memory-engine.ts`             |
| Classes         | PascalCase            | `EpisodicStore`                |
| Interfaces      | PascalCase + `I` prefix (optional) | `IMemoryEntry`  |
| Functions       | camelCase             | `queryMemory()`                |
| Constants       | SCREAMING_SNAKE_CASE  | `MAX_MEMORY_AGE`               |
| Private members | `_underscorePrefix`   | `_internalCache`               |

### File Structure

```typescript
// Good: clear sections with JSDoc on public APIs

/**
 * Stores a new memory entry in the appropriate memory layer.
 *
 * @param entry - The memory entry to store
 * @param layer - Which memory layer to use (episodic|semantic|procedural)
 * @returns The stored entry with a generated ID
 */
export async function storeMemory(
  entry: MemoryEntry,
  layer: MemoryLayer
): Promise<StoredEntry> {
  // implementation
}
```

---

## Testing

We use **Vitest** for unit and integration tests, and target **100% coverage** on core logic.

### Test File Naming

```
src/core/memory-engine.ts   →   tests/core/memory-engine.test.ts
src/episodic/store.ts       →   tests/episodic/store.test.ts
```

### Test Structure

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { EpisodicStore } from '../src/episodic/store';

describe('EpisodicStore', () => {
  let store: EpisodicStore;

  beforeEach(() => {
    store = new EpisodicStore({ maxEntries: 100 });
  });

  it('should store and retrieve a memory entry', async () => {
    const entry = { content: 'Test memory', timestamp: Date.now() };
    const stored = await store.add(entry);
    expect(stored.id).toBeDefined();
    expect(await store.get(stored.id)).toEqual(stored);
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Watch mode during development
npm run test:watch

# Coverage report
npm run test:coverage

# Run specific test file
npx vitest run src/episodic/store.test.ts
```

---

## Documentation

- Public APIs **must** have JSDoc comments
- Update `README.md` if you add or change features
- Add code comments for non-obvious logic
- Update the architecture diagram if structure changes
- Use inline comments sparingly — code should be self-explanatory

### Documentation Tools

- **README.md** — Project overview and quick start
- **API.md** — Detailed API reference
- **ARCHITECTURE.md** — System design and memory model
- **CONTRIBUTING.md** — This file

---

## Release Process

Releases follow **Semantic Versioning** and are automated via CI/CD:

1. Merge changes to `main`
2. Update `CHANGELOG.md` with unreleased changes
3. Create a release commit with version tag (`v1.2.3`)
4. GitHub Actions builds and publishes to npm

**For maintainers:**
```bash
# Prepare a release
npm run release -- --dry-run

# Actually release
npm run release
```

---

## License

By contributing to pi-agent-mind, you agree that your contributions will be licensed under the project's [MIT License](./LICENSE).

---

## Questions?

- **Issues** — Open a [GitHub Issue](https://github.com/VandeeFeng/pi-agent-mind/issues)
- **Discussions** — Use [GitHub Discussions](https://github.com/VandeeFeng/pi-agent-mind/discussions)
- **Maintainer** — Vandee Feng (@VandeeFeng)

We look forward to your contributions! 🚀
