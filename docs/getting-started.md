# Getting Started with pi-agent-mind

A self-improving AI agent extension for the pi coding agent that implements a closed-loop learning system with insight extraction, memory consolidation, and autonomous improvement.

## Prerequisites

- Node.js 18+ or 20+
- [pi coding agent](https://github.com/mariozechner/pi-coding-agent) installed
- npm or pnpm

## Installation

### Option 1: Clone and Install

```bash
# Clone the repository
git clone https://github.com/shopiflame/pi-agent-mind.git
cd pi-agent-mind

# Install dependencies
npm install
```

### Option 2: Use with pi Extensions

```bash
# Link or copy to your pi extensions directory
cp -r pi-agent-mind ~/.pi/agent/extensions/

# Or use the -e flag with pi
pi -e ./pi-agent-mind/src/index.ts
```

### Option 3: Install as npm Package

```bash
npm install @jessenguyen22/pi-agent-mind
```

## Quick Start

### 1. Enable the Extension

When pi starts, the extension activates automatically. To verify:

```
pi> pi-agent-mind active - Self-improvement enabled
```

### 2. Run Your First Insight Extraction

After completing some work, extract insights from your session:

```
/insights
```

This extracts meaningful patterns from your session and displays them organized by type.

### 3. Save Insights to Memory

Persist your learnings for future reference:

```
/insights:save
```

### 4. Search Your Memory

Find previously saved insights:

```
/insights:search <keyword>
```

## First Run Walkthrough

### Step 1: Complete Your First Task

Work on any coding task with pi. The extension automatically tracks:

- Tool invocations and their results
- Errors and successful operations
- Strategy decisions and adjustments

### Step 2: Extract Session Insights

After completing your task:

```bash
/insights
```

Expected output:
```
## [success_pattern] ✓ (90% confidence)
Task: Implement user authentication
...
## [error_pattern] ○ (65% confidence)
Task: Database connection issue
...
```

### Step 3: Review Extracted Insights

Insights are categorized into 7 types:

| Type | Icon | Description |
|------|------|-------------|
| `error_pattern` | 🔴 | Bugs, failures, exceptions |
| `success_pattern` | ✅ | What worked well |
| `tool_effectiveness` | 🔧 | Tool performance data |
| `timing_insight` | ⏱️ | When to use what approach |
| `strategy_adjustment` | 🔄 | Tactical pivots |
| `context_requirement` | 📋 | Missing context issues |
| `metadata_observation` | 📊 | Environmental changes |

### Step 4: View Memory Statistics

```bash
/insights:stats
```

Shows:
- Total artifacts stored
- Breakdown by insight type
- Top tags and categories

## Running the Closed-Loop Learning Iteration

For full autonomous improvement:

```bash
/insights:learn
```

This performs:
1. Session analysis with tool call parsing
2. Insight extraction across all 7 types
3. Pattern learning and context updates
4. Memory artifact generation

## Development Setup

### Running Tests

```bash
# Run all tests
npm test

# Run tests once
npm run test:run

# With coverage
npm run test:coverage
```

### Project Structure

```
pi-agent-mind/
├── src/
│   ├── index.ts              # Extension entry point
│   ├── insight-extractor.ts  # 7-type extraction pipeline
│   ├── session-scanner.ts   # Hermes-format tool parsing
│   ├── memory-artifact-updater.ts  # YAML frontmatter storage
│   ├── confidence-scorer.ts  # Multi-factor scoring
│   └── types.ts             # TypeScript definitions
├── tests/
│   └── *.test.ts            # Unit tests
├── docs/
│   ├── getting-started.md   # This file
│   ├── configuration.md     # Configuration options
│   ├── architecture.md       # System design
│   ├── cli.md               # CLI commands
│   └── api.md               # Extension API
└── package.json
```

## Next Steps

- Read [Configuration Guide](configuration.md) to customize behavior
- Explore [Architecture](architecture.md) to understand the system
- Learn [CLI Commands](cli.md) for all available commands
- Check [Extension API](api.md) for integration options
