# pi-agent-mind

A memory and insight extraction extension for the pi coding agent.

## Features

- **Insight Extraction Engine**: Automatically extracts meaningful insights from session content
- **Session Scanner**: Scans session files to find patterns and relevant context
- **Memory Artifact Updater**: Manages persistent memory files with extracted insights
- **Confidence Scoring**: Scores extracted insights based on repetition, clarity, and context

## Installation

Copy or link this extension to your pi extensions directory:

```bash
# Global installation
cp -r pi-agent-mind ~/.pi/agent/extensions/

# Or use with pi -e flag
pi -e ./pi-agent-mind/src/index.ts
```

## Commands

- `/insights` - Extract and display insights from the current session
- `/insights:save` - Save current session insights to memory
- `/insights:search <query>` - Search insights in memory
- `/insights:stats` - Show insight memory statistics
- `/insights:scan` - Scan all sessions for insights

## Tools

The extension registers these tools for LLM use:

- `agent_mind_extract` - Extract insights with configurable confidence threshold
- `agent_mind_search` - Search previously saved insights
- `agent_mind_stats` - Get memory statistics

## Configuration

The extension supports these configuration options:

```typescript
{
  enabled: true,              // Enable/disable the extension
  autoExtract: false,          // Auto-extract on agent_end events
  memoryPath: ".pi/agent-mind", // Path for memory storage
  confidenceThreshold: 0.6     // Minimum confidence for insights
}
```

## Insight Types

- `decision` - Architectural or implementation decisions
- `solution` - Problem solutions and fixes
- `pattern` - Recurring patterns and approaches
- `architecture` - System design insights
- `bug_fix` - Bug identification and fixes
- `refactor` - Refactoring opportunities
- `convention` - Coding conventions and standards
- `learning` - General learnings
