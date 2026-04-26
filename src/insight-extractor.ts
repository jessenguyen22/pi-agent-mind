/**
 * Insight Extraction Engine
 * Implements the Pydantic-Deep Improvement Pipeline from ARCHITECTURE.md
 * 
 * Features:
 * - 7 insight types matching ARCHITECTURE.md
 * - Pattern classification and validation
 * - Tool call parsing for Hermes format
 * - Confidence scoring with multiple factors
 */

import {
	InsightType,
} from './types';
import type {
	Insight,
	InsightExtractionOptions,
	SessionEntry,
	SessionAnalysis,
	ToolCall,
	ToolResult,
	ToolMetric,
	ParsedToolInvocation,
	HermesToolCall,
	ConfidenceScore,
	ErrorPatternInsight,
	SuccessPatternInsight,
	ToolEffectivenessInsight,
	TimingInsight,
	StrategyAdjustmentInsight,
	ContextRequirementInsight,
	MetadataObservationInsight,
} from './types';
import { ConfidenceScorer } from './confidence-scorer';

// Content block type for parsing
type ContentBlock = {
	type?: string;
	text?: string;
	name?: string;
	arguments?: Record<string, unknown>;
};

export class InsightExtractor {
	private options: InsightExtractionOptions;

	constructor(options: InsightExtractionOptions = {}) {
		this.options = {
			minConfidence: 0.5,
			maxInsights: 50,
			includeMetadata: true,
			validatePatterns: true,
			minFrequency: 3, // Require 3+ occurrences to validate
			...options,
		};
	}

	/**
	 * Extract all insights from session entries
	 */
	extract(entries: SessionEntry[]): Insight[] {
		const insights: Insight[] = [];
		const seen = new Map<string, { insight: Insight; count: number }>();

		for (const entry of entries) {
			const extracted = this.extractFromEntry(entry, entries);
			for (const insight of extracted) {
				const key = this.insightKey(insight);
				if (seen.has(key)) {
					const existing = seen.get(key)!;
					existing.count++;
					existing.insight.frequency = existing.count;
				} else {
					seen.set(key, { insight, count: 1 });
					insights.push(insight);
				}
			}
		}

		// Apply pattern validation if enabled
		let filtered = insights;
		if (this.options.validatePatterns) {
			filtered = this.validatePatterns(insights);
		}

		// Filter by threshold
		filtered = ConfidenceScorer.filterByThreshold(filtered, this.options.minConfidence ?? 0.5);

		// Limit results
		if (this.options.maxInsights && filtered.length > this.options.maxInsights) {
			filtered = ConfidenceScorer.sortByConfidence(filtered).slice(0, this.options.maxInsights);
		}

		return filtered;
	}

	/**
	 * Extract insights from a single entry
	 */
	private extractFromEntry(entry: SessionEntry, allEntries: SessionEntry[]): Insight[] {
		const insights: Insight[] = [];

		// Handle tool calls
		if (entry.type === 'tool_call' && entry.toolCall) {
			return this.extractFromToolCall(entry.toolCall, allEntries);
		}

		// Handle message content
		if (entry.type === 'message' && entry.message) {
			const content = entry.message.content;
			if (!content) return insights;

			const text = this.extractText(content);
			if (!text) return insights;

			// Extract each insight type
			insights.push(...this.extractErrorPatterns(text, entry, allEntries));
			insights.push(...this.extractSuccessPatterns(text, entry, allEntries));
			insights.push(...this.extractTimingInsights(text, entry, allEntries));
			insights.push(...this.extractStrategyAdjustments(text, entry, allEntries));
			insights.push(...this.extractContextRequirements(text, entry, allEntries));
			insights.push(...this.extractMetadataObservations(text, entry, allEntries));
		}

		return insights;
	}

