/**
 * Confidence Scoring System
 * Implements multi-factor confidence scoring from ARCHITECTURE.md
 * 
 * Scoring Factors (sum to 1.0):
 * - repetition: How often this pattern appears (weight: 0.25)
 * - frequency: Number of occurrences (weight: 0.20)
 * - clarity: Content quality (weight: 0.15)
 * - pattern: Type-specific confidence (weight: 0.15)
 * - context: Richness of surrounding context (weight: 0.15)
 * - source: Execution > Reflection > External (weight: 0.10)
 */

import { InsightType } from './types';
import type {
	ConfidenceScore,
	Insight,
	SessionEntry,
	ToolMetric,
} from './types';

type ContentBlock = {
	type?: string;
	text?: string;
};

export class ConfidenceScorer {
	/**
	 * Calculate overall confidence score for an insight
	 */
	static score(
		insight: Partial<Insight> & { type?: InsightType | string; content?: string },
		context: SessionEntry[],
		toolMetrics: ToolMetric[] = []
	): ConfidenceScore {
		const type = typeof insight.type === 'string' ? insight.type : (insight.type as InsightType);

		const factors = {
			repetition: this.scoreRepetition(insight.content || '', context),
			frequency: this.scoreFrequency(insight.frequency ?? 1),
			clarity: this.scoreClarity(insight.content || ''),
			pattern: this.scorePattern(type),
			context: this.scoreContext(context, toolMetrics),
			source: this.scoreSource(insight.source),
		};

		// Weighted average
		const overall = Math.round(
			factors.repetition * 0.25 +
			factors.frequency * 0.20 +
			factors.clarity * 0.15 +
			factors.pattern * 0.15 +
			factors.context * 0.15 +
			factors.source * 0.10
		);

		const reasoning = this.generateReasoning(factors, type);

		return { overall: Math.min(1, Math.max(0, overall)), factors, reasoning };
	}

	/**
	 * Score based on repetition in context
	 */
	private static scoreRepetition(content: string, context: SessionEntry[]): number {
		if (!content || context.length === 0) return 0.3;

		const lowerContent = content.toLowerCase();
		let matches = 0;
		let totalChecks = 0;

		for (const entry of context) {
			if (entry.type !== 'message') continue;
			const entryText = this.extractText(entry.message?.content);
			if (entryText) {
				totalChecks++;
				if (entryText.toLowerCase().includes(lowerContent)) {
					matches++;
				}
			}
		}

		if (totalChecks === 0) return 0.3;
		// Higher repetition = higher confidence
		return Math.min(1, 0.2 + (matches / totalChecks) * 0.8);
	}

	/**
	 * Score based on frequency of observation
	 */
	private static scoreFrequency(frequency: number): number {
		if (frequency <= 0) return 0.1;
		if (frequency === 1) return 0.3;
		if (frequency === 2) return 0.5;
		if (frequency === 3) return 0.7;
		if (frequency < 10) return 0.85;
		return 1;
	}

	/**
	 * Score based on clarity of content
	 */
	static scoreClarity(content: string): number {
		if (!content) return 0;

		const trimmed = content.trim();
		if (trimmed.length < 10) return 0.2;
		if (trimmed.length > 5000) return 0.7;

		// Check for structured content
		const hasStructure = /^[•\-\*]\s|^(\d+[\.\)]\s)/m.test(trimmed);
		const hasLength = trimmed.length > 50;
		const isComplete = /[.!?:]$/.test(trimmed);
		const hasSpecifics = /\d+%|:\s+\w/.test(trimmed); // Contains specific values
		const hasCode = /```|`/.test(trimmed); // Contains code

		let score = 0.25;
		if (hasStructure) score += 0.2;
		if (hasLength) score += 0.15;
		if (isComplete) score += 0.15;
		if (hasSpecifics) score += 0.15;
		if (hasCode) score += 0.1;

