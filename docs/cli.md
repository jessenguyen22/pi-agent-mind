# CLI Commands

Complete reference for all pi-agent-mind slash commands.

## Commands Overview

| Command | Description |
|---------|-------------|
| `/insights` | Extract and display insights from current session |
| `/insights:analyze` | Analyze session with detailed tool call parsing |
| `/insights:learn` | Run full closed-loop learning iteration |
| `/insights:save` | Save current session insights to memory |
| `/insights:search` | Search insights by keyword or type |
| `/insights:context` | Display and update behavior context |
| `/insights:stats` | Show memory statistics |
| `/insights:scan` | Scan all sessions for insights |

---

## `/insights`

Extract and display insights from the current session.

### Syntax

```
/insights
```

### Description

Runs the 7-type Pydantic-Deep pipeline to extract insights from all session entries. Displays results organized by insight type with confidence scores.

### Output Format

```
## [success_pattern] ✓ (90% confidence)
Task: Implement user authentication
...
## [error_pattern] ○ (65% confidence)
Task: Database connection issue
...
```

### Example

```
pi> /insights
Extracted 5 insights

## [success_pattern] ✓ (92% confidence)
Task: Browser automation with Puppeteer

This approach of using retry with exponential backoff
consistently handles transient failures...

→ This approach should be reused in similar scenarios
Tags: #puppeteer #retry #reliability

## [error_pattern] ○ (68% confidence)
Task: API rate limit handling

The rate limit was triggered when making requests without
proper throttling...

→ Consider adding request throttling
Tags: #api #rate-limit
```

---

## `/insights:analyze`

Analyze session with detailed tool call parsing (Hermes format).

### Syntax

```
/insights:analyze
```

### Description

Performs deep analysis of session including:
- All tool invocations parsed from Hermes format
- Tool results and success/failure rates
- Error tracking with timestamps
- Session duration metrics

### Output Format

```
## Session Analysis

Session ID: session_1712345678
Timestamp: 2024-04-05T14:30:00Z
Duration: 234s

### Tool Usage

| Tool | Invocations | Success | Failures | Avg Latency |
|------|-------------|---------|----------|-------------|
| read | 15 | 100% | 0 | 45ms |
| bash | 8 | 87% | 1 | 1200ms |
| edit | 12 | 100% | 0 | 89ms |

### Errors

- ❌ bash: Command failed - timeout after 30s
```

### Example

```
pi> /insights:analyze
Analyzing session...
Found 35 tool calls
```

---

## `/insights:learn`

Run full closed-loop learning iteration.

### Syntax

```
/insights:learn
```

### Description

Executes the complete Hermes closed-loop learning cycle:

1. Session analysis with tool call parsing
2. Insight extraction across all 7 types
3. Pattern learning and validation
4. Context updates
5. Memory artifact generation

### Output Format

```
pi> /insights:learn
Running learning iteration...

Learned 3 patterns, 2 improvements

Patterns:
  - Retry with exponential backoff
  - TypeScript strict mode catches errors early
  - Use structured error handling

Improvements:
  - Add retry logic to API calls
  - Enable strict mode in tsconfig
```

---

## `/insights:save`

Save current session insights to memory with YAML frontmatter.

### Syntax

```
/insights:save
```

### Description

Extracts insights from current session and saves them to the memory store with full YAML frontmatter metadata.

### Output

```
pi> /insights:save
Saved 8 insights to memory
```

### What Gets Saved

Each insight saved includes:
- Unique ID
- Insight type and category
- Confidence score
- Tags and metadata
- Timestamps (first/last observed)
- Full observation text
- Implication and action recommendations

---

## `/insights:search`

Search insights in memory by keyword or type.

### Syntax

```
/insights:search <query>
```

### Arguments

| Argument | Type | Description |
|----------|------|-------------|
| `query` | string | Search keyword or phrase |

### Description

Searches previously saved insights using full-text search across:
- Insight observations
- Tags
- Categories

### Example

```
pi> /insights:search puppeteer

[success_pattern] Using retry with exponential backoff...

[error_pattern] Page timeout exceeded default 30s...

[tool_effectiveness] puppeteer success rate: 92%
```

### Filter by Type

Combine with type filter using the tool:

```
pi> /tool agent_mind_search(query="api", type="error_pattern")
```

---

## `/insights:context`

Display and update behavior context (Pattern 1).

### Syntax

```
/insights:context
```

### Description

Generates and displays the current agent behavior context, including:
- All learned patterns grouped by category
- Tool effectiveness metrics
- Pending improvements
- Recent session history

### Output Format

```
# Agent Behavior Context

## Project: Shopiflame

## Learned Patterns

### SUCCESS PATTERNS

1. **Use retry with exponential backoff**
   - Frequency: 5x
   - Confidence: 90%
   - Last Observed: 2024-04-05

### ERROR PATTERNS

1. **Rate limit triggers without throttling**
   - Frequency: 3x
   - Confidence: 85%
   - Last Observed: 2024-04-04

## Tool Effectiveness

| Tool | Success Rate | Avg Latency |
|------|--------------|-------------|
| puppeteer | 92% | 2340ms |
| bash | 89% | 890ms |

## Pending Improvements

- [🔴 high] Add retry logic to external API calls
- [🟡 medium] Implement request throttling

## Session History

- ✅ User authentication - 2024-04-05
- ✅ Product scraping - 2024-04-04
```

---

## `/insights:stats`

Show insight memory statistics.

### Syntax

```
/insights:stats
```

### Description

Displays comprehensive statistics about stored insights and memory usage.

### Output Format

```
## Memory Statistics

Total artifacts: 47

By type (7 insight types):
  🔴 error_pattern: 12
  ✅ success_pattern: 15
  🔧 tool_effectiveness: 8
  ⏱️ timing_insight: 5
  🔄 strategy_adjustment: 3
  📋 context_requirement: 2
  📊 metadata_observation: 2

Top tags:
  #puppeteer: 8
  #api: 6
  #timeout: 4
  #typescript: 3
  #retry: 3
```

---

## `/insights:scan`

Scan all sessions for insights and tool usage.

### Syntax

```
/insights:scan
```

### Description

Scans all session files in the session directory and extracts:
- Insights from each session
- Tool call patterns
- Aggregated metrics

### Output

```
pi> /insights:scan
Scanning sessions...

Scanned 12 sessions, found 45 insights, 127 tool calls

Most effective tools:
  - edit: 98% success rate
  - read: 100% success rate
  - bash: 85% success rate

Top patterns:
  - Error handling with retry (8 sessions)
  - TypeScript strict mode (5 sessions)
```

### What Gets Scanned

- All `.json` session files in the session directory
- Both recent and historical sessions
- Aggregated across all project history

---

## Tool Functions (LLM Use)

These tools are registered for LLM use within conversations.

### `agent_mind_extract`

Extract insights with configurable parameters.

```typescript
agent_mind_extract({
  minConfidence?: number,  // Default: config threshold
  maxInsights?: number,    // Default: 50
  type?: InsightType       // Filter by type
})
```

### `agent_mind_search`

Search saved insights.

```typescript
agent_mind_search({
  query: string,
  type?: InsightType       // Optional filter
})
```

### `agent_mind_stats`

Get memory statistics.

```typescript
agent_mind_stats({})
```

### `agent_mind_context`

Get current behavior context.

```typescript
agent_mind_context({})
```

---

## Related Documentation

- [Getting Started](getting-started.md) - Installation and quick start
- [Configuration](configuration.md) - Configuration options
- [Architecture](architecture.md) - System design
- [Extension API](api.md) - Programmatic access
