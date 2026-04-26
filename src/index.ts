/**
 * pi-agent-mind extension
 * 
 * Implements the Self-Improvement Architecture from ARCHITECTURE.md
 * 
 * Features:
 * - Hermes-style closed learning loop
 * - 7 insight types (Pydantic-Deep Pipeline)
 * - Tool call parsing for Hermes format
 * - Confidence scoring system
 * - Memory artifact generators with YAML frontmatter
 * - Agent context accumulation
 * 
 * Matches: K:/Shopiflame-xx/docs/pi-agent-mind/ARCHITECTURE.md
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";

import { InsightExtractor } from "./insight-extractor";
import { SessionScanner } from "./session-scanner";
import {
	MemoryArtifactUpdaterImpl,
	createMemoryArtifactUpdater,
} from "./memory-artifact-updater";
import { ConfidenceScorer } from "./confidence-scorer";
import type {
	Insight,
	AgentMindConfig,
	SessionScanResult,
	InsightType,
	SessionAnalysis,
	ToolMetric,
	ExecutionLearnings,
	LearnedPattern,
} from "./types";

// Default configuration per ARCHITECTURE.md
const DEFAULT_CONFIG: AgentMindConfig = {
	enabled: true,
	autoExtract: false,
	memoryPath: ".pi/agent-mind",
	confidenceThreshold: 0.6,
	validatePatterns: true,
	minFrequency: 3,
};

// Active instances
let extractor: InsightExtractor | null = null;
let scanner: SessionScanner | null = null;
let updater: MemoryArtifactUpdaterImpl | null = null;
let config: AgentMindConfig = { ...DEFAULT_CONFIG };

/**
 * Initialize the extension components
 */
function initialize(cwd: string, userConfig?: Partial<AgentMindConfig>): void {
	config = { ...DEFAULT_CONFIG, ...userConfig };

	extractor = new InsightExtractor({
		minConfidence: config.confidenceThreshold,
		maxInsights: 100,
		includeMetadata: true,
		validatePatterns: config.validatePatterns,
		minFrequency: config.minFrequency,
	});

	scanner = new SessionScanner(cwd, extractor);
	updater = createMemoryArtifactUpdater(
		config.memoryPath,
		".context/agent-mind"
	);
}

/**
 * Format insights for display
 */
