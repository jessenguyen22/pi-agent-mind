/**
 * Insight Pipeline
 * Implements the Pydantic-Deep Improvement Pipeline from ARCHITECTURE.md
 * 
 * Pipeline stages:
 * 1. Execute Task
 * 2. Observe Results
 * 3. Classify Insight
 * 4. Validate Pattern
 * 5. Store Insight
 * 6. Integrate into Context
 */

import type {
	Insight,
	InsightType,
	InsightExtractionOptions,
	SessionEntry,
	SessionAnalysis,
	ToolMetric,
	ConfidenceScore,
	ExecutionLearnings,
	LearnedPattern,
	AgentContext,
} from './types';
import { InsightExtractor } from './insight-extractor';
import { ConfidenceScorer } from './confidence-scorer';
import { createMemoryArtifactUpdater, MemoryArtifactUpdater } from './memory-artifact-updater';

/**
 * Observation from task execution
 */
interface Observation {
	description: string;
	timestamp: string;
	source: 'execution' | 'reflection' | 'external';
	entry?: SessionEntry;
}

/**
 * Pipeline configuration
 */
export interface PipelineConfig {
	minConfidence: number;
	minFrequency: number;
	validatePatterns: boolean;
	autoIntegrate: boolean;
}

/**
 * Default pipeline configuration
 */
const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
	minConfidence: 0.5,
	minFrequency: 3,
	validatePatterns: true,
	autoIntegrate: true,
};

/**
 * Insight Pipeline
 * 
 * Processes task execution results through the full insight pipeline:
 * - Extract observations
 * - Classify into 7 insight types
 * - Validate patterns (require minFrequency occurrences)
 * - Calculate confidence scores
 * - Store in memory
 * - Integrate into agent context
 */
export class InsightPipeline {
	private extractor: InsightExtractor;
	private updater: MemoryArtifactUpdater;
	private config: PipelineConfig;

	constructor(
		memoryPath: string,
		options?: Partial<InsightExtractionOptions & PipelineConfig>
	) {
		this.config = { ...DEFAULT_PIPELINE_CONFIG, ...options };

		this.extractor = new InsightExtractor({
			minConfidence: this.config.minConfidence,
			includeMetadata: true,
			validatePatterns: this.config.validatePatterns,
			minFrequency: this.config.minFrequency,
		});

		this.updater = createMemoryArtifactUpdater(memoryPath);
	}

	/**
	 * Process a task result through the full pipeline
	 */
	async process(
		task: string,
		result: {
			entries: SessionEntry[];
			analysis?: SessionAnalysis;
			success?: boolean;
			duration?: number;
		}
	): Promise<Insight[]> {
		// Stage 1: Extract observations
		const observations = await this.extractObservations(task, result);

		// Stage 2: Classify each observation
		const classifiedInsights: Insight[] = [];
		for (const observation of observations) {
			const type = this.classifyInsight(observation);
			const insight = this.createInsight(observation, type, task);
			if (insight) {
				classifiedInsights.push(insight);
			}
		}

		// Stage 3: Validate patterns (require 3+ occurrences)
		const validatedInsights = this.config.validatePatterns
			? this.validatePatterns(classifiedInsights)
			: classifiedInsights;

		// Stage 4: Store validated insights
		for (const insight of validatedInsights) {
			this.updater.addInsight(insight);
		}

		// Stage 5: Integrate into context
		if (this.config.autoIntegrate) {
			await this.updateAgentContext(validatedInsights, result);
		}

		return validatedInsights;
	}

	/**
	 * Extract raw observations from task result
	 */
	private async extractObservations(
		task: string,
		result: {
			entries: SessionEntry[];
			analysis?: SessionAnalysis;
			success?: boolean;
			duration?: number;
		}
	): Promise<Observation[]> {
		const observations: Observation[] = [];
		const timestamp = new Date().toISOString();

		// Extract from entries
		for (const entry of result.entries) {
			if (entry.type === 'message' && entry.message) {
				const content = entry.message.content;
				const text = this.extractText(content);

				if (text) {
					observations.push({
						description: text,
						timestamp,
						source: entry.message.role === 'user' ? 'external' : 'execution',
						entry,
					});
				}
			}

			// Extract from tool results
			if (entry.type === 'tool_result' && entry.toolResult) {
				const result_ = entry.toolResult;
				if (result_.error) {
					observations.push({
						description: `Tool ${result_.name} failed: ${result_.error}`,
						timestamp,
						source: 'execution',
						entry,
					});
				}
			}
		}

		// Extract from analysis
		if (result.analysis) {
			for (const error of result.analysis.errors) {
				observations.push({
					description: `Error: ${error}`,
					timestamp,
					source: 'execution',
				});
			}

			for (const metric of result.analysis.toolMetrics) {
				if (metric.failures > metric.successes) {
					observations.push({
						description: `Tool ${metric.toolName} has more failures than successes`,
						timestamp,
						source: 'execution',
					});
				}
			}
		}

		return observations;
	}