	/**
	 * Extract insights from tool calls
	 */
	private extractFromToolCall(toolCall: ToolCall, allEntries: SessionEntry[]): Insight[] {
		const insights: Insight[] = [];
		const toolName = toolCall.name;

		// Detect tool effectiveness patterns
		const toolResults = allEntries.filter(
			e => e.type === 'tool_result' && e.toolResult?.name === toolName
		);

		if (toolResults.length > 0) {
			const successes = toolResults.filter(r => !r.toolResult?.error).length;
			const failures = toolResults.filter(r => r.toolResult?.error).length;
			const total = toolResults.length;
			const successRate = total > 0 ? successes / total : 0;

			// Calculate average latency
			const latencies = toolResults
				.map(r => r.toolResult?.duration ?? 0)
				.filter(d => d > 0);
			const avgLatency = latencies.length > 0
				? latencies.reduce((a, b) => a + b, 0) / latencies.length
				: 0;

			// Create tool effectiveness insight
			const insight = this.createToolEffectivenessInsight({
				toolName,
				successRate,
				latency: avgLatency,
				successes,
				failures,
				invocations: total,
			}, toolCall);

			if (insight) insights.push(insight);
		}

		return insights;
	}

	/**
	 * Extract ERROR_PATTERN insights
	 */
	private extractErrorPatterns(text: string, entry: SessionEntry, allEntries: SessionEntry[]): Insight[] {
		const insights: Insight[] = [];
		const patterns = [
			/error[:\s]/i,
			/exception/i,
			/failed[:\s]/i,
			/timeout/i,
			/bug[:\s]/i,
			/crash/i,
			/broken/i,
			/cannot/i,
			/unable to/i,
			/fatal/i,
			/root cause/i,
			/the problem was/i,
			/this was causing/i,
			/bot detection/i,
			/rate limit/i,
			/authentication failed/i,
			/connection refused/i,
		];

		for (const pattern of patterns) {
			if (pattern.test(text)) {
				const insight = this.createInsight({
					type: InsightType.ERROR_PATTERN,
					text,
					entry,
					allEntries,
					specific: {
						errorType: this.extractErrorType(text),
						rootCause: this.extractRootCause(text),
						recoveryStrategy: this.extractRecoveryStrategy(text),
						preventionRules: this.extractPreventionRules(text),
					},
				});
				if (insight) insights.push(insight);
			}
		}

		return insights;
	}

	/**
	 * Extract SUCCESS_PATTERN insights
	 */
	private extractSuccessPatterns(text: string, entry: SessionEntry, allEntries: SessionEntry[]): Insight[] {
		const insights: Insight[] = [];
		const patterns = [
			/success/i,
			/completed/i,
			/work.*well/i,
			/solved by/i,
			/the fix/i,
			/working approach/i,
			/achieved/i,
			/validated/i,
			/verified/i,
			/passed/i,
			/this works/i,
			/succeeded/i,
			/resulted in/i,
			/outcome:/i,
			/this approach works/i,
		];

		for (const pattern of patterns) {
			if (pattern.test(text)) {
				const insight = this.createInsight({
					type: InsightType.SUCCESS_PATTERN,
					text,
					entry,
					allEntries,
					specific: {
						approach: this.extractApproach(text),
						conditions: this.extractConditions(text),
						outcome: this.extractOutcome(text),
						reproducibility: this.estimateReproducibility(text),
					},
				});
				if (insight) insights.push(insight);
			}
		}

		return insights;
	}

	/**
	 * Extract TOOL_EFFECTIVENESS insights
	 */
	private extractToolEffectiveness(text: string, entry: SessionEntry, allEntries: SessionEntry[]): Insight[] {
		const insights: Insight[] = [];
		const patterns = [
			/tool.*improv/i,
			/using.*instead/i,
			/better.*than/i,
			/prefer.*over/i,
			/swapped.*for/i,
			/replaced.*with/i,
			/alternative/i,
			/fallback/i,
		];

		const toolMentions = this.extractToolMentions(text);
		for (const toolName of toolMentions) {
			const insight = this.createToolEffectivenessInsight({
				toolName,
				successRate: 0.8,
				latency: 0,
				successes: 1,
				failures: 0,
				invocations: 1,
			}, { name: toolName });

			if (insight) insights.push(insight);
		}

		for (const pattern of patterns) {
			if (pattern.test(text)) {
				const insight = this.createInsight({
					type: InsightType.TOOL_EFFECTIVENESS,
					text,
					entry,
					allEntries,
				});
				if (insight) insights.push(insight);
			}
		}

		return insights;
	}

