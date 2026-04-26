# pi-agent-mind

**Self-improving AI agent extension for pi coding agent - closed-loop learning system with insight extraction, memory consolidation, and autonomous improvement**

[![npm version](https://img.shields.io/npm/v/@jessenguyen22/pi-agent-mind.svg)](https://www.npmjs.com/package/@jessenguyen22/pi-agent-mind)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/Shopiflame-xx/pi-agent-mind/pulls)
[![GitHub stars](https://img.shields.io/github/stars/Shopiflame-xx/pi-agent-mind)](https://github.com/Shopiflame-xx/pi-agent-mind/stargazers)
[![GitHub last commit](https://img.shields.io/github/last-commit/Shopiflame-xx/pi-agent-mind)](https://github.com/Shopiflame-xx/pi-agent-mind/commits)

> 🧠 A Hermes-style closed-loop learning system that extracts 7 types of insights from session data, scores their confidence, and builds persistent memory artifacts for autonomous agent improvement.

## Features

### 🧠 Closed-Loop Learning Architecture

- **Insight Extraction Engine**: Automatically extracts meaningful insights from session content using a 7-type Pydantic-Deep pipeline
- **Session Scanner**: Scans session files to find patterns and relevant context
- **Memory Artifact Updater**: Manages persistent memory files with extracted insights and YAML frontmatter
- **Confidence Scoring**: Scores extracted insights based on repetition, clarity, and context (6-factor scoring system)

### 📊 7 Insight Types (Pydantic-Deep Pipeline)

| Type | Icon | Description |
|------|------|-------------|
| **Error Pattern** | 🔴 | Bugs, failures, exceptions with root cause and recovery strategies |
| **Success Pattern** | ✅ | What worked well with reproducibility scores |
| **Tool Effectiveness** | 🔧 | Which tools worked best with latency/cost metrics |
| **Timing Insight** | ⏱️ | When to use what approach based on conditions |
| **Strategy Adjustment** | 🔄 | Tactical pivots with expected vs actual improvement |
| **Context Requirement** | 📋 | What context was missing with workarounds |
| **Metadata Observation** | 📊 | Environmental changes with adaptation strategies |

### ⚡ Core Capabilities

| Capability | Description |
|------------|-------------|
| **Hermes Format Parsing** | Parse tool calls in Hermes format for accurate execution tracking |
| **Confidence-Based Filtering** | 6-factor scoring system (repetition, frequency, clarity, pattern, context, source) |
| **Memory Consolidation** | YAML frontmatter artifacts with full metadata |
| **Context Accumulation** | Pattern 1 from ARCHITECTURE.md - build behavior context over time |
| **Auto-Extract on Agent End** | Optional automatic insight extraction at session end |
| **Multi-Session Scanning** | Scan all historical sessions for cross-session patterns |

### 🔌 Available Tools (for LLM use)

| Tool | Description |
|------|-------------|
| `agent_mind_extract` | Extract insights with configurable confidence threshold and type filter |
| `agent_mind_search` | Full-text search of previously saved insights |
| `agent_mind_stats` | Get memory statistics and insight distribution |
| `agent_mind_context` | Get current agent behavior context for context-aware decisions |

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            pi-agent-mind                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                     Closed-Loop Learning System                          │ │
│  │  ┌───────────┐    ┌──────────────┐    ┌────────────────┐                │ │
│  │  │  Execute  │───▶│    Scan      │───▶│    Extract     │                │ │
│  │  │   Task    │    │   Session    │    │    Insights    │                │ │
│  │  └───────────┘    └──────────────┘    └───────┬────────┘                │ │
│  │         ▲                                      │                         │ │
│  │         │                                      ▼                         │ │
│  │  ┌───────┴────────┐              ┌────────────────────┐                │ │
│  │  │   Update       │◀─────────────│  Confidence Score  │                │ │
│  │  │   Memory       │              │  (6-factor system) │                │ │
│  │  └───────┬────────┘              └────────────────────┘                │ │
│  │          │                                                                │ │
│  │          ▼                                                                │ │
│  │  ┌────────────────────┐      ┌─────────────────────┐                   │ │
│  │  │   Behavior         │      │   Memory            │                   │ │
│  │  │   Context          │      │   Artifacts          │                   │ │
│  │  │   (Pattern 1)      │      │   (YAML frontmatter) │                   │ │
│  │  └────────────────────┘      └─────────────────────┘                   │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                    7-Type Insight Pipeline                               │ │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────┐ │ │
│  │  │ Error   │ │Success  │ │  Tool   │ │ Timing  │ │Strategy │ │Context│ │ │
│  │  │ Pattern │ │ Pattern │ │Effectiv.│ │ Insight │ │Adjust.  │ │ Req.  │ │ │
│  │  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └───┬───┘ │ │
│  │       └───────────┴───────────┴───────────┴───────────┴─────────┘     │ │
│  │                               │                                          │ │
│  │                    ┌──────────┴──────────┐                            │ │
│  │                    │ Metadata Observation  │                            │ │
│  │                    └───────────────────────┘                            │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Components

| Component | Description |
|-----------|-------------|
| **Insight Extractor** | Core extraction engine using 7-type Pydantic-Deep pipeline |
| **Session Scanner** | Parses session files with Hermes tool call format support |
| **Memory Artifact Updater** | Generates YAML-frontmatter artifacts with full metadata |
| **Confidence Scorer** | 6-factor scoring (repetition 25%, frequency 20%, clarity 15%, pattern 15%, context 15%, source 10%) |
| **Agent Context Accumulator** | Pattern 1 - builds persistent behavior context over sessions |

## Installation

```bash
# Global installation via npm
pi install npm:@jessenguyen22/pi-agent-mind

# Project-local installation
pi install -l npm:@jessenguyen22/pi-agent-mind

# From GitHub (latest)
pi install git:github.com/Shopiflame-xx/pi-agent-mind

# Manual installation
cp -r pi-agent-mind ~/.pi/agent/extensions/
```

## Quick Start

### 1. Install the extension

```bash
pi install npm:@jessenguyen22/pi-agent-mind
```

### 2. Restart pi

```bash
pi
```

### 3. Extract insights from current session

```bash
/insights
```

### 4. Save insights to memory

```bash
/insights:save
```

### 5. Search saved insights

```bash
/insights:search <query>
```

## Configuration

Create `~/.pi/agent/settings.json` to customize the extension:

```json
{
  "agentMind": {
    "enabled": true,
    "autoExtract": false,
    "memoryPath": ".pi/agent-mind",
    "confidenceThreshold": 0.6,
    "validatePatterns": true,
    "minFrequency": 3
  }
}
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | `true` | Enable/disable the extension |
| `autoExtract` | boolean | `false` | Auto-extract on agent_end events |
| `memoryPath` | string | `.pi/agent-mind` | Path for memory storage |
| `confidenceThreshold` | number | `0.6` | Minimum confidence for insights (0-1) |
| `validatePatterns` | boolean | `true` | Validate patterns before saving |
| `minFrequency` | number | `3` | Minimum occurrences to validate pattern |

## CLI Commands

| Command | Description |
|---------|-------------|
| `/insights` | Extract and display insights from the current session (7 types) |
| `/insights:analyze` | Analyze session with tool call parsing (Hermes format) |
| `/insights:learn` | Run closed-loop learning iteration (Hermes pattern) |
| `/insights:save` | Save current session insights to memory with YAML frontmatter |
| `/insights:search <query>` | Search insights in memory by keyword or type |
| `/insights:context` | Display and update behavior context (Pattern 1) |
| `/insights:stats` | Show insight memory statistics |
| `/insights:scan` | Scan all sessions for insights and tool usage |

## API Reference

### Extension Events

```typescript
// On session start
pi.on("session_start", async (event, ctx) => {
  console.log("Agent mind session started");
});

// On agent end (when autoExtract is enabled)
pi.on("agent_end", async (event, ctx) => {
  console.log("Session ended - insights may have been auto-extracted");
});
```

### Tools (LLM Use)

```typescript
// Extract insights with options
const insights = await pi.tools.agent_mind_extract({
  minConfidence: 0.7,
  maxInsights: 50,
  type: "error_pattern" // Optional: filter by insight type
});

// Search saved insights
const results = await pi.tools.agent_mind_search({
  query: "authentication",
  type: "success_pattern" // Optional: filter by type
});

// Get memory statistics
const stats = await pi.tools.agent_mind_stats();

// Get behavior context
const context = await pi.tools.agent_mind_context();
```

### Insight Types Enum

```typescript
enum InsightType {
  ERROR_PATTERN = "error_pattern",
  SUCCESS_PATTERN = "success_pattern",
  TOOL_EFFECTIVENESS = "tool_effectiveness",
  TIMING_INSIGHT = "timing_insight",
  STRATEGY_ADJUSTMENT = "strategy_adjustment",
  CONTEXT_REQUIREMENT = "context_requirement",
  METADATA_OBSERVATION = "metadata_observation",
}
```

### Configuration Interface

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

## Examples

### Basic Insight Extraction

```typescript
// Start a coding session, then run:
/insights

// Output shows all 7 insight types with confidence scores:
## [error_pattern] ○ (65% confidence)
Task: Fix authentication bug
...
→ Prevent this error by adding input validation
Tags: #authentication #security

## [success_pattern] ✓ (85% confidence)
Task: Database migration
...
→ This approach should be reused for similar migrations
Tags: #database #migration
```

### Closed-Loop Learning

```typescript
// Run the full learning iteration:
/insights:learn

// This:
// 1. Extracts insights from current session
// 2. Identifies patterns and improvements
// 3. Updates behavior context
// 4. Saves to memory artifacts
```

### Memory Search

```typescript
// Search for specific patterns:
/insights:search "authentication error"

/insights:search "React performance"

// View statistics:
/insights:stats
```

### Tool Call Analysis

```typescript
// Analyze tool usage patterns:
/insights:analyze

// Shows:
## Session Analysis
| Tool | Invocations | Success | Failures | Avg Latency |
|------|-------------|---------|----------|-------------|
| read | 45 | 100% | 0 | 12ms |
| bash | 23 | 96% | 1 | 156ms |
```

## Development

```bash
# Clone repository
git clone https://github.com/Shopiflame-xx/pi-agent-mind.git
cd pi-agent-mind

# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Project Structure

```
pi-agent-mind/
├── src/
│   ├── index.ts              # Main extension entry point
│   ├── types.ts              # TypeScript interfaces and enums
│   ├── insight-extractor.ts  # 7-type insight extraction engine
│   ├── session-scanner.ts    # Session parsing and Hermes format support
│   ├── memory-artifact-updater.ts  # YAML frontmatter artifact management
│   └── confidence-scorer.ts  # 6-factor confidence scoring
├── tests/                    # Test suite
├── examples/                # Usage examples
├── package.json
└── README.md
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request to [Shopiflame-xx/pi-agent-mind](https://github.com/Shopiflame-xx/pi-agent-mind/pulls)

## License

MIT License - see [LICENSE](LICENSE) for details.

## Related Projects

- [pi-coding-agent](https://github.com/mariozechner/pi-coding-agent) - The coding agent this extends
- [pi-tool-router](https://github.com/jessenguyen22/pi-tool-router) - Intelligent tool routing extension
- [pi-coordinator](https://github.com/skidvis/pi-coordinator) - Multi-agent orchestration
- [pi-coordination](https://github.com/nicobailon/pi-coordination) - Advanced coordination system
- [pi-interactive-shell](https://github.com/nicobailon/pi-interactive-shell) - Interactive CLI spawning

## Support

- 📖 [Documentation](docs/)
- 🐛 [Issue Tracker](https://github.com/Shopiflame-xx/pi-agent-mind/issues)
- 💬 [Discussions](https://github.com/Shopiflame-xx/pi-agent-mind/discussions)
- ⭐ [Star on GitHub](https://github.com/Shopiflame-xx/pi-agent-mind)
