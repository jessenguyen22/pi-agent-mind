# Extension API

Programmatic access to pi-agent-mind functionality.

## Overview

pi-agent-mind exposes its functionality through:

1. **Commands** - Slash commands for interactive use
2. **Tools** - LLM-callable functions
3. **Events** - Lifecycle hooks for integration
4. **JavaScript API** - Direct programmatic access

## Extension Entry Point

```typescript
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  // Register commands, tools, and event handlers
}
```

## Commands API

Register slash commands with the pi API:

```typescript
pi.registerCommand("command-name", {
  description: "Help text",
  handler: async (args, ctx) => {
    // Implementation
  }
});
```

### Command Context

The command handler receives a context object:

```typescript
interface CommandContext {
  sessionManager: {
    getBranch(): SessionEntry[];
    getSessionFile(): string | null;
    getBranch(): string;
  };
  ui: {
    notify(message: string, type?: "info" | "success" | "warning" | "error"): void;
  };
}
```

## Tools API

Register LLM-callable tools:

```typescript
pi.registerTool({
  name: "tool_name",
  label: "Display Label",
  description: "Tool description",
  parameters: Type.Object({ /* JSON Schema */ }),
  execute: async (toolCallId, params, signal, onUpdate, ctx) => {
    return {
      content: [{ type: "text", text: "result" }],
      details: { /* metadata */ }
    };
  }
});
```

### Tool Parameters Schema

Uses JSON Schema via TypeBox:

```typescript
import { Type } from "@sinclair/typebox";

Type.Object({
  name: Type.String(),
  count: Type.Optional(Type.Number()),
  enabled: Type.Optional(Type.Boolean())
})
```

### Tool Result Format

```typescript
interface ToolResult {
  content: Array<{
    type: "text" | "image";
    text?: string;
    data?: string;
  }>;
  details?: Record<string, unknown>;
}
```

## Events API

### Session Events

#### `session_start`

Fires when a new session begins.

```typescript
pi.on("session_start", async (event, ctx) => {
  const sessionFile = ctx.sessionManager.getSessionFile();
  // Initialize scanner for this session
});
```

**Event Data:** Session metadata and manager reference

#### `agent_end`

Fires when agent execution completes.

```typescript
pi.on("agent_end", async (event, ctx) => {
  if (config.autoExtract) {
    const insights = extractor.extract(ctx.sessionManager.getBranch());
    updater.addInsights(insights);
  }
});
```

### Event Types

```typescript
type ExtensionEvent = 
  | "session_start"
  | "session_end"
  | "agent_start"
  | "agent_end"
  | "tool_call"
  | "tool_result"
  | "error";
```

## JavaScript API

### Initialize

```typescript
import { initialize } from "pi-agent-mind";

initialize(cwd: string, config?: Partial<AgentMindConfig>): void
```

Example:

```typescript
import { initialize } from "pi-agent-mind";

initialize("/path/to/project", {
  enabled: true,
  autoExtract: false,
  confidenceThreshold: 0.7
});
```

### InsightExtractor

Direct access to insight extraction:

```typescript
import { InsightExtractor } from "./insight-extractor";

const extractor = new InsightExtractor({
  minConfidence: 0.6,
  maxInsights: 100,
  includeMetadata: true,
  validatePatterns: true,
  minFrequency: 3
});

const insights = extractor.extract(entries);
```

### SessionScanner

Scan sessions programmatically:

```typescript
import { SessionScanner } from "./session-scanner";

const scanner = new SessionScanner("/path/to/sessions");

// Scan single session
const result = await scanner.scanSession("/path/to/session.json");

// Scan all sessions
const results = await scanner.scanAllSessions();

// Search sessions
const matches = await scanner.searchSessions("puppeteer");

// Find by insight type
const errorSessions = await scanner.findByInsightType("error_pattern");
```

### MemoryArtifactUpdater

Manage memory storage:

```typescript
import { createMemoryArtifactUpdater } from "./memory-artifact-updater";

const updater = createMemoryArtifactUpdater(".pi/agent-mind");

// Add insights
const artifacts = updater.addInsights(insights);

// Search
const results = updater.searchArtifacts("retry");

// Get stats
const stats = updater.getStats();

// Generate context
const context = updater.generateBehaviorContext();
```

### ConfidenceScorer

Score insights programmatically:

```typescript
import { ConfidenceScorer } from "./confidence-scorer";

const score = ConfidenceScorer.score(
  { type: InsightType.SUCCESS_PATTERN, content: "Use retry logic" },
  sessionEntries,
  toolMetrics
);

console.log(`Confidence: ${score.overall}`);
// "repetition: mentioned multiple times, well-structured"
```

## TypeScript Interfaces

### Configuration