	/**
	 * Classify an observation into one of 7 insight types
	 */
	private classifyInsight(observation: Observation): InsightType {
		const text = observation.description.toLowerCase();

		// ERROR_PATTERN detection
		const errorPatterns = [
			/error/i, /exception/i, /failed/i, /timeout/i,
			/bug/i, /crash/i, /broken/i, /cannot/i, /unable/i,
			/fatal/i, /bot detection/i, /rate limit/i,
		];
		if (errorPatterns.some(p => p.test(text))) {
			return InsightType.ERROR_PATTERN;
		}

		// SUCCESS_PATTERN detection
		const successPatterns = [
			/success/i, /completed/i, /work.*well/i,
			/solved by/i, /the fix/i, /working approach/i,
			/achieved/i, /validated/i, /passed/i,
		];
		if (successPatterns.some(p => p.test(text))) {
			return InsightType.SUCCESS_PATTERN;
		}

		// TOOL_EFFECTIVENESS detection
		const toolPatterns = [
			/tool/i, /using.*instead/i, /better.*than/i,
			/prefer.*over/i, /swapped/i, /replaced/i,
		];
		if (toolPatterns.some(p => p.test(text))) {
			return InsightType.TOOL_EFFECTIVENESS;
		}

		// TIMING_INSIGHT detection
		const timingPatterns = [
			/timing/i, /delay/i, /backoff/i, /retry/i,
			/wait/i, /schedule/i, /rate limit/i, /exponential/i,
		];
		if (timingPatterns.some(p => p.test(text))) {
			return InsightType.TIMING_INSIGHT;
		}

		// STRATEGY_ADJUSTMENT detection
		const strategyPatterns = [
			/pivot/i, /shift.*strategy/i, /instead of/i,
			/changing.*approach/i, /moving from.*to/i, /switching/i,
		];
		if (strategyPatterns.some(p => p.test(text))) {
			return InsightType.STRATEGY_ADJUSTMENT;
		}

		// CONTEXT_REQUIREMENT detection
		const contextPatterns = [
			/missing context/i, /needed.*context/i, /without.*information/i,
			/context.*required/i, /should have/i, /was missing/i,
		];
		if (contextPatterns.some(p => p.test(text))) {
			return InsightType.CONTEXT_REQUIREMENT;
		}

		// METADATA_OBSERVATION detection
		const metadataPatterns = [
			/api.*change/i, /deprecated/i, /version.*update/i,
			/changed from.*to/i, /now.*instead/i, /new.*version/i,
		];
		if (metadataPatterns.some(p => p.test(text))) {
			return InsightType.METADATA_OBSERVATION;
		}

		// Default based on source
		return observation.source === 'execution'
			? InsightType.SUCCESS_PATTERN
			: InsightType.METADATA_OBSERVATION;
	}

	/**
	 * Create an insight from an observation
	 */
	private createInsight(
		observation: Observation,
		type: InsightType,
		task: string
	): Insight | null {
		const score = ConfidenceScorer.score(
			{ type, content: observation.description },
			[],
			[]
		);

		if (score.overall < this.config.minConfidence) {
			return null;
		}

		return {
			id: this.generateId(),
			type,
			timestamp: observation.timestamp,
			task,
			observation: this.cleanContent(observation.description),
			implication: this.inferImplication(observation.description, type),
			action: this.inferAction(observation.description, type),
			confidence: score.overall,
			source: observation.source,
			validated: false,
			category: this.getCategoryForType(type),
			tags: this.extractTags(observation.description),
			frequency: 1,
			appliedCount: 0,
			successRate: type === InsightType.SUCCESS_PATTERN ? 1 : 0,
		};
	}