function formatInsights(insights: Insight[]): string {
	if (insights.length === 0) {
		return "No insights found.";
	}

	const lines: string[] = [];
	for (const insight of insights) {
		const confidence = Math.round(insight.confidence * 100);
		const validated = insight.validated ? "✓" : "○";
		lines.push(`## [${insight.type}] ${validated} (${confidence}% confidence)`);
		lines.push(`Task: ${insight.task}`);
		lines.push("");
		lines.push(insight.observation.slice(0, 300));
		if (insight.observation.length > 300) {
			lines.push("...");
		}
		lines.push("");
		if (insight.implication) {
			lines.push(`→ ${insight.implication}`);
		}
		if (insight.tags.length > 0) {
			lines.push(`Tags: ${insight.tags.map(t => `#${t}`).join(" ")}`);
		}
		lines.push("");
	}

	return lines.join("\n");
}

/**
 * Format session analysis
 */
function formatSessionAnalysis(analysis: SessionAnalysis): string {
	const lines: string[] = [];

	lines.push("## Session Analysis");
	lines.push("");
	lines.push(`Session ID: ${analysis.sessionId}`);
	lines.push(`Timestamp: ${analysis.timestamp}`);
	if (analysis.totalDuration) {
		const durationSec = Math.round(analysis.totalDuration / 1000);
		lines.push(`Duration: ${durationSec}s`);
	}
	lines.push("");

	lines.push("### Tool Usage");
	lines.push("");
	if (analysis.toolMetrics.length === 0) {
		lines.push("No tools used in this session.");
	} else {
		lines.push("| Tool | Invocations | Success | Failures | Avg Latency |");
		lines.push("|------|-------------|---------|----------|-------------|");
		for (const metric of analysis.toolMetrics) {
			const successRate = metric.invocations > 0
				? (metric.successes / metric.invocations * 100).toFixed(0)
				: "N/A";
			lines.push(
				`| ${metric.toolName} | ${metric.invocations} | ${successRate}% | ${metric.failures} | ${metric.averageLatency.toFixed(0)}ms |`
			);
		}
	}
	lines.push("");

	if (analysis.errors.length > 0) {
		lines.push("### Errors");
		lines.push("");
		for (const error of analysis.errors) {
			lines.push(`- ❌ ${error}`);
		}
		lines.push("");
	}

	return lines.join("\n");
}

/**
 * Extract learnings from execution (Hermes closed loop)
 */
async function extractExecutionLearnings(
	task: string,
	result: SessionScanResult
): Promise<ExecutionLearnings> {
	const errors = result.analysis.errors;
	const patterns: string[] = [];
	const improvements: string[] = [];

	// Extract patterns from insights
	for (const insight of result.insights) {
		if (insight.type === InsightType.SUCCESS_PATTERN) {
			patterns.push(insight.observation);
		}
		if (insight.type === InsightType.ERROR_PATTERN) {
			improvements.push(`Prevent: ${insight.implication}`);
		}
		if (insight.type === InsightType.STRATEGY_ADJUSTMENT) {
			improvements.push(`Strategy: ${insight.observation}`);
		}
	}

	return {
		taskType: task,
		timestamp: new Date().toISOString(),
		steps: result.entries,
		success: errors.length === 0,
		duration: result.analysis.totalDuration ?? 0,
		errors,
		patterns,
		improvements,
	};
}

/**
 * Update context with learnings (Pattern 1: Context Accumulation)
 */
async function updateContextWithLearnings(
	learnings: ExecutionLearnings
): Promise<void> {
	if (!updater) return;

	// Update patterns
	for (const pattern of learnings.patterns) {
		updater.updateContextWithPattern({
			id: `pattern_${Date.now()}`,
			type: InsightType.SUCCESS_PATTERN,
			timestamp: learnings.timestamp,
			task: learnings.taskType,
			observation: pattern,
			implication: "This approach should be reused",
			action: "Apply in similar scenarios",
			confidence: 0.8,
			source: "execution",
			validated: false,
			category: "success-patterns",
			tags: [],
			frequency: 1,
			appliedCount: 0,
			successRate: learnings.success ? 1 : 0,
		});
	}

	// Update tool metrics
	const toolMetrics = new Map<string, ToolMetric>();
	for (const insight of (scanner as SessionScanner)?.constructor?.name ? [] : []) {
		// Extract from analysis
	}
	// Note: Would need access to tool metrics from result

	// Add session summary
	updater.addSessionSummary({
		sessionId: `session_${Date.now()}`,
		timestamp: learnings.timestamp,
		task: learnings.taskType,
		outcome: learnings.success ? "success" : learnings.errors.length > 0 ? "failed" : "partial",
		insightsExtracted: 0,
		duration: learnings.duration,
	});
}

/**
 * Main extension entry point
 */
export default function (pi: ExtensionAPI) {
	// Initialize with cwd
	initialize(process.cwd());

	// Session start
	pi.on("session_start", async (_event, ctx) => {
		if (!ctx.sessionManager) return;

		const sessionFile = ctx.sessionManager.getSessionFile();
		if (sessionFile) {
			const sessionDir = require("node:path").dirname(sessionFile);
			scanner = new SessionScanner(sessionDir, extractor);
		}

		if (config.autoExtract && ctx.hasUI) {
			ctx.ui.notify("pi-agent-mind active - Self-improvement enabled", "info");
		}
	});

	// =====================================================================
	// COMMANDS
	// =====================================================================

	pi.registerCommand("insights", {
		description: "Extract and display insights from the current session (7 types)",
		handler: async (_args, ctx) => {
			if (!extractor) {
				ctx.ui.notify("Agent mind not initialized", "error");
				return;
			}

			const branch = ctx.sessionManager.getBranch();

			// Parse entries for tool calls
			const parsedEntries = scanner?.parseEntries
				? (scanner as unknown as { parseEntries: (d: unknown) => unknown }).parseEntries({ entries: branch })
				: branch.map((e: { type?: string; message?: unknown }) => ({
					id: "",
					type: e.type ?? "message",
					message: e.message,
				}));

			const insights = extractor.extract(parsedEntries as Parameters<typeof extractor.extract>[0]);

			if (insights.length === 0) {
				ctx.ui.notify("No insights extracted", "warning");
				return;
			}

			// Save to memory
			if (updater) {
				updater.addInsights(insights);
			}

			const formatted = formatInsights(insights);
			ctx.ui.notify(`Extracted ${insights.length} insights`, "success");
			console.log("\n" + formatted);
		},
	});

	pi.registerCommand("insights:analyze", {
		description: "Analyze session with tool call parsing (Hermes format)",
		handler: async (_args, ctx) => {
			if (!scanner || !extractor) {
				ctx.ui.notify("Scanner not initialized", "error");
				return;
			}

			ctx.ui.notify("Analyzing session...", "info");

			try {
				const branch = ctx.sessionManager.getBranch();
				const entries = branch.map((e: { type?: string; message?: unknown }) => ({
					id: "",
					type: e.type ?? "message",
					message: e.message,
				}));
				const insights = extractor.extract(entries as Parameters<typeof extractor.extract>[0]);

				// Build analysis from entries
				const analysis: SessionAnalysis = {
					sessionId: "current",
					timestamp: new Date().toISOString(),
					toolCalls: [],
					toolResults: [],
					toolMetrics: [],
					errors: [],
					successPatterns: [],
				};

				// Parse tool calls
				for (const entry of entries as Array<{ type?: string; toolCall?: { name: string; arguments?: unknown } }>) {
					if (entry.type === "tool_call" && entry.toolCall) {
						analysis.toolCalls.push({
							name: entry.toolCall.name,
							arguments: entry.toolCall.arguments as Record<string, unknown>,
						});
					}
				}

				const formatted = formatSessionAnalysis(analysis);
				console.log("\n" + formatted);

				ctx.ui.notify(`Found ${analysis.toolCalls.length} tool calls`, "success");
			} catch (error) {
				ctx.ui.notify(`Analysis failed: ${error}`, "error");
			}
		},
	});

	pi.registerCommand("insights:learn", {
		description: "Run closed-loop learning iteration (Hermes pattern)",
		handler: async (_args, ctx) => {
			if (!scanner || !extractor || !updater) {
				ctx.ui.notify("Components not initialized", "error");
				return;
			}

			ctx.ui.notify("Running learning iteration...", "info");

			try {
				const branch = ctx.sessionManager.getBranch();
				const entries = branch.map((e: { type?: string; message?: unknown }) => ({
					id: "",
					type: e.type ?? "message",
					message: e.message,
				}));
				const insights = extractor.extract(entries as Parameters<typeof extractor.extract>[0]);

				// Extract learnings
				const learnings = await extractExecutionLearnings("Current task", {
					sessionId: "current",
					timestamp: Date.now(),
					entries: entries.length,
					insights,
					analysis: {
						sessionId: "current",
						timestamp: new Date().toISOString(),
						toolCalls: [],
						toolResults: [],
						toolMetrics: [],
						errors: learnings => learnings.errors,
						successPatterns: [],
					} as unknown as SessionAnalysis,
					summary: "",
				});

				// Update context (closed loop)
				await updateContextWithLearnings(learnings);

				// Save insights
				updater.addInsights(insights);

				ctx.ui.notify(
					`Learned ${learnings.patterns.length} patterns, ${learnings.improvements.length} improvements`,
					"success"
				);
			} catch (error) {
				ctx.ui.notify(`Learning iteration failed: ${error}`, "error");
			}
		},
	});

	pi.registerCommand("insights:save", {
		description: "Save current session insights to memory with YAML frontmatter",
		handler: async (_args, ctx) => {
			if (!extractor || !updater) {
				ctx.ui.notify("Agent mind not initialized", "error");
				return;
			}

			const branch = ctx.sessionManager.getBranch();
			const entries = branch.map((e: { type?: string; message?: unknown }) => ({
				id: "",
				type: e.type ?? "message",
				message: e.message,
			}));
			const insights = extractor.extract(entries as Parameters<typeof extractor.extract>[0]);
			const artifacts = updater.addInsights(insights);

			ctx.ui.notify(`Saved ${artifacts.length} insights to memory`, "success");
		},
	});

	pi.registerCommand("insights:search", {
		description: "Search insights in memory by keyword or type",
		handler: async (args, ctx) => {
			if (!updater) {
				ctx.ui.notify("Agent mind not initialized", "error");
				return;
			}

			const query = args.trim();
			if (!query) {
				ctx.ui.notify("Usage: /insights:search <query>", "error");
				return;
			}

			const results = updater.searchArtifacts(query);
			if (results.length === 0) {
				ctx.ui.notify("No matching insights found", "info");
				return;
			}

			ctx.ui.notify(`Found ${results.length} matching insights`, "success");

			for (const artifact of results.slice(0, 5)) {
				console.log(`\n[${artifact.type}] ${artifact.content.slice(0, 200)}...`);
			}
		},
	});

	pi.registerCommand("insights:context", {
		description: "Display and update behavior context (Pattern 1)",
		handler: async (_args, ctx) => {
			if (!updater) {
				ctx.ui.notify("Agent mind not initialized", "error");
				return;
			}

			const context = updater.generateBehaviorContext();
			console.log("\n" + context);
			ctx.ui.notify("Context updated", "success");
		},
	});

	pi.registerCommand("insights:stats", {
		description: "Show insight memory statistics",
		handler: async (_args, ctx) => {
			if (!updater) {
				ctx.ui.notify("Agent mind not initialized", "error");
				return;
			}

			const stats = updater.getStats();
			console.log("\n## Memory Statistics");
			console.log(`Total artifacts: ${stats.total}`);
			console.log("\nBy type (7 insight types from ARCHITECTURE.md):");
			for (const [type, count] of Object.entries(stats.byType)) {
				const icon = type.includes("error") ? "🔴" :
					type.includes("success") ? "✅" :
					type.includes("tool") ? "🔧" :
					type.includes("timing") ? "⏱️" :
					type.includes("strategy") ? "🔄" :
					type.includes("context") ? "📋" :
					type.includes("metadata") ? "📊" : "📝";
				console.log(`  ${icon} ${type}: ${count}`);
			}
			console.log("\nTop tags:");
			const topTags = Object.entries(stats.byTag)
				.sort((a, b) => b[1] - a[1])
				.slice(0, 5);
			for (const [tag, count] of topTags) {
				console.log(`  #${tag}: ${count}`);
			}
		},
	});

	pi.registerCommand("insights:scan", {
		description: "Scan all sessions for insights and tool usage",
		handler: async (_args, ctx) => {
			if (!scanner) {
				ctx.ui.notify("Scanner not initialized", "error");
				return;
			}

			ctx.ui.notify("Scanning sessions...", "info");

			try {
				const results = await scanner.scanAllSessions();
				let totalInsights = 0;
				let totalToolCalls = 0;

				for (const result of results) {
					totalInsights += result.insights.length;
					totalToolCalls += result.analysis.toolCalls.length;
				}

				ctx.ui.notify(
					`Scanned ${results.length} sessions, found ${totalInsights} insights, ${totalToolCalls} tool calls`,
					"success"
				);
			} catch (error) {
				ctx.ui.notify(`Scan failed: ${error}`, "error");
			}
		},
	});

	// =====================================================================
	// TOOLS (for LLM use)
	// =====================================================================

	pi.registerTool({
		name: "agent_mind_extract",
		label: "Extract Insights",
		description: "Extract meaningful insights from the current session using the 7-type Pydantic-Deep pipeline",
		parameters: Type.Object({
			minConfidence: Type.Optional(Type.Number({
				description: "Minimum confidence threshold (0-1)",
				minimum: 0,
				maximum: 1,
			})),
			maxInsights: Type.Optional(Type.Number({
				description: "Maximum number of insights to extract",
				minimum: 1,
				maximum: 200,
			})),
			type: Type.Optional(Type.String({
				description: "Filter by specific insight type",
				enum: Object.values(InsightType),
			})),
		}),
		async execute(toolCallId, params, signal, onUpdate, ctx) {
			if (!extractor) {
				throw new Error("Agent mind not initialized");
			}

			onUpdate?.({ content: [{ type: "text", text: "Extracting insights..." }] });

			const options = {
				minConfidence: params.minConfidence ?? config.confidenceThreshold,
				maxInsights: params.maxInsights ?? 50,
				includeMetadata: true,
				validatePatterns: config.validatePatterns,
				minFrequency: config.minFrequency,
			};

			const tempExtractor = new InsightExtractor(options);
			const branch = ctx.sessionManager.getBranch();
			const entries = branch.map((e: { type?: string; message?: unknown }) => ({
				id: "",
				type: e.type ?? "message",
				message: e.message,
			}));
			let insights = tempExtractor.extract(entries as Parameters<typeof tempExtractor.extract>[0]);

			// Filter by type if specified
			if (params.type) {
				insights = insights.filter(i => i.type === params.type);
			}

			// Save to memory
			if (updater) {
				updater.addInsights(insights);
			}

			return {
				content: [{
					type: "text",
					text: formatInsights(insights),
				}],
				details: {
					count: insights.length,
					types: [...new Set(insights.map(i => i.type))],
					config: options,
				},
			};
		},
	});

	pi.registerTool({
		name: "agent_mind_search",
		label: "Search Memory",
		description: "Search previously saved insights in memory with full-text search",
		parameters: Type.Object({
			query: Type.String({ description: "Search query" }),
			type: Type.Optional(Type.String({ description: "Filter by insight type" })),
		}),
		async execute(toolCallId, params, signal, onUpdate, ctx) {
			if (!updater) {
				throw new Error("Agent mind not initialized");
			}

			let results = updater.searchArtifacts(params.query);

			if (params.type) {
				results = results.filter(r => r.type === params.type);
			}

			const insights: Insight[] = results.map(r => ({
				id: r.id,
				type: r.type as InsightType,
				timestamp: r.lastUpdated.toString(),
				task: r.category,
				observation: r.content,
				implication: "",
				action: "",
				confidence: r.confidence,
				source: r.source as "execution" | "reflection" | "external",
				validated: r.validated,
				category: r.category,
				tags: r.tags,
				frequency: r.frequency,
				appliedCount: r.appliedCount,
				successRate: r.successRate,
			}));

			return {
				content: [{
					type: "text",
					text: insights.length > 0
						? formatInsights(insights)
						: "No matching insights found.",
				}],
				details: {
					count: results.length,
					query: params.query,
				},
			};
		},
	});

	pi.registerTool({
		name: "agent_mind_stats",
		label: "Memory Stats",
		description: "Get statistics about stored insights and memory usage",
		parameters: Type.Object({}),
		async execute(toolCallId, params, signal, onUpdate, ctx) {
			if (!updater) {
				throw new Error("Agent mind not initialized");
			}

			const stats = updater.getStats();

			return {
				content: [{
					type: "text",
					text: JSON.stringify(stats, null, 2),
				}],
				details: stats,
			};
		},
	});

	pi.registerTool({
		name: "agent_mind_context",
		label: "Get Behavior Context",
		description: "Get the current agent behavior context for context-aware decisions",
		parameters: Type.Object({}),
		async execute(toolCallId, params, signal, onUpdate, ctx) {
			if (!updater) {
				throw new Error("Agent mind not initialized");
			}

			const context = updater.generateBehaviorContext();

			return {
				content: [{
					type: "text",
					text: context,
				}],
			};
		},
	});

	// =====================================================================
	// LIFECYCLE
	// =====================================================================

	// Agent end - optionally extract and save insights
	pi.on("agent_end", async (event, ctx) => {
		if (!config.autoExtract || !extractor || !updater) return;

		const branch = ctx.sessionManager.getBranch();
		const entries = branch.map((e: { type?: string; message?: unknown }) => ({
			id: "",
			type: e.type ?? "message",
			message: e.message,
		}));
		const insights = extractor.extract(entries as Parameters<typeof extractor.extract>[0]);

		if (insights.length > 0) {
			updater.addInsights(insights);
		}
	});
}
