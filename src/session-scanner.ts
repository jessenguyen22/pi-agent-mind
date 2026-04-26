/**
 * Session Scanner with Tool Call Parsing
 * Implements Hermes-format tool call parsing from ARCHITECTURE.md
 * 
 * Features:
 * - Parse Hermes tool calls
 * - Track tool invocations and results
 * - Calculate tool metrics
 * - Aggregate insights across sessions
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type {
	SessionEntry,
	SessionScanResult,
	SessionAnalysis,
	Insight,
	ToolCall,
	ToolResult,
	ToolMetric,
	ParsedToolInvocation,
	HermesToolCall,
} from './types';
import { InsightExtractor } from './insight-extractor';

export class SessionScanner {
	private sessionDir: string;
	private extractor: InsightExtractor;

	constructor(sessionDir: string, extractor?: InsightExtractor) {
		this.sessionDir = sessionDir;
		this.extractor = extractor ?? new InsightExtractor();
	}

	/**
	 * Scan a session file and extract insights + tool analysis
	 */
	async scanSession(sessionPath: string): Promise<SessionScanResult> {
		const content = await fs.promises.readFile(sessionPath, 'utf-8');
		const sessionData = JSON.parse(content);

		// Parse entries and extract tool calls
		const entries = this.parseEntries(sessionData);
		const insights = this.extractor.extract(entries);
		const analysis = this.analyzeSession(entries, sessionPath);

		return {
			sessionId: path.basename(sessionPath, '.json'),
			timestamp: sessionData.timestamp ?? Date.now(),
			entries: entries.length,
			insights,
			analysis,
			summary: this.generateSummary(entries),
		};
	}

	/**
	 * Parse session entries from raw session data
	 */
	private parseEntries(sessionData: Record<string, unknown>): SessionEntry[] {
		const entries: SessionEntry[] = [];

		// Handle various session formats
		const rawEntries = sessionData.entries ?? sessionData.history ?? [];

		for (const rawEntry of rawEntries) {
			const entry = this.parseEntry(rawEntry);
			if (entry) {
				entries.push(entry);
			}
		}

		return entries;
	}

	/**
	 * Parse a single entry, handling Hermes tool call format
	 */
	private parseEntry(rawEntry: Record<string, unknown>): SessionEntry | null {
		const type = rawEntry.type as string;
		const timestamp = rawEntry.timestamp as number | undefined;

		if (type === 'message' || rawEntry.message) {
			return {
				id: (rawEntry.id as string) ?? this.generateId(),
				type: 'message',
				timestamp,
				message: {
					role: (rawEntry.message as Record<string, unknown>)?.role as 'user' | 'assistant' | 'system'
						?? rawEntry.role as 'user' | 'assistant' | 'system'
						?? 'assistant',
					content: (rawEntry.message as Record<string, unknown>)?.content
						?? rawEntry.content
						?? '',
				},
			};
		}

		if (type === 'tool_call' || rawEntry.tool_call || rawEntry.function_call) {
			const toolCall = this.parseToolCall(rawEntry);
			if (toolCall) {
				return {
					id: (rawEntry.id as string) ?? this.generateId(),
					type: 'tool_call',
					timestamp,
					toolCall,
				};
			}
		}

		if (type === 'tool_result' || rawEntry.tool_result || rawEntry.output) {
			const toolResult = this.parseToolResult(rawEntry);
			if (toolResult) {
				return {
					id: (rawEntry.id as string) ?? this.generateId(),
					type: 'tool_result',
					timestamp,
					toolResult,
				};
			}
		}

		if (type === 'compaction' || rawEntry.type === 'compaction') {
			return {
				id: (rawEntry.id as string) ?? this.generateId(),
				type: 'compaction',
				timestamp,
			};
		}

		return null;
	}

	/**
	 * Parse Hermes-format tool call
	 * Supports: function_call, tool_call, hermes format
	 */
	private parseToolCall(rawEntry: Record<string, unknown>): ToolCall | null {
		// Hermes format: { type: "function", function: { name: "...", arguments: "..." } }
		const hermesCall = rawEntry.function_call ?? rawEntry.function ?? rawEntry.tool_call;

		if (hermesCall && typeof hermesCall === 'object') {
			const func = hermesCall as Record<string, unknown>;
			const name = func.name as string;

			if (name) {
				let arguments_: Record<string, unknown> = {};

				// Parse arguments (can be string or object)
				const rawArgs = func.arguments;
				if (typeof rawArgs === 'string') {
					try {
						arguments_ = JSON.parse(rawArgs);
					} catch {
						arguments_ = {};
					}
				} else if (typeof rawArgs === 'object') {
					arguments_ = rawArgs as Record<string, unknown>;
				}

				return {
					name,
					arguments: arguments_,
					inputTokens: rawEntry.input_tokens as number | undefined,
				};
			}
		}

		// Alternative formats
		const name = (rawEntry.name ?? rawEntry.tool ?? rawEntry.function_name) as string;
		if (name) {
			return {
				name,
				arguments: (rawEntry.arguments ?? rawEntry.kwargs ?? {}) as Record<string, unknown>,
				inputTokens: rawEntry.input_tokens as number | undefined,
			};
		}

		return null;
	}

	/**
	 * Parse tool result
	 */
	private parseToolResult(rawEntry: Record<string, unknown>): ToolResult | null {
		// Direct format
		const name = (rawEntry.name ?? rawEntry.tool ?? rawEntry.function_name) as string;
		if (name) {
			return {
				name,
				output: rawEntry.output ?? rawEntry.result ?? rawEntry.content,
				error: rawEntry.error as string | undefined,
				duration: rawEntry.duration as number | undefined,
				outputTokens: rawEntry.output_tokens as number | undefined,
			};
		}

		// Look for nested structure
		const output = rawEntry.output ?? rawEntry.result ?? rawEntry.tool_result;
		if (output && typeof output === 'object') {
			const outObj = output as Record<string, unknown>;
			return {
				name: (outObj.name ?? outObj.tool ?? 'unknown') as string,
				output: outObj.output ?? outObj.content,
				error: outObj.error as string | undefined,
				duration: outObj.duration as number | undefined,
			};
		}

		return null;
	}

	/**
	 * Analyze session for tool usage patterns
	 */
	private analyzeSession(entries: SessionEntry[], sessionPath: string): SessionAnalysis {
		const toolCalls: ToolCall[] = [];
		const toolResults: ToolResult[] = [];
		const errors: string[] = [];
		const successPatterns: string[] = [];

		// Collect tool calls and results
		for (const entry of entries) {
			if (entry.type === 'tool_call' && entry.toolCall) {
				toolCalls.push(entry.toolCall);
			}
			if (entry.type === 'tool_result' && entry.toolResult) {
				toolResults.push(entry.toolResult);

				// Track errors
				if (entry.toolResult.error) {
					errors.push(`${entry.toolResult.name}: ${entry.toolResult.error}`);
				} else {
					// Track success patterns
					successPatterns.push(entry.toolResult.name);
				}
			}
		}

		// Calculate tool metrics
		const toolMetrics = this.calculateToolMetrics(toolCalls, toolResults);

		// Extract duration if available
		let totalDuration: number | undefined;
		if (entries.length > 0) {
			const first = entries[0].timestamp;
			const last = entries[entries.length - 1].timestamp;
			if (first && last) {
				totalDuration = last - first;
			}
		}

		return {
			sessionId: path.basename(sessionPath, '.json'),
			timestamp: new Date().toISOString(),
			toolCalls,
			toolResults,
			toolMetrics,
			totalDuration,
			errors,
			successPatterns,
		};
	}

	/**
	 * Calculate aggregated tool metrics
	 */
	private calculateToolMetrics(toolCalls: ToolCall[], toolResults: ToolResult[]): ToolMetric[] {
		const metricsMap = new Map<string, ToolMetric>();

		// Initialize metrics for each tool call
		for (const call of toolCalls) {
			if (!metricsMap.has(call.name)) {
				metricsMap.set(call.name, {
					toolName: call.name,
					invocations: 0,
					successes: 0,
					failures: 0,
					averageLatency: 0,
					lastUsed: '',
				});
			}
			metricsMap.get(call.name)!.invocations++;
		}

		// Update with results
		for (const result of toolResults) {
			const metric = metricsMap.get(result.name);
			if (metric) {
				if (result.error) {
					metric.failures++;
				} else {
					metric.successes++;
				}
				if (result.duration) {
					const totalLatency = metric.averageLatency * (metric.successes + metric.failures - 1);
					metric.averageLatency = (totalLatency + result.duration) / (metric.successes + metric.failures);
				}
				if (result.name) {
					metric.lastUsed = new Date().toISOString();
				}
			}
		}

		return Array.from(metricsMap.values());
	}

	/**
	 * Scan all session files in the session directory
	 */
	async scanAllSessions(): Promise<SessionScanResult[]> {
		const results: SessionScanResult[] = [];

		if (!fs.existsSync(this.sessionDir)) {
			return results;
		}

		const files = await fs.promises.readdir(this.sessionDir);
		const sessionFiles = files.filter(f => f.endsWith('.json'));

		for (const file of sessionFiles) {
			try {
				const sessionPath = path.join(this.sessionDir, file);
				const result = await this.scanSession(sessionPath);
				results.push(result);
			} catch (error) {
				console.error(`Failed to scan session ${file}:`, error);
			}
		}

		// Sort by timestamp, newest first
		results.sort((a, b) => b.timestamp - a.timestamp);

		return results;
	}

	/**
	 * Search for sessions containing specific keywords
	 */
	async searchSessions(keyword: string): Promise<SessionScanResult[]> {
		const allSessions = await this.scanAllSessions();
		const lowerKeyword = keyword.toLowerCase();

		return allSessions.filter(session => {
			// Check summary
			if (session.summary.toLowerCase().includes(lowerKeyword)) {
				return true;
			}
			// Check insights
			if (session.insights.some(insight =>
				insight.observation.toLowerCase().includes(lowerKeyword) ||
				insight.tags.some(tag => tag.toLowerCase().includes(lowerKeyword))
			)) {
				return true;
			}
			// Check tool analysis
			if (session.analysis.toolMetrics.some(m =>
				m.toolName.toLowerCase().includes(lowerKeyword)
			)) {
				return true;
			}
			return false;
		});
	}

	/**
	 * Find sessions with specific insight types
	 */
	async findByInsightType(type: string): Promise<SessionScanResult[]> {
		const allSessions = await this.scanAllSessions();

		return allSessions.filter(session =>
			session.insights.some(insight => insight.type === type)
		);
	}

	/**
	 * Aggregate insights across all sessions
	 */
	async aggregateInsights(minConfidence: number = 0.6): Promise<Insight[]> {
		const sessions = await this.scanAllSessions();
		const allInsights: Insight[] = [];

		for (const session of sessions) {
			for (const insight of session.insights) {
				if (insight.confidence >= minConfidence) {
					allInsights.push(insight);
				}
			}
		}

		return this.deduplicateInsights(allInsights);
	}

	/**
	 * Aggregate tool metrics across all sessions
	 */
	async aggregateToolMetrics(): Promise<ToolMetric[]> {
		const sessions = await this.scanAllSessions();
		const metricsMap = new Map<string, ToolMetric>();

		for (const session of sessions) {
			for (const metric of session.analysis.toolMetrics) {
				if (!metricsMap.has(metric.toolName)) {
					metricsMap.set(metric.toolName, { ...metric });
				} else {
					const existing = metricsMap.get(metric.toolName)!;
					// Merge metrics
					const totalInvocations = existing.invocations + metric.invocations;
					existing.invocations = totalInvocations;
					existing.successes += metric.successes;
					existing.failures += metric.failures;
					existing.averageLatency = (
						(existing.averageLatency * existing.invocations) +
						(metric.averageLatency * metric.invocations)
					) / totalInvocations;
					if (metric.lastUsed > existing.lastUsed) {
						existing.lastUsed = metric.lastUsed;
					}
				}
			}
		}

		return Array.from(metricsMap.values());
	}

	/**
	 * Generate a brief summary of session content
	 */
	private generateSummary(entries: SessionEntry[]): string {
		const messages = entries.filter(e => e.type === 'message' && e.message?.role === 'user');

		if (messages.length === 0) {
			return 'Empty session';
		}

		const firstMessage = messages[0];
		const text = this.extractText(firstMessage.message?.content);

		if (!text) {
			return 'Session with no text content';
		}

		return text.slice(0, 200).trim() + (text.length > 200 ? '...' : '');
	}

	/**
	 * Extract text from content blocks
	 */
	private extractText(content: unknown): string | null {
		if (typeof content === 'string') {
			return content;
		}

		if (!Array.isArray(content)) {
			return null;
		}

		const textParts: string[] = [];
		for (const part of content) {
			if (part && typeof part === 'object' && (part as { type?: string }).type === 'text') {
				const text = (part as { text?: string }).text;
				if (typeof text === 'string') {
					textParts.push(text);
				}
			}
		}

		return textParts.join(' ');
	}

	/**
	 * Deduplicate similar insights
	 */
	private deduplicateInsights(insights: Insight[]): Insight[] {
		const seen = new Map<string, Insight>();

		for (const insight of insights) {
			const key = this.normalizeForComparison(insight.observation);

			if (!seen.has(key)) {
				seen.set(key, insight);
			} else {
				// Keep the one with higher confidence or frequency
				const existing = seen.get(key)!;
				if (insight.confidence > existing.confidence ||
					(insight.confidence === existing.confidence && insight.frequency > existing.frequency)) {
					seen.set(key, insight);
				}
			}
		}

		return Array.from(seen.values())
			.sort((a, b) => b.confidence - a.confidence);
	}

	/**
	 * Normalize content for comparison
	 */
	private normalizeForComparison(content: string): string {
		return content
			.toLowerCase()
			.replace(/[^\w\s]/g, '')
			.replace(/\s+/g, ' ')
			.trim()
			.slice(0, 100);
	}

	/**
	 * Generate unique ID
	 */
	private generateId(): string {
		return `entry_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
	}
}
