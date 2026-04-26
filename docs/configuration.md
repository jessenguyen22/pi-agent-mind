# Configuration Guide

Complete configuration options for pi-agent-mind with examples.

## Configuration File

Create `pi-agent-mind.config.js` in your project root:

```javascript
export default {
  plugins: [
    ['pi-agent-mind', {
      enabled: true,
      autoExtract: false,
      memoryPath: '.pi/agent-mind',
      confidenceThreshold: 0.6,
      validatePatterns: true,
      minFrequency: 3
    }]
  ]
}
```

## Configuration Options

### `enabled`

**Type:** `boolean`  
**Default:** `true`

Enable or disable the extension.

```javascript
// Disable the extension
{ enabled: false }
```

### `autoExtract`

**Type:** `boolean`  
**Default:** `false`

Automatically extract and save insights when `agent_end` events fire.

```javascript
// Extract insights after each session automatically
{ autoExtract: true }
```

### `memoryPath`

**Type:** `string`  
**Default:** `.pi/agent-mind`

Directory path for storing memory artifacts.

```javascript
// Custom memory storage location
{ memoryPath: '.my-custom-memory/agent-mind' }
```

### `confidenceThreshold`

**Type:** `number` (0-1)  
**Default:** `0.6`

Minimum confidence score for insights to be saved.

```javascript
// Higher threshold - only save high-confidence insights
{ confidenceThreshold: 0.8 }

// Lower threshold - save more insights including uncertain ones
{ confidenceThreshold: 0.4 }
```

### `validatePatterns`

**Type:** `boolean`  
**Default:** `true`

Require pattern validation before accepting insights.

```javascript
// Skip validation (faster, less strict)
{ validatePatterns: false }
```

### `minFrequency`

**Type:** `number`  
**Default:** `3`

Minimum occurrences required to validate a pattern.

```javascript
// Require 5 occurrences before validation
{ minFrequency: 5 }

// Accept patterns from first occurrence
{ minFrequency: 1 }
```

## Complete Configuration Examples

### Minimal Setup

```javascript
// pi-agent-mind.config.js
export default {
  plugins: [
    ['pi-agent-mind', {}]
  ]
}
```

### Development Mode

```javascript
// pi-agent-mind.config.js
export default {
  plugins: [
    ['pi-agent-mind', {
      enabled: true,
      autoExtract: true,
      memoryPath: '.pi/agent-mind-dev',
      confidenceThreshold: 0.4,
      validatePatterns: false,
      minFrequency: 1
    }]
  ]
}
```

### Production Mode

```javascript
// pi-agent-mind.config.js
export default {
  plugins: [
    ['pi-agent-mind', {
      enabled: true,
      autoExtract: true,
      memoryPath: '.pi/agent-mind',
      confidenceThreshold: 0.75,
      validatePatterns: true,
      minFrequency: 3
    }]
  ]
}
```

### High-Volume Extraction

For projects with many sessions requiring extensive analysis:

```javascript
// pi-agent-mind.config.js
export default {
  plugins: [
    ['pi-agent-mind', {
      enabled: true,
      autoExtract: true,
      memoryPath: '.pi/agent-mind-highvol',
      confidenceThreshold: 0.5,
      validatePatterns: true,
      minFrequency: 2
    }]
  ]
}
```

## Environment Variables

Override configuration via environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `PI_AGENT_MIND_ENABLED` | Enable/disable extension | `true` |
| `PI_AGENT_MIND_MEMORY_PATH` | Memory storage path | `.pi/agent-mind` |
| `PI_AGENT_MIND_THRESHOLD` | Confidence threshold | `0.6` |

Example:

```bash
PI_AGENT_MIND_THRESHOLD=0.8 pi develop
```

## Runtime Configuration

### JavaScript API

```javascript
import { initialize } from 'pi-agent-mind';

initialize('/path/to/project', {
  enabled: true,
  autoExtract: true,
  confidenceThreshold: 0.7
});
```

### TypeScript Interface

```typescript
interface AgentMindConfig {
  enabled: boolean;
  autoExtract: boolean;
  memoryPath: string;
  confidenceThreshold: number;
  validatePatterns: boolean;
  minFrequency: number;
}
```

## Configuration Precedence

Settings are resolved in this order (later wins):

1. Default values in `src/index.ts`
2. Environment variables
3. Configuration file
4. Runtime initialization

## Memory Directory Structure

Configuration creates this structure:

```
.pi/agent-mind/
├── index.json                 # Artifact index
├── learnings/
│   ├── error-patterns/
│   │   ├── insight_xxx1.md
│   │   └── insight_xxx2.md
│   ├── success-patterns/
│   │   └── ...
│   ├── tool-effectiveness/
│   │   └── ...
│   ├── timing-insights/
│   │   └── ...
│   ├── strategy-adjustments/
│   │   └── ...
│   ├── context-requirements/
│   │   └── ...
│   └── metadata-observations/
│       └── ...
└── context/
    └── agent-mind/
        └── behavior-context.md
```

## Related Documentation

- [Getting Started](getting-started.md) - Installation and quick start
- [Architecture](architecture.md) - System design and components
- [CLI Commands](cli.md) - All available commands
- [Extension API](api.md) - Programmatic access