	/**
	 * Extract TIMING_INSIGHT insights
	 */
	private extractTimingInsights(text: string, entry: SessionEntry, allEntries: SessionEntry[]): Insight[] {
		const insights: Insight[] = [];
		const patterns = [
			/timing/i,
			/delay/i,
			/backoff/i,
			/retry/i,
			/wait/i,
			/schedule/i,
			/optimal time/i,
			/rate limit/i,
			/exponential/i,
			/best.*time/i,
			/before.*after/i,
		];

		for (const pattern of patterns) {
			if (pattern.test(text)) {
				const insight = this.createInsight({
					type: InsightType.TIMING_INSIGHT,
					text,
					entry,
					allEntries,
					specific: {
						strategy: this.extractTimingStrategy(text),
						optimalConditions: this.extractOptimalConditions(text),
						empiricalData: {
							successRate: 0.8,
							sampleSize: 5,
						},
					},
				});
				if (insight) insights.push(insight);
			}
		}

		return insights;
	}

	/**
	 * Extract STRATEGY_ADJUSTMENT insights
	 */
	private extractStrategyAdjustments(text: string, entry: SessionEntry, allEntries: SessionEntry[]): Insight[] {
		const insights: Insight[] = [];
		const patterns = [
			/pivot/i,
			/shift.*strategy/i,
			/instead of/i,
			/changing.*approach/i,
			/moving from.*to/i,
			/switching to/i,
			/adopting/i,
			/transition/i,
			/new strategy/i,
			/updated approach/i,
		];

		for (const pattern of patterns) {
			if (pattern.test(text)) {
				const insight = this.createInsight({
					type: InsightType.STRATEGY_ADJUSTMENT,
					text,
					entry,
					allEntries,
					specific: {
						previousStrategy: this.extractPreviousStrategy(text),
						newStrategy: this.extractNewStrategy(text),
						trigger: this.extractTrigger(text),
						expectedImprovement: this.extractExpectedImprovement(text),
					},
				});
				if (insight) insights.push(insight);
			}
		}

		return insights;
	}

	/**
	 * Extract CONTEXT_REQUIREMENT insights
	 */
	private extractContextRequirements(text: string, entry: SessionEntry, allEntries: SessionEntry[]): Insight[] {
		const insights: Insight[] = [];
		const patterns = [
			/missing context/i,
			/needed.*context/i,
			/without.*information/i,
			/context.*required/i,
			/should have/i,
			/if only.*had/i,
			/the.*was missing/i,
			/didn't know/i,
			/unaware of/i,
		];

		for (const pattern of patterns) {
			if (pattern.test(text)) {
				const insight = this.createInsight({
					type: InsightType.CONTEXT_REQUIREMENT,
					text,
					entry,
					allEntries,
					specific: {
						missingContext: this.extractMissingContext(text),
						impact: this.estimateImpact(text),
						workaround: this.extractWorkaround(text),
						idealSolution: this.extractIdealSolution(text),
					},
				});
				if (insight) insights.push(insight);
			}
		}

		return insights;
	}

	/**
	 * Extract METADATA_OBSERVATION insights
	 */
	private extractMetadataObservations(text: string, entry: SessionEntry, allEntries: SessionEntry[]): Insight[] {
		const insights: Insight[] = [];
		const patterns = [
			/api.*change/i,
			/deprecated/i,
			/version.*update/i,
			/changed from.*to/i,
			/now.*instead/i,
			/new.*version/i,
			/environment.*change/i,
			/model.*update/i,
		];

		for (const pattern of patterns) {
			if (pattern.test(text)) {
				const insight = this.createInsight({
					type: InsightType.METADATA_OBSERVATION,
					text,
					entry,
					allEntries,
					specific: {
						source: this.detectMetadataSource(text),
						change: this.extractChange(text),
						previousValue: this.extractPreviousValue(text),
						newValue: this.extractNewValue(text),
						adaptation: this.extractAdaptation(text),
					},
				});
				if (insight) insights.push(insight);
			}
		}

		return insights;
	}