		return Math.min(1, score);
	}

	/**
	 * Score based on insight type (ARCHITECTURE.md 7 insight types)
	 */
	static scorePattern(type: InsightType | string): number {
		const typeScores: Record<string, number> = {
			// ARCHITECTURE.md insight types
			[InsightType.ERROR_PATTERN]: 0.85,
			[InsightType.SUCCESS_PATTERN]: 0.90,
			[InsightType.TOOL_EFFECTIVENESS]: 0.80,
			[InsightType.TIMING_INSIGHT]: 0.75,
			[InsightType.STRATEGY_ADJUSTMENT]: 0.80,
			[InsightType.CONTEXT_REQUIREMENT]: 0.70,
			[InsightType.METADATA_OBSERVATION]: 0.65,
			// Legacy types
			decision: 0.85,
			solution: 0.85,
			architecture: 0.80,
			bug_fix: 0.85,
			refactor: 0.75,
			convention: 0.70,
			pattern: 0.65,
			learning: 0.50,
		};

		return typeScores[type as string] ?? 0.5;
	}

	/**
	 * Score based on context richness and tool usage
	 */
	private static scoreContext(context: SessionEntry[], toolMetrics: ToolMetric[]): number {
		let score = 0.3;

		// Score based on number of entries
		if (context.length === 0) return 0.3;
		if (context.length < 3) score += 0.1;
		if (context.length < 10) score += 0.15;
		if (context.length < 30) score += 0.25;
		else score += 0.35;

		// Score based on tool usage (indicates active execution)
		if (toolMetrics.length > 0) {
			score += 0.15;
			const avgSuccessRate = toolMetrics.reduce((sum, m) => {
				return sum + (m.invocations > 0 ? m.successes / m.invocations : 0);
			}, 0) / toolMetrics.length;
			if (avgSuccessRate > 0.8) score += 0.1;
		}

		// Check for compaction entries (indicates rich history)
		const hasCompaction = context.some(e => e.type === 'compaction');
		if (hasCompaction) score += 0.1;

		return Math.min(1, score);
	}

	/**
	 * Score based on source of insight
	 */
	private static scoreSource(source?: string): number {
		const sourceScores: Record<string, number> = {
			execution: 0.9,   // From actual tool execution
			reflection: 0.7,  // From agent reflection
			external: 0.5,    // From external sources
		};
		return sourceScores[source ?? ''] ?? 0.5;
	}

	/**
	 * Generate human-readable reasoning
	 */
	private static generateReasoning(factors: ConfidenceScore['factors'], type: InsightType | string): string {
		const reasons: string[] = [];

		// Repetition
		if (factors.repetition > 0.7) {
			reasons.push('mentioned multiple times');
		} else if (factors.repetition < 0.4) {
			reasons.push('single occurrence');
		}

		// Frequency
		if (factors.frequency >= 0.8) {
			reasons.push('frequently observed');
		}

		// Clarity
		if (factors.clarity > 0.7) {
			reasons.push('well-structured');
		} else if (factors.clarity < 0.4) {
			reasons.push('needs clarification');
		}

		// Pattern
		if (factors.pattern > 0.8) {
			reasons.push(`${type} type has high intrinsic confidence`);
		}

		// Context
		if (factors.context > 0.7) {
			reasons.push('rich context');
		} else if (factors.context < 0.4) {
			reasons.push('limited context');
		}

		// Source
		if (factors.source > 0.8) {
			reasons.push('from execution');
		} else if (factors.source < 0.6) {
			reasons.push('from external source');
		}

		return reasons.length > 0 ? reasons.join(', ') : 'moderate confidence';
	}

	/**
	 * Extract text from message content
	 */
	private static extractText(content: unknown): string | null {
		if (typeof content === 'string') {
			return content;
		}

		if (!Array.isArray(content)) {
			return null;
		}

		const textParts: string[] = [];
		for (const part of content) {
			if (part && typeof part === 'object' && (part as ContentBlock).type === 'text') {
				const text = (part as ContentBlock).text;
				if (typeof text === 'string') {
					textParts.push(text);
				}
			}
		}

		return textParts.length > 0 ? textParts.join(' ') : null;
	}

	/**
	 * Filter insights by confidence threshold
	 */
	static filterByThreshold(insights: Insight[], threshold: number): Insight[] {
		return insights.filter(insight => insight.confidence >= threshold);
	}

	/**
	 * Sort insights by confidence (descending)
	 */
	static sortByConfidence(insights: Insight[]): Insight[] {
		return [...insights].sort((a, b) => b.confidence - a.confidence);
	}

	/**
	 * Calculate confidence for tool effectiveness
	 */
	static scoreToolEffectiveness(
		toolName: string,
		invocations: number,
		successes: number,
		failures: number,
		avgLatency: number
	): ConfidenceScore {
		const factors = {
			repetition: Math.min(1, invocations / 10),
			frequency: this.scoreFrequency(invocations),
			clarity: 0.8, // Tool metrics are inherently structured
			pattern: this.scorePattern(InsightType.TOOL_EFFECTIVENESS),
			context: invocations > 0 ? 0.8 : 0.3,
			source: 0.9, // Always from execution
		};

		const overall = Math.round(
			factors.repetition * 0.25 +
			factors.frequency * 0.20 +
			factors.clarity * 0.15 +
			factors.pattern * 0.15 +
			factors.context * 0.15 +
			factors.source * 0.10
		);

		return {
			overall: Math.min(1, Math.max(0, overall)),
			factors,
			reasoning: this.generateReasoning(factors, InsightType.TOOL_EFFECTIVENESS),
		};
	}

	/**
	 * Calculate confidence for strategy adjustment
	 */
	static scoreStrategyAdjustment(
		previousStrategy: string,
		newStrategy: string,
		hasTrigger: boolean,
		hasExpectedImpact: boolean
	): ConfidenceScore {
		let clarity = 0.3;
		if (previousStrategy && newStrategy) clarity += 0.3;
		if (hasTrigger) clarity += 0.2;
		if (hasExpectedImpact) clarity += 0.2;

		const factors = {
			repetition: 0.5,
			frequency: 0.5,
			clarity,
			pattern: this.scorePattern(InsightType.STRATEGY_ADJUSTMENT),
			context: 0.5,
			source: 0.7,
		};

		const overall = Math.round(
			factors.repetition * 0.25 +
			factors.frequency * 0.20 +
			factors.clarity * 0.15 +
			factors.pattern * 0.15 +
			factors.context * 0.15 +
			factors.source * 0.10
		);

		return {
			overall: Math.min(1, Math.max(0, overall)),
			factors,
			reasoning: this.generateReasoning(factors, InsightType.STRATEGY_ADJUSTMENT),
		};
	}
}