	/**
	 * Validate patterns - require minFrequency occurrences
	 */
	private validatePatterns(insights: Insight[]): Insight[] {
		// Group by key
		const groups = new Map<string, Insight[]>();
		for (const insight of insights) {
			const key = `${insight.type}:${insight.observation.slice(0, 100)}`;
			if (!groups.has(key)) {
				groups.set(key, []);
			}
			groups.get(key)!.push(insight);
		}

		// Validate each group
		const validated: Insight[] = [];
		for (const [key, group] of groups) {
			if (group.length >= this.config.minFrequency) {
				// Mark as validated and merge
				const merged = this.mergeInsights(group);
				merged.validated = true;
				validated.push(merged);
			} else if (group[0].type === InsightType.SUCCESS_PATTERN) {
				// Success patterns are valid even with low frequency
				validated.push(group[0]);
			}
		}

		return validated;
	}

	/**
	 * Merge multiple insights into one
	 */
	private mergeInsights(insights: Insight[]): Insight {
		const first = insights[0];
		const totalConfidence = insights.reduce((sum, i) => sum + i.confidence, 0);
		const avgConfidence = totalConfidence / insights.length;

		return {
			...first,
			id: this.generateId(),
			confidence: avgConfidence,
			frequency: insights.length,
			lastObserved: first.timestamp,
			timestamp: new Date().toISOString(),
		};
	}

	/**
	 * Update agent context with new insights
	 */
	private async updateAgentContext(
		insights: Insight[],
		result: {
			entries: SessionEntry[];
			analysis?: SessionAnalysis;
			success?: boolean;
			duration?: number;
		}
	): Promise<void> {
		// Update patterns
		for (const insight of insights) {
			this.updater.updateContextWithPattern(insight);
		}

		// Update tool metrics
		if (result.analysis?.toolMetrics) {
			this.updater.updateToolMetrics(result.analysis.toolMetrics);
		}

		// Add session summary
		this.updater.addSessionSummary({
			sessionId: `session_${Date.now()}`,
			timestamp: new Date().toISOString(),
			task: insights[0]?.task ?? 'Unknown',
			outcome: result.success ? 'success' : result.analysis?.errors.length ? 'failed' : 'partial',
			insightsExtracted: insights.length,
			duration: result.duration ?? 0,
		});
	}

	/**
	 * Extract text from content
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
				return 'Context gathering should be improved';
			case InsightType.METADATA_OBSERVATION:
				return 'Systems should adapt to this environmental change';
			default:
				return 'Consider applying this learning';
		}
	}

	/**
	 * Infer action from text and type
	 */
	private inferAction(text: string, type: InsightType): string {
		switch (type) {
			case InsightType.ERROR_PATTERN:
				return 'Document error pattern and implement prevention measures';
			case InsightType.SUCCESS_PATTERN:
				return 'Add to best practices and apply consistently';
			case InsightType.TOOL_EFFECTIVENESS:
				return 'Track tool performance and adjust usage accordingly';
			case InsightType.TIMING_INSIGHT:
				return 'Implement timing optimization';
			case InsightType.STRATEGY_ADJUSTMENT:
				return 'Update strategy documentation';
			case InsightType.CONTEXT_REQUIREMENT:
				return 'Improve context gathering process';
			case InsightType.METADATA_OBSERVATION:
				return 'Update system configuration to handle change';
			default:
				return 'Review and apply as appropriate';
		}
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
		return categories[type];
	}

	/**
	 * Extract tags from content
	 */
	private extractTags(content: string): string[] {
		const tags: string[] = [];

		const hashtagMatches = content.match(/#[a-zA-Z0-9_-]+/g);
		if (hashtagMatches) {
			tags.push(...hashtagMatches.map(t => t.slice(1)));
		}

		const keywords = [
			'typescript', 'javascript', 'react', 'node', 'api',
			'puppeteer', 'crawl4ai', 'gemini', 'browser', 'scraping',
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
}

/**
 * Execute closed-loop iteration (from ARCHITECTURE.md)
 */
export async function closedLoopIteration(
	pipeline: InsightPipeline,
	task: string,
	result: {
		entries: SessionEntry[];
		analysis?: SessionAnalysis;
		success?: boolean;
		duration?: number;
	}
): Promise<ExecutionLearnings> {
	// Process through pipeline
	const insights = await pipeline.process(task, result);

	// Extract learnings
	const learnings: ExecutionLearnings = {
		taskType: task,
		timestamp: new Date().toISOString(),
		steps: result.entries.length,
		success: result.success ?? false,
		duration: result.duration ?? 0,
		errors: result.analysis?.errors ?? [],
		patterns: insights
			.filter(i => i.type === InsightType.SUCCESS_PATTERN)
			.map(i => i.observation),
		improvements: insights
			.filter(i => i.type === InsightType.ERROR_PATTERN)
			.map(i => i.implication),
	};

	return learnings;
}