	/**
	 * Create a typed insight with confidence scoring
	 */
	private createInsight(params: {
		type: InsightType;
		text: string;
		entry: SessionEntry;
		allEntries: SessionEntry[];
		specific?: Record<string, unknown>;
	}): Insight | null {
		const score: ConfidenceScore = ConfidenceScorer.score(
			{ type: params.type, content: params.text },
			params.allEntries,
			this.getToolMetrics(params.allEntries)
		);

		if (score.overall < (this.options.minConfidence ?? 0.5)) {
			return null;
		}

		const task = this.extractTask(params.allEntries);
		const baseInsight: Insight = {
			id: this.generateId(),
			type: params.type,
			timestamp: new Date().toISOString(),
			task,
			observation: this.cleanContent(params.text),
			implication: this.inferImplication(params.text, params.type),
			action: this.inferAction(params.text, params.type),
			confidence: score.overall,
			source: this.determineSource(params.entry),
			validated: false,
			category: this.getCategoryForType(params.type),
			tags: this.extractTags(params.text),
			frequency: 1,
			appliedCount: 0,
			successRate: params.type === InsightType.SUCCESS_PATTERN ? 1 : 0,
			...(params.specific as Record<string, unknown>),
		};

		if (this.options.includeMetadata) {
			(baseInsight as Insight & { _metadata?: unknown })._metadata = {
				score,
				entryId: params.entry.id,
			};
		}

		return baseInsight;
	}

	/**
	 * Create a tool effectiveness insight
	 */
	private createToolEffectivenessInsight(
		metrics: {
			toolName: string;
			successRate: number;
			latency: number;
			successes: number;
			failures: number;
			invocations: number;
		},
		toolCall: ToolCall
	): ToolEffectivenessInsight | null {
		const content = `Tool ${metrics.toolName} used ${metrics.invocations} times with ${Math.round(metrics.successRate * 100)}% success rate`;
		const score: ConfidenceScore = ConfidenceScorer.score(
			{ type: InsightType.TOOL_EFFECTIVENESS, content },
			[],
			[]
		);

		if (score.overall < (this.options.minConfidence ?? 0.5)) {
			return null;
		}

		return {
			id: this.generateId(),
			type: InsightType.TOOL_EFFECTIVENESS,
			timestamp: new Date().toISOString(),
			task: 'Tool analysis',
			observation: content,
			implication: `Consider ${metrics.successRate > 0.8 ? 'expanding' : 'limiting'} use of ${metrics.toolName}`,
			action: `Track ${metrics.toolName} performance in future sessions`,
			confidence: score.overall,
			source: 'execution',
			validated: metrics.invocations >= 3,
			category: 'tool-effectiveness',
			tags: ['tool', metrics.toolName],
			frequency: metrics.invocations,
			appliedCount: 0,
			successRate: metrics.successRate,
			toolName: metrics.toolName,
			latency: metrics.latency,
			costPerUse: 0,
			bestUseCases: this.inferBestUseCases(metrics),
			failureModes: this.inferFailureModes(metrics),
		};
	}

	/**
	 * Validate patterns (require minFrequency occurrences)
	 */
	private validatePatterns(insights: Insight[]): Insight[] {
		const minFreq = this.options.minFrequency ?? 3;
		return insights.filter(i => i.frequency >= minFreq || i.type === InsightType.SUCCESS_PATTERN);
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
			if (part && typeof part === 'object') {
				const block = part as ContentBlock;
				if (block.type === 'text' && typeof block.text === 'string') {
					textParts.push(block.text);
				}
			}
		}

