/**
 * pi-agent-mind - Self-Improving AI Agent Extension
 *
 * A closed-loop learning system for pi coding agent.
 * Extracts insights from sessions and maintains memory.
 *
 * Features:
 * - 7 insight types (error patterns, success patterns, tool effectiveness, etc.)
 * - Memory artifact management (MEMORY.md, AGENTS.md, SOUL.md)
 * - Session analysis and improvement suggestions
 */

import {
	addInsight,
	getInsightsFromMemory,
	getMemoryStats,
	MEMORY_DIR,
} from "./memory.js";
import { createInsight, InsightType } from "./types.js";

export default function (pi) {
	// ========================================
	// COMMANDS
	// ========================================

	pi.registerCommand("mind", {
		description: "Self-improving agent memory system",
		handler: async (args, ctx) => {
			const parts = (args || "").trim().split(/\s+/);
			const cmd = parts[0] || "help";

			if (cmd === "status") {
				const stats = getMemoryStats();
				const insights = getInsightsFromMemory();
				let response = "## 📊 pi-agent-mind Status\n\n";
				response += `**Memory Directory:** ${MEMORY_DIR}\n`;
				response += `**Total Insights:** ${insights.length}\n\n`;
				response += "### Memory Files:\n";
				if (Object.keys(stats).length === 0) {
					response += "_No memory files yet_";
				} else {
					for (const [name, s] of Object.entries(stats)) {
						response += `- ${name}: ${s.lines} lines\n`;
					}
				}
				ctx.ui.notify(response, "info");
				return;
			}

			if (cmd === "insights") {
				const insights = getInsightsFromMemory();
				if (insights.length === 0) {
					ctx.ui.notify("_No insights found_", "info");
					return;
				}
				let response = "## 📝 Recent Insights\n\n";
				for (const insight of insights.slice(-10)) {
					response += `### ${insight.type || "unknown"}\n`;
					response += `**Task:** ${insight.task || "N/A"}\n`;
					response += `**Observation:** ${insight.observation || "N/A"}\n`;
					response += `**Action:** ${insight.action || "N/A"}\n\n`;
				}
				ctx.ui.notify(response, "info");
				return;
			}

			if (cmd === "improve") {
				const task = parts.slice(1).join(" ") || "general";
				const insights = getInsightsFromMemory();
				let response = `## 🧠 Improvement Analysis\n\n**Task:** ${task}\n\n`;
				if (insights.length === 0) {
					response +=
						"_No insights found. Consider adding insights after tasks._\n";
				} else {
					response += "### 💡 Past Insights:\n";
					for (const insight of insights.slice(-3)) {
						response += `- **${insight.type}:** ${insight.observation}\n  → ${insight.action}\n`;
					}
				}
				response += "\n### 📋 Recommendations:\n";
				response += "1. Use `/mind_add_insight` after completing tasks\n";
				response += "2. Document patterns and failures\n";
				ctx.ui.notify(response, "info");
				return;
			}

			ctx.ui.notify(
				`## 📊 pi-agent-mind Commands

- \`/mind status\` - Show memory statistics
- \`/mind insights\` - List recent insights  
- \`/mind improve <task>\` - Analyze task

Tools:
- \`/mind_add_insight\` - Add a new insight
- \`/mind_list_insights\` - List insights
- \`/mind_improve\` - Analyze task`,
				"info",
			);
		},
	});

	// ========================================
	// TOOLS
	// ========================================

	pi.registerTool({
		name: "mind_add_insight",
		label: "Add Insight",
		description:
			"Add a new insight to agent memory. Use this after completing tasks to record what worked or didn't work.",
		parameters: {
			type: "object",
			properties: {
				type: {
					type: "string",
					enum: Object.values(InsightType),
					description: "Type of insight",
				},
				task: {
					type: "string",
					description: "Brief description of the task",
				},
				observation: {
					type: "string",
					description: "What was observed or learned",
				},
				implication: {
					type: "string",
					description: "What this means for future work",
				},
				action: {
					type: "string",
					description: "Recommended action based on this insight",
				},
				confidence: {
					type: "number",
					default: 0.7,
					description: "Confidence level (0-1)",
				},
			},
			required: ["type", "task", "observation", "action"],
		},
		execute: async (toolCallId, params, signal) => {
			const insight = createInsight(
				params.type,
				params.task,
				params.observation,
				params.implication || "",
				params.action,
				params.confidence || 0.7,
			);
			addInsight(insight);
			return {
				content: [
					{
						type: "text",
						text: `✅ Insight added!\n\n**ID:** ${insight.id}\n**Type:** ${insight.type}\n**Confidence:** ${insight.confidence}`,
					},
				],
			};
		},
	});

	pi.registerTool({
		name: "mind_list_insights",
		label: "List Insights",
		description:
			"List all stored insights from agent memory. Filter by type or limit results.",
		parameters: {
			type: "object",
			properties: {
				type: {
					type: "string",
					description: "Filter by insight type",
				},
				limit: {
					type: "number",
					default: 10,
					description: "Maximum number of insights to show",
				},
			},
		},
		execute: async (toolCallId, params, signal) => {
			let insights = getInsightsFromMemory();
			if (params.type) {
				insights = insights.filter((i) => i.type === params.type);
			}
			insights = insights.slice(-(params.limit || 10));
			if (insights.length === 0) {
				return {
					content: [
						{ type: "text", text: "_No insights found matching criteria_." },
					],
				};
			}
			const text = insights
				.map(
					(i) =>
						`### ${i.type}\n**Task:** ${i.task}\n**Observation:** ${i.observation}\n**Action:** ${i.action}\n`,
				)
				.join("\n---\n");
			return { content: [{ type: "text", text }] };
		},
	});

	pi.registerTool({
		name: "mind_improve",
		label: "Analyze & Improve",
		description: "Analyze a task using past insights and suggest improvements.",
		parameters: {
			type: "object",
			properties: {
				task: {
					type: "string",
					description: "The task to analyze",
				},
				context: {
					type: "string",
					description: "Additional context for the task",
				},
			},
			required: ["task"],
		},
		execute: async (toolCallId, params, signal) => {
			const insights = getInsightsFromMemory();
			let response = `## 🧠 Improvement Analysis\n\n**Task:** ${params.task}\n\n`;
			if (insights.length === 0) {
				response +=
					"### 📝 No Past Insights\nConsider using `/mind_add_insight`.\n";
			} else {
				response += "### 💡 Past Insights Relevant to This Task:\n";
				const relevant = insights.filter(
					(i) =>
						i.task &&
						params.task
							.toLowerCase()
							.includes(i.task.toLowerCase().substring(0, 5)),
				);
				if (relevant.length === 0) {
					response += "_No directly relevant insights found._\n";
				} else {
					for (const insight of relevant.slice(-3)) {
						response += `- **${insight.type}:** ${insight.observation}\n  → ${insight.action}\n`;
					}
				}
			}
			response += "\n### 📋 Recommendations:\n";
			response += "1. Document learnings with `/mind_add_insight`\n";
			response += "2. Check patterns with `/mind insights`\n";
			return { content: [{ type: "text", text: response }] };
		},
	});

	// ========================================
	// INFO
	// ========================================

	return {
		name: "pi-agent-mind",
		version: "1.0.5",
		description: "Self-improving AI agent memory system",
	};
}
