# Architecture

System architecture and component design for pi-agent-mind.

## Overview

pi-agent-mind implements a **Hermes-style closed learning loop** for AI coding agents. It extracts actionable insights from session data, stores them with rich metadata, and enables context-aware decision making.

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLOSED LOOP LEARNING                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐    ┌─────────────────┐    ┌──────────────────┐     │
│  │ Session  │───▶│  Insight        │───▶│  Memory          │     │
│  │ Data     │    │  Extractor      │    │  Artifact        │     │
│  │          │    │  (7-type pipe)  │    │  Updater         │     │
│  └──────────┘    └─────────────────┘    └──────────────────┘     │
│       │                 │                       │               │
│       │                 │                       ▼               │
│       │          ┌───────┴───────┐       ┌──────────────┐        │
│       │          │  Confidence   │       │  Behavior    │        │
│       └─────────▶│  Scorer      │       │  Context     │        │
│                   └───────────────┘       └──────────────┘        │
│                                                          │       │
│  ┌──────────┐    ┌─────────────────┐                     │       │
│  │ Next     │◀───│  Agent          │◀────────────────────┘       │
│  │ Session  │    │  Decisions      │                              │
│  └──────────┘    └─────────────────┘                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Insight Extractor

**File:** `src/insight-extractor.ts`

Implements the Pydantic-Deep Improvement Pipeline with 7 insight types.

#### Extraction Pipeline

```typescript
extract(entries: SessionEntry[]): Insight[]
```

**7 Insight Types:**

| Type | Description | Confidence Weight |
|------|-------------|------------------|
| `ERROR_PATTERN` | Bugs, failures, exceptions | 0.85 |
| `SUCCESS_PATTERN` | What worked well | 0.90 |
| `TOOL_EFFECTIVENESS` | Tool performance metrics | 0.80 |
| `TIMING_INSIGHT` | Optimal timing strategies | 0.75 |
| `STRATEGY_ADJUSTMENT` | Tactical pivots | 0.80 |
| `CONTEXT_REQUIREMENT` | Missing context issues | 0.70 |
| `METADATA_OBSERVATION` | Environmental changes | 0.65 |

#### Pattern Detection

Each insight type uses regex patterns to identify relevant content:

```typescript
// ERROR_PATTERN detection
const errorPatterns = [
  /error[:\s]/i,
  /exception/i,
  /failed[:\s]/i,
  /timeout/i,
  /bug[:\s]/i,
  // ...
];

// SUCCESS_PATTERN detection
const successPatterns = [
  /success/i,
  /completed/i,
  /work.*well/i,
  /solved by/i,
  // ...
];
```

### 2. Confidence Scorer

**File:** `src/confidence-scorer.ts`

Multi-factor confidence scoring system.

#### Scoring Factors

```typescript
interface ConfidenceScore {
  overall: number;           // 0-1 weighted score
  factors: {
    repetition: number;     // Weight: 0.25
    frequency: number;      // Weight: 0.20
    clarity: number;        // Weight: 0.15
    pattern: number;        // Weight: 0.15
    context: number;        // Weight: 0.15
    source: number;         // Weight: 0.10
  };
  reasoning: string;       // Human-readable explanation
}
```

#### Factor Details

| Factor | Calculation | Weight |
|--------|-------------|--------|
| **repetition** | How often pattern appears in context | 0.25 |
| **frequency** | Number of occurrences (1=0.3, 3+=0.7, 10+=1.0) | 0.20 |
| **clarity** | Structure, length, specificity, code presence | 0.15 |
| **pattern** | Intrinsic confidence by insight type | 0.15 |
| **context** | Session richness, tool usage, compactions | 0.15 |
| **source** | execution(0.9) > reflection(0.7) > external(0.5) | 0.10 |

### 3. Session Scanner

**File:** `src/session-scanner.ts`

Parses session files and extracts tool call data in Hermes format.

#### Hermes Format Support

```typescript
// Supported tool call formats
interface HermesToolCall {
  type: "function";
  function: {
    name: string;
    arguments: string | Record<string, unknown>;
  };
}
```

#### Parsing Capabilities

- Standard session format
- Function call format
- Tool call format
- Nested structures

#### Tool Metrics Calculation

```typescript
interface ToolMetric {
  toolName: string;
  invocations: number;
  successes: number;
  failures: number;
  averageLatency: number;
  lastUsed: string;
}
```

### 4. Memory Artifact Updater

**File:** `src/memory-artifact-updater.ts`

Generates YAML frontmatter files and manages the memory index.