		return textParts.length > 0 ? textParts.join(' ') : null;
	}

	/**
	 * Extract tool mentions from text
	 */
	private extractToolMentions(text: string): string[] {
		const tools: string[] = [];
		const patterns = [
			/(?:using|with|call|calling)\s+([A-Z][a-zA-Z]+)/g,
			/(?:tool|function):\s*([A-Z][a-zA-Z]+)/gi,
		];

		for (const pattern of patterns) {
			const matches = text.matchAll(pattern);
			for (const match of matches) {
				if (match[1]) tools.push(match[1]);
			}
		}

		return [...new Set(tools)];
	}

	/**
	 * Extract task description from entries
	 */
	private extractTask(entries: SessionEntry[]): string {
		const messages = entries.filter(e => e.type === 'message' && e.message?.role === 'user');
		if (messages.length === 0) return 'Unknown task';

		const firstMessage = messages[0];
		const text = this.extractText(firstMessage.message?.content);
		return text ? text.slice(0, 100) : 'Unknown task';
	}

	/**
	 * Get tool metrics from entries
	 */
	private getToolMetrics(entries: SessionEntry[]): ToolMetric[] {
		const metricsMap = new Map<string, ToolMetric>();

		for (const entry of entries) {
			if (entry.type === 'tool_result' && entry.toolResult) {
				const { name, error, duration } = entry.toolResult;
				if (!metricsMap.has(name)) {
					metricsMap.set(name, {
						toolName: name,
						invocations: 0,
						successes: 0,
						failures: 0,
						averageLatency: 0,
						lastUsed: '',
					});
				}

				const metric = metricsMap.get(name)!;
				metric.invocations++;
				if (error) {
					metric.failures++;
				} else {
					metric.successes++;
				}
				if (duration) {
					metric.averageLatency = (metric.averageLatency * (metric.invocations - 1) + duration) / metric.invocations;
				}
				metric.lastUsed = new Date().toISOString();
			}
		}

		return Array.from(metricsMap.values());
	}

	/**
	 * Extract error type from text
	 */
	private extractErrorType(text: string): string {
		const errorTypes = [
			'BOT_DETECTION', 'RATE_LIMIT', 'TIMEOUT', 'AUTH_FAILURE',
			'CONNECTION_REFUSED', 'INVALID_INPUT', 'API_ERROR', 'SCRAPE_ERROR',
		];

		for (const type of errorTypes) {
			if (text.toLowerCase().includes(type.toLowerCase())) {
				return type;
			}
		}

		// Extract from common patterns
		const match = text.match(/(\w+Error|\w+Exception|\w+Failure)/i);
		return match ? match[1] : 'UNKNOWN_ERROR';
	}

	/**
	 * Extract root cause from text
	 */
	private extractRootCause(text: string): string {
		const patterns = [
			/root cause[:\s]+([^.!?]+)/i,
			/caused by[:\s]+([^.!?]+)/i,
			/because[:\s]+([^.!?]+)/i,
		];

		for (const pattern of patterns) {
			const match = text.match(pattern);
			if (match && match[1]) return match[1].trim();
		}

		return 'Root cause not identified';
	}

	/**
	 * Extract recovery strategy from text
	 */
	private extractRecoveryStrategy(text: string): string {
		const patterns = [
			/recovery[:\s]+([^.!?]+)/i,
			/fix by[:\s]+([^.!?]+)/i,
			/solved by[:\s]+([^.!?]+)/i,
			/use[:\s]+([^.!?]+)/i,
		];

		for (const pattern of patterns) {
			const match = text.match(pattern);
			if (match && match[1]) return match[1].trim();
		}

		return 'Recovery strategy not specified';
	}

	/**
	 * Extract prevention rules from text
	 */
	private extractPreventionRules(text: string): string[] {
		const rules: string[] = [];
		const patterns = [
			/prevention[:\s]+([^.!?]+)/gi,
			/should[:\s]+([^.!?]+)/gi,
			/always[:\s]+([^.!?]+)/gi,
		];

		for (const pattern of patterns) {
			const matches = text.matchAll(pattern);
			for (const match of matches) {
				if (match[1]) rules.push(match[1].trim());
			}
		}

		return rules.length > 0 ? rules : ['No prevention rules specified'];
	}

	/**
	 * Extract approach from text
	 */
	private extractApproach(text: string): string {
		const patterns = [
			/approach[:\s]+([^.!?]+)/i,
			/method[:\s]+([^.!?]+)/i,
			/using[:\s]+([^.!?]+)/i,
			/with[:\s]+([^.!?]+)/i,
		];

		for (const pattern of patterns) {
			const match = text.match(pattern);
			if (match && match[1]) return match[1].trim();
		}

		return text.slice(0, 100);
	}

	/**
	 * Extract conditions from text
	 */
	private extractConditions(text: string): string[] {
		const conditions: string[] = [];
		const patterns = [
			/conditions?[:\s]+([^.!?]+)/gi,
			/when[:\s]+([^.!?]+)/gi,
			/requires?[:\s]+([^.!?]+)/gi,
		];

		for (const pattern of patterns) {
			const matches = text.matchAll(pattern);
			for (const match of matches) {
				if (match[1]) conditions.push(match[1].trim());
			}
		}

		return conditions;
	}

	/**
	 * Extract outcome from text
	 */
	private extractOutcome(text: string): string {
		const patterns = [
			/outcome[:\s]+([^.!?]+)/i,
			/result[:\s]+([^.!?]+)/i,
			/achieved[:\s]+([^.!?]+)/i,
			/produced[:\s]+([^.!?]+)/i,
		];

		for (const pattern of patterns) {
			const match = text.match(pattern);
			if (match && match[1]) return match[1].trim();
		}

		return 'Outcome not specified';
	}

	/**
	 * Estimate reproducibility
	 */
	private estimateReproducibility(text: string): "high" | "medium" | "low" {
		const highIndicators = ['consistent', 'reliable', 'always', 'repeatable'];
		const lowIndicators = ['unstable', 'sometimes', 'occasionally', 'unpredictable'];

		for (const indicator of highIndicators) {
			if (text.includes(indicator)) return 'high';
		}
		for (const indicator of lowIndicators) {
			if (text.includes(indicator)) return 'low';
		}
		return 'medium';
	}

	/**
	 * Extract timing strategy
	 */
	private extractTimingStrategy(text: string): string {
		const strategies = ['exponential backoff', 'fixed delay', 'adaptive', 'random', 'linear'];
		for (const strategy of strategies) {
			if (text.toLowerCase().includes(strategy)) return strategy;
		}
		return 'Timing strategy not specified';
	}

	/**
	 * Extract optimal conditions
	 */
	private extractOptimalConditions(text: string): TimingInsight['optimalConditions'] {
		const conditions: TimingInsight['optimalConditions'] = {};

		const timeMatch = text.match(/(\d+)\s*(ms|seconds?|minutes?)/i);
		if (timeMatch) {
			conditions.retryDelay = parseInt(timeMatch[1]);
		}

		const timeOfDayMatch = text.match(/(morning|afternoon|evening|night)/i);
		if (timeOfDayMatch) {
			conditions.timeOfDay = timeOfDayMatch[1];
		}

		return conditions;
	}

	/**
	 * Extract previous strategy
	 */
	private extractPreviousStrategy(text: string): string {
		const patterns = [
			/from[:\s]+([^.!?]+?)\s+to/i,
			/instead of[:\s]+([^.!?]+)/i,
			/was using[:\s]+([^.!?]+)/i,
		];

		for (const pattern of patterns) {
			const match = text.match(pattern);
			if (match && match[1]) return match[1].trim();
		}

		return 'Previous strategy not specified';
	}

	/**
	 * Extract new strategy
	 */
	private extractNewStrategy(text: string): string {
		const patterns = [
			/to[:\s]+([^.!?]+?)(?:\.|$)/i,
			/now using[:\s]+([^.!?]+)/i,
			/changed to[:\s]+([^.!?]+)/i,
		];

		for (const pattern of patterns) {
			const match = text.match(pattern);
			if (match && match[1]) return match[1].trim();
		}

		return 'New strategy not specified';
	}

	/**
	 * Extract trigger
	 */
	private extractTrigger(text: string): string {
		const patterns = [
			/trigger[:\s]+([^.!?]+)/i,
			/when[:\s]+([^.!?]+)/i,
			/because[:\s]+([^.!?]+)/i,
		];

		for (const pattern of patterns) {
			const match = text.match(pattern);
			if (match && match[1]) return match[1].trim();
		}

		return 'Trigger not specified';
	}

	/**
	 * Extract expected improvement
	 */
	private extractExpectedImprovement(text: string): number {
		const match = text.match(/(\d+)%/);
		return match ? parseInt(match[1]) / 100 : 0;
	}

	/**
	 * Extract missing context
	 */
	private extractMissingContext(text: string): string {
		const patterns = [
			/missing[:\s]+([^.!?]+)/i,
			/needed[:\s]+([^.!?]+)/i,
			/without[:\s]+([^.!?]+)/i,
		];

		for (const pattern of patterns) {
			const match = text.match(pattern);
			if (match && match[1]) return match[1].trim();
		}

		return 'Context not specified';
	}

	/**
	 * Estimate impact level
	 */
	private estimateImpact(text: string): "blocking" | "degrading" | "minor" {
		if (/block|cannot proceed|stopped/.test(text)) return 'blocking';
		if (/slow|degraded|reduced/.test(text)) return 'degrading';
		return 'minor';
	}

	/**
	 * Extract workaround
	 */
	private extractWorkaround(text: string): string {
		const patterns = [
			/workaround[:\s]+([^.!?]+)/i,
			/alternative[:\s]+([^.!?]+)/i,
			/instead[:\s]+([^.!?]+)/i,
		];

		for (const pattern of patterns) {
			const match = text.match(pattern);
			if (match && match[1]) return match[1].trim();
		}

		return 'No workaround available';
	}

	/**
	 * Extract ideal solution
	 */
	private extractIdealSolution(text: string): string {
		const patterns = [
			/solution[:\s]+([^.!?]+)/i,
			/ideal[:\s]+([^.!?]+)/i,
			/would need[:\s]+([^.!?]+)/i,
		];

		for (const pattern of patterns) {
			const match = text.match(pattern);
			if (match && match[1]) return match[1].trim();
		}

		return 'Ideal solution not specified';
	}

	/**
	 * Detect metadata source
	 */
	private detectMetadataSource(text: string): "environment" | "model" | "api" {
		if (/api|endpoint|request/.test(text)) return 'api';
		if (/model|llm|gpt|claude/.test(text)) return 'model';
		return 'environment';
	}

	/**
	 * Extract change description
	 */
	private extractChange(text: string): string {
		const patterns = [
			/changed from\s+([^.!?]+?)\s+to\s+([^.!?]+)/i,
			/now\s+([^.!?]+)/i,
			/new\s+([^.!?]+)/i,
		];

		for (const pattern of patterns) {
			const match = text.match(pattern);
			if (match && match[1]) return match[1].trim();
		}

		return 'Change not specified';
	}

	/**
	 * Extract previous value
	 */
	private extractPreviousValue(text: string): string {
		const match = text.match(/from\s+([^.!?]+?)\s+to/i);
		return match ? match[1].trim() : 'Unknown';
	}

	/**
	 * Extract new value
	 */
	private extractNewValue(text: string): string {
		const match = text.match(/to\s+([^.!?]+?)(?:\.|$)/i);
		return match ? match[1].trim() : 'Unknown';
	}

	/**
	 * Extract adaptation
	 */
	private extractAdaptation(text: string): string {
		const patterns = [
			/adaptation[:\s]+([^.!?]+)/i,
			/adapted by[:\s]+([^.!?]+)/i,
			/using[:\s]+([^.!?]+)/i,
		];

		for (const pattern of patterns) {
			const match = text.match(pattern);
			if (match && match[1]) return match[1].trim();
		}

		return 'Adaptation not specified';
	}

	/**
	 * Infer implication from text and type
	 */
	private inferImplication(text: string, type: InsightType): string {
		switch (type) {
			case InsightType.ERROR_PATTERN:
				return 'This pattern may recur; consider adding prevention logic';
			case InsightType.SUCCESS_PATTERN:
				return 'This approach should be reused in similar scenarios';
			case InsightType.TOOL_EFFECTIVENESS:
				return 'Tool selection should consider this effectiveness data';
			case InsightType.TIMING_INSIGHT:
				return 'Timing optimization may improve success rate';
			case InsightType.STRATEGY_ADJUSTMENT:
				return 'Strategy pivot should be documented for future reference';
			case InsightType.CONTEXT_REQUIREMENT:
				return 'Context gathering should be improved to prevent this issue';
			case InsightType.METADATA_OBSERVATION:
				return 'Systems should adapt to this environmental change';
			default:
				return 'Consider applying this learning to future work';
		}
	}

	/**
	 * Infer action from text and type
	 */
	private inferAction(text: string, type: InsightType): string {
		switch (type) {
			case InsightType.ERROR_PATTERN:
				return `Document error pattern and implement prevention measures`;
			case InsightType.SUCCESS_PATTERN:
				return `Add to best practices and apply consistently`;
			case InsightType.TOOL_EFFECTIVENESS:
				return `Track tool performance and adjust usage accordingly`;
			case InsightType.TIMING_INSIGHT:
				return `Implement timing optimization`;
			case InsightType.STRATEGY_ADJUSTMENT:
				return `Update strategy documentation`;
			case InsightType.CONTEXT_REQUIREMENT:
				return `Improve context gathering process`;
			case InsightType.METADATA_OBSERVATION:
				return `Update system configuration to handle change`;
			default:
				return 'Review and apply as appropriate';
		}
	}

	/**
	 * Infer best use cases for a tool
	 */
	private inferBestUseCases(metrics: { successRate: number; failures: number }): string[] {
		const useCases: string[] = [];
		if (metrics.successRate > 0.9) {
			useCases.push('Primary tool for this task');
		}
		if (metrics.failures === 0) {
			useCases.push('Safe for production use');
		}
		return useCases.length > 0 ? useCases : ['General purpose use'];
	}

	/**
	 * Infer failure modes for a tool
	 */
	private inferFailureModes(metrics: { failures: number; invocations: number }): string[] {
		const modes: string[] = [];
		if (metrics.invocations > 0 && metrics.failures / metrics.invocations > 0.2) {
			modes.push('May fail under certain conditions');
		}
		return modes;
	}

	/**
	 * Get category for insight type
	 */
	private getCategoryForType(type: InsightType): string {
		const categories: Record<InsightType, string> = {
			[InsightType.ERROR_PATTERN]: 'error-patterns',
			[InsightType.SUCCESS_PATTERN]: 'success-patterns',
			[InsightType.TOOL_EFFECTIVENESS]: 'tool-effectiveness',
			[InsightType.TIMING_INSIGHT]: 'timing-insights',
			[InsightType.STRATEGY_ADJUSTMENT]: 'strategy-adjustments',
			[InsightType.CONTEXT_REQUIREMENT]: 'context-requirements',
			[InsightType.METADATA_OBSERVATION]: 'metadata-observations',
		};
		return categories[type] ?? 'misc';
	}

	/**
	 * Determine source of insight
	 */
	private determineSource(entry: SessionEntry): "execution" | "reflection" | "external" {
		if (entry.type === 'tool_result') return 'execution';
		if (entry.type === 'compaction') return 'reflection';
		return 'external';
	}

	/**
	 * Extract tags from content
	 */
	private extractTags(content: string): string[] {
		const tags: string[] = [];

		// Extract hashtags
		const hashtagMatches = content.match(/#[a-zA-Z0-9_-]+/g);
		if (hashtagMatches) {
			tags.push(...hashtagMatches.map(t => t.slice(1)));
		}

		// Extract common keywords
		const keywords = [
			'typescript', 'javascript', 'react', 'node', 'api', 'database', 'test',
			'puppeteer', 'crawl4ai', 'gemini', 'browser', 'scraping', 'automation',
		];
		for (const keyword of keywords) {
			if (content.toLowerCase().includes(keyword)) {
				tags.push(keyword);
			}
		}

		return [...new Set(tags)].slice(0, 5);
	}

	/**
	 * Clean content for storage
	 */
	private cleanContent(content: string): string {
		return content
			.replace(/\n{3,}/g, '\n\n')
			.trim()
			.slice(0, 2000);
	}

	/**
	 * Generate unique ID
	 */
	private generateId(): string {
		return `insight_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
	}

	/**
	 * Create hash key for deduplication
	 */
	private insightKey(insight: Insight): string {
		return `${insight.type}:${insight.observation.slice(0, 100)}`;
	}
}