```typescript
interface AgentMindConfig {
  enabled: boolean;
  autoExtract: boolean;
  memoryPath: string;
  confidenceThreshold: number;
  validatePatterns: boolean;
  minFrequency: number;
}

const DEFAULT_CONFIG: AgentMindConfig = {
  enabled: true,
  autoExtract: false,
  memoryPath: ".pi/agent-mind",
  confidenceThreshold: 0.6,
  validatePatterns: true,
  minFrequency: 3
};
```

### Insight

```typescript
interface Insight {
  id: string;
  type: InsightType;
  timestamp: string;
  task: string;
  observation: string;
  implication: string;
  action: string;
  confidence: number;
  source: "execution" | "reflection" | "external";
  validated: boolean;
  category: string;
  tags: string[];
  frequency: number;
  appliedCount: number;
  successRate: number;
}
```

### Session Entry

```typescript
interface SessionEntry {
  id: string;
  type: "message" | "compaction" | "tool_call" | "tool_result";
  timestamp?: number;
  message?: {
    role: "user" | "assistant" | "system";
    content: unknown;
  };
  toolCall?: ToolCall;
  toolResult?: ToolResult;
}
```

### Tool Call (Hermes Format)

```typescript
interface ToolCall {
  name: string;
  arguments?: Record<string, unknown>;
  inputTokens?: number;
}

interface HermesToolCall {
  type: "function";
  function: {
    name: string;
    arguments: string | Record<string, unknown>;
  };
}
```

### Session Analysis

```typescript
interface SessionAnalysis {
  sessionId: string;
  timestamp: string;
  toolCalls: ToolCall[];
  toolResults: ToolResult[];
  toolMetrics: ToolMetric[];
  totalDuration?: number;
  errors: string[];
  successPatterns: string[];
}

interface ToolMetric {
  toolName: string;
  invocations: number;
  successes: number;
  failures: number;
  averageLatency: number;
  lastUsed: string;
}
```

### Memory Artifact

```typescript
interface MemoryArtifact {
  id: string;
  type: string;
  category: string;
  content: string;
  lastUpdated: number;
  source: string;
  tags: string[];
  module?: string;
  component?: string;
  confidence: number;
  frequency: number;
  firstObserved: string;
  lastObserved: string;
  appliedCount: number;
  successRate: number;
  validated: boolean;
}
```

## Integration Examples

### Custom Insight Extraction

```typescript
import { InsightExtractor, InsightType } from "pi-agent-mind";

const extractor = new InsightExtractor({
  minConfidence: 0.8,
  types: [InsightType.ERROR_PATTERN, InsightType.SUCCESS_PATTERN]
});

const insights = extractor.extract(sessionEntries);
```

### Build Custom Memory Store

```typescript
import { createMemoryArtifactUpdater } from "pi-agent-mind";

const updater = createMemoryArtifactUpdater("/custom/path");

// Import from backup
const count = updater.importFromFile("./backup.json");

// Export for backup
updater.exportToFile("./backup.json");
```

### Analyze Historical Sessions

```typescript
import { SessionScanner } from "pi-agent-mind";

const scanner = new SessionScanner("./sessions");

// Get all insights
const insights = await scanner.aggregateInsights(0.7);

// Get tool effectiveness
const metrics = await scanner.aggregateToolMetrics();

console.log(`Most used: ${metrics[0]?.toolName}`);
```

### Create Custom Commands

```typescript
pi.registerCommand("my-insights", {
  description: "Custom insight extraction",
  handler: async (args, ctx) => {
    const { minConfidence = 0.6 } = args;
    const entries = ctx.sessionManager.getBranch();
    
    const extractor = new InsightExtractor({ 
      minConfidence: parseFloat(minConfidence) 
    });
    
    const insights = extractor.extract(entries);
    ctx.ui.notify(`Found ${insights.length} insights`, "success");
    
    return insights;
  }
});
```

## Best Practices

### Error Handling

```typescript
pi.registerCommand("safe-insights", {
  description: "Safe insight extraction",
  handler: async (args, ctx) => {
    try {
      const insights = extractor.extract(entries);
      return insights;
    } catch (error) {
      ctx.ui.notify(`Error: ${error.message}`, "error");
      return [];
    }
  }
});
```

### Async Operations

```typescript
pi.registerCommand("async-scan", {
  handler: async (args, ctx) => {
    ctx.ui.notify("Scanning...", "info");
    
    const results = await scanner.scanAllSessions();
    
    ctx.ui.notify(`Found ${results.length} sessions`, "success");
  }
});
```

### Cancellation Support

```typescript
pi.registerTool({
  name: "cancellable_extract",
  execute: async (id, params, signal) => {
    // Check for cancellation
    if (signal.aborted) return;
    
    const insights = extractor.extract(entries);
    return { content: [{ type: "text", text: JSON.stringify(insights) }] };
  }
});
```

## Related Documentation

- [Getting Started](getting-started.md) - Installation and quick start
- [Configuration](configuration.md) - Configuration options
- [Architecture](architecture.md) - System design
- [CLI Commands](cli.md) - All available commands