#### YAML Frontmatter Schema

```yaml
---
id: insight_1712345678_abc1234
type: error_pattern
category: error-patterns
tags:
  - puppeteer
  - timeout
module: browser-automation
component: page-loader
confidence: 0.85
frequency: 4
first_observed: 2024-04-01T10:30:00Z
last_observed: 2024-04-05T14:20:00Z
track: knowledge
applied_count: 2
success_rate: 0.75
validated: true
---

# Error Pattern: Page Load Timeout

## Observation
The page load timeout was being triggered after 30 seconds...

## Implication
This pattern may recur; consider adding prevention logic

## Action
Document error pattern and implement prevention measures

## Root Cause
Network latency in CI environment exceeded default timeout
```

#### Category Directories

```
learnings/
├── error-patterns/
├── success-patterns/
├── tool-effectiveness/
├── timing-insights/
├── strategy-adjustments/
├── context-requirements/
└── metadata-observations/
```

### 5. Behavior Context Generator

Generates `behavior-context.md` for agent context accumulation.

```markdown
# Agent Behavior Context

## Project: Shopiflame

## Learned Patterns

### SUCCESS PATTERNS

1. **Use retry with exponential backoff for rate-limited APIs**
   - Frequency: 5x
   - Confidence: 90%
   - Success Rate: 95%
   - Last Observed: 2024-04-05

## Tool Effectiveness

| Tool | Success Rate | Avg Latency | Invocations |
|------|--------------|-------------|-------------|
| puppeteer | 92.5% | 2340ms | 47 |
| crawl4ai | 88.0% | 1850ms | 25 |

## Session History

- ✅ User authentication flow - 2024-04-05
- ✅ Product scraping pipeline - 2024-04-04
- ⚠️ API rate limit handling - 2024-04-03
```

## Data Flow

```
1. Session Data Input
   └── Raw session entries from pi coding agent

2. Entry Parsing
   └── SessionScanner.parseEntry()
       ├── Messages → text extraction
       ├── Tool calls → Hermes format parsing
       └── Tool results → error/success tracking

3. Insight Extraction
   └── InsightExtractor.extract()
       ├── Pattern detection (7 types)
       ├── Confidence scoring
       └── Deduplication

4. Memory Storage
   └── MemoryArtifactUpdater.addInsights()
       ├── YAML frontmatter generation
       ├── Category organization
       └── Index update

5. Context Accumulation
   └── updateContextWithLearnings()
       ├── Pattern tracking
       ├── Tool metrics aggregation
       └── Session history

6. Agent Decision Support
   └── generateBehaviorContext()
       └── Context for next session
```

## Type System

### Insight Types (Enum)

```typescript
enum InsightType {
  ERROR_PATTERN = "error_pattern",
  SUCCESS_PATTERN = "success_pattern",
  TOOL_EFFECTIVENESS = "tool_effectiveness",
  TIMING_INSIGHT = "timing_insight",
  STRATEGY_ADJUSTMENT = "strategy_adjustment",
  CONTEXT_REQUIREMENT = "context_requirement",
  METADATA_OBSERVATION = "metadata_observation"
}
```

### Key Interfaces

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

interface MemoryArtifact {
  id: string;
  type: string;
  category: string;
  content: string;
  lastUpdated: number;
  source: string;
  tags: string[];
  confidence: number;
  frequency: number;
  validated: boolean;
  // ... additional fields
}
```

## Extension Points

### Custom Insight Types

Extend `InsightType` enum and add extraction patterns:

```typescript
// In insight-extractor.ts
const customPatterns = [
  /security/i,
  /vulnerability/i,
  /injection/i,
];
```

### Custom Scoring Factors

Modify `ConfidenceScorer` weights:

```typescript
const WEIGHTS = {
  repetition: 0.25,
  frequency: 0.20,
  clarity: 0.15,
  pattern: 0.15,
  context: 0.15,
  source: 0.10
};
```

### Custom Memory Formats

Override `generateFrontmatter()` in `MemoryArtifactUpdaterImpl`.

## Performance Considerations

| Operation | Complexity | Notes |
|-----------|------------|-------|
| extract() | O(n × m) | n=entries, m=patterns |
| scanSession() | O(n) | n=session size |
| searchArtifacts() | O(k) | k=artifacts |
| aggregateInsights() | O(n × k) | All sessions |

## Related Documentation

- [Getting Started](getting-started.md) - Installation and quick start
- [Configuration](configuration.md) - Configuration options
- [CLI Commands](cli.md) - All available commands
- [Extension API](api.md) - Programmatic access
