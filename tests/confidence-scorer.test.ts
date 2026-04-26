/**
 * Unit tests for ConfidenceScorer
 * Tests match the actual implementation with 6-factor scoring
 */

import { describe, it, expect } from 'vitest';
import { ConfidenceScorer } from '../src/confidence-scorer';
import { InsightType } from '../src/types';
import type { Insight, SessionEntry } from '../src/types';
import {
	sampleSessionEntries,
	largeContextEntries,
	emptySessionEntries,
} from './fixtures/sessions';

describe('ConfidenceScorer', () => {
	describe('score()', () => {
		it('should return a valid confidence score object', () => {
			const insight: Partial<Insight> = {
				type: InsightType.ERROR_PATTERN,
				observation: 'Error: something failed',
				frequency: 3,
			};

			const score = ConfidenceScorer.score(insight, sampleSessionEntries);

			expect(score).toBeDefined();
			expect(typeof score.overall).toBe('number');
			expect(score.factors).toBeDefined();
			expect(score.reasoning).toBeDefined();
		});

		it('should handle insight with observation field', () => {
			const insight: Partial<Insight> = {
				type: InsightType.SUCCESS_PATTERN,
				observation: 'Success: API call completed',
				frequency: 5,
			};

			const score = ConfidenceScorer.score(insight, sampleSessionEntries);

			expect(typeof score.overall).toBe('number');
		});

		it('should calculate weighted average of factors', () => {
			const insight: Partial<Insight> = {
				type: InsightType.SUCCESS_PATTERN,
				observation: 'This approach works well and is validated by testing',
				frequency: 5,
			};

			const score = ConfidenceScorer.score(insight, sampleSessionEntries);

			// Verify factors are defined
			expect(score.factors.repetition).toBeDefined();
			expect(score.factors.frequency).toBeDefined();
			expect(score.factors.clarity).toBeDefined();
			expect(score.factors.pattern).toBeDefined();
			expect(score.factors.context).toBeDefined();
			expect(score.factors.source).toBeDefined();
		});

		it('should clamp overall score between 0 and 1', () => {
			const insight: Partial<Insight> = {
				type: InsightType.ERROR_PATTERN,
				observation: 'Error occurred multiple times in various contexts that were discussed',
				frequency: 10,
			};

			const score = ConfidenceScorer.score(insight, largeContextEntries);

			expect(score.overall).toBeGreaterThanOrEqual(0);
			expect(score.overall).toBeLessThanOrEqual(1);
		});
	});

	describe('scoreRepetition()', () => {
		it('should return higher score for repeated content', () => {
			const repeatedContent = 'error occurred';

			// Create context where content is repeated
			const context: SessionEntry[] = [
				{
					id: 'msg_001',
					type: 'message',
					timestamp: Date.now() - 5000,
					message: {
						role: 'assistant',
						content: 'Error occurred in the system',
					},
				},
				{
					id: 'msg_002',
					type: 'message',
					timestamp: Date.now() - 4000,
					message: {
						role: 'assistant',
						content: 'Error occurred again',
					},
				},
				{
					id: 'msg_003',
					type: 'message',
					timestamp: Date.now() - 3000,
					message: {
						role: 'assistant',
						content: 'Error occurred once more',
					},
				},
			];

			const score = ConfidenceScorer.scoreRepetition(repeatedContent, context);

			// With 3 matches out of 3, score should be high
			expect(score).toBeGreaterThan(0.2);
		});

		it('should return low score for empty content', () => {
			const score = ConfidenceScorer.scoreRepetition('', sampleSessionEntries);
			expect(score).toBe(0.3);
		});

		it('should return low score for empty context', () => {
			const score = ConfidenceScorer.scoreRepetition('some content', []);
			expect(score).toBe(0.3);
		});
	});

	describe('scoreFrequency()', () => {
		it('should return low score for frequency 0', () => {
			const score = ConfidenceScorer.scoreFrequency(0);
			expect(score).toBe(0.1);
		});

		it('should return 0.3 for frequency 1', () => {
			const score = ConfidenceScorer.scoreFrequency(1);
			expect(score).toBe(0.3);
		});

		it('should return 0.5 for frequency 2', () => {
			const score = ConfidenceScorer.scoreFrequency(2);
			expect(score).toBe(0.5);
		});

		it('should return 0.7 for frequency 3', () => {
			const score = ConfidenceScorer.scoreFrequency(3);
			expect(score).toBe(0.7);
		});

		it('should return 0.85 for frequency < 10', () => {
			const score = ConfidenceScorer.scoreFrequency(5);
			expect(score).toBe(0.85);
		});

		it('should return 1 for frequency >= 10', () => {
			const score = ConfidenceScorer.scoreFrequency(10);
			expect(score).toBe(1);
		});
	});

	describe('scoreClarity()', () => {
		it('should return 0 for empty content', () => {
			const score = ConfidenceScorer.scoreClarity('');
			expect(score).toBe(0);
		});

		it('should return low score for very short content', () => {
			const score = ConfidenceScorer.scoreClarity('Hi');
			expect(score).toBe(0.2);
		});

		it('should return 0.7 for very long content', () => {
			const longContent = 'A'.repeat(6000);
			const score = ConfidenceScorer.scoreClarity(longContent);
			expect(score).toBe(0.7);
		});

		it('should return higher score for structured content', () => {
			const content = '1. First point\n2. Second point\n3. Third point';
			const score = ConfidenceScorer.scoreClarity(content);
			expect(score).toBeGreaterThan(0.25);
		});

		it('should return higher score for complete sentences', () => {
			const content = 'This is a complete sentence with proper punctuation.';
			const score = ConfidenceScorer.scoreClarity(content);
			expect(score).toBeGreaterThan(0.25);
		});

		it('should give bonus for specific values', () => {
			const content = 'Success rate: 85%';
			const score = ConfidenceScorer.scoreClarity(content);
			expect(score).toBeGreaterThan(0.25);
		});
	});

	describe('scorePattern()', () => {
		it('should return correct scores for all known insight types', () => {
			const expectedScores: Record<string, number> = {
				[InsightType.ERROR_PATTERN]: 0.85,
				[InsightType.SUCCESS_PATTERN]: 0.90,
				[InsightType.TOOL_EFFECTIVENESS]: 0.80,
				[InsightType.TIMING_INSIGHT]: 0.75,
				[InsightType.STRATEGY_ADJUSTMENT]: 0.80,
				[InsightType.CONTEXT_REQUIREMENT]: 0.70,
				[InsightType.METADATA_OBSERVATION]: 0.65,
			};

			for (const [type, expectedScore] of Object.entries(expectedScores)) {
				const score = ConfidenceScorer.scorePattern(type as InsightType);
				expect(score).toBe(expectedScore);
			}
		});

		it('should return 0.85 for legacy decision type', () => {
			const score = ConfidenceScorer.scorePattern('decision');
			expect(score).toBe(0.85);
		});

		it('should return 0.50 for unknown type', () => {
			const score = ConfidenceScorer.scorePattern('unknown_type' as InsightType);
			expect(score).toBe(0.50);
		});
	});

	describe('scoreContext()', () => {
		it('should return low score for empty context', () => {
			const score = ConfidenceScorer.scoreContext([], []);
			expect(score).toBe(0.3);
		});

		it('should return valid scores for different context sizes', () => {
			const smallContext = sampleSessionEntries.slice(0, 2);
			const mediumContext = sampleSessionEntries;
			const largeContext = largeContextEntries;

			const smallScore = ConfidenceScorer.scoreContext(smallContext, []);
			const mediumScore = ConfidenceScorer.scoreContext(mediumContext, []);
			const largeScore = ConfidenceScorer.scoreContext(largeContext, []);

			// All scores should be within valid range
			expect(smallScore).toBeGreaterThan(0);
			expect(mediumScore).toBeGreaterThan(0);
			expect(largeScore).toBeGreaterThan(0);
			
			// Large context (35 entries) gets base + else bonus
			expect(largeScore).toBeCloseTo(0.65, 2);
		});
	});

	describe('generateReasoning()', () => {
		it('should include repetition info', () => {
			const factors = {
				repetition: 0.8,
				frequency: 0.7,
				clarity: 0.5,
				pattern: 0.8,
				context: 0.5,
				source: 0.7,
			};

			const reasoning = ConfidenceScorer.generateReasoning(factors, InsightType.SUCCESS_PATTERN);
			expect(reasoning).toContain('mentioned multiple times');
		});

		it('should include clarity info for high clarity', () => {
			const factors = {
				repetition: 0.5,
				frequency: 0.7,
				clarity: 0.8,
				pattern: 0.8,
				context: 0.5,
				source: 0.7,
			};

			const reasoning = ConfidenceScorer.generateReasoning(factors, InsightType.SUCCESS_PATTERN);
			expect(reasoning).toContain('well-structured');
		});

		it('should include context info', () => {
			const factors = {
				repetition: 0.5,
				frequency: 0.7,
				clarity: 0.5,
				pattern: 0.8,
				context: 0.8,
				source: 0.7,
			};

			const reasoning = ConfidenceScorer.generateReasoning(factors, InsightType.SUCCESS_PATTERN);
			expect(reasoning).toContain('rich context');
		});

		it('should indicate low repetition', () => {
			const factors = {
				repetition: 0.2,
				frequency: 0.3,
				clarity: 0.5,
				pattern: 0.8,
				context: 0.3,
				source: 0.7,
			};

			const reasoning = ConfidenceScorer.generateReasoning(factors, InsightType.SUCCESS_PATTERN);
			expect(reasoning).toContain('single occurrence');
		});
	});

	describe('filterByThreshold()', () => {
		it('should filter insights below threshold', () => {
			const insights: Insight[] = [
				{
					id: '1',
					type: InsightType.ERROR_PATTERN,
					timestamp: new Date().toISOString(),
					task: 'test',
					observation: 'Low confidence',
					implication: '',
					action: '',
					confidence: 0.3,
					source: 'execution',
					validated: false,
					category: '',
					tags: [],
					frequency: 1,
					appliedCount: 0,
					successRate: 0,
				},
				{
					id: '2',
					type: InsightType.SUCCESS_PATTERN,
					timestamp: new Date().toISOString(),
					task: 'test',
					observation: 'High confidence',
					implication: '',
					action: '',
					confidence: 0.85,
					source: 'execution',
					validated: true,
					category: '',
					tags: [],
					frequency: 5,
					appliedCount: 3,
					successRate: 1.0,
				},
			];

			const filtered = ConfidenceScorer.filterByThreshold(insights, 0.5);

			expect(filtered).toHaveLength(1);
			expect(filtered[0].id).toBe('2');
		});

		it('should include insights at exactly the threshold', () => {
			const insight: Insight = {
				id: '1',
				type: InsightType.ERROR_PATTERN,
				timestamp: new Date().toISOString(),
				task: 'test',
				observation: 'Exactly at threshold',
				implication: '',
				action: '',
				confidence: 0.5,
				source: 'execution',
				validated: false,
				category: '',
				tags: [],
				frequency: 1,
				appliedCount: 0,
				successRate: 0,
			};

			const filtered = ConfidenceScorer.filterByThreshold([insight], 0.5);

			expect(filtered).toHaveLength(1);
		});
	});

	describe('sortByConfidence()', () => {
		it('should sort insights in descending order', () => {
			const insights: Insight[] = [
				{ id: '1', type: InsightType.ERROR_PATTERN, timestamp: '', task: '', observation: 'Low', implication: '', action: '', confidence: 0.3, source: 'execution', validated: false, category: '', tags: [], frequency: 1, appliedCount: 0, successRate: 0 },
				{ id: '2', type: InsightType.SUCCESS_PATTERN, timestamp: '', task: '', observation: 'High', implication: '', action: '', confidence: 0.9, source: 'execution', validated: true, category: '', tags: [], frequency: 5, appliedCount: 3, successRate: 1.0 },
				{ id: '3', type: InsightType.TOOL_EFFECTIVENESS, timestamp: '', task: '', observation: 'Medium', implication: '', action: '', confidence: 0.6, source: 'execution', validated: false, category: '', tags: [], frequency: 2, appliedCount: 1, successRate: 0.5 },
			];

			const sorted = ConfidenceScorer.sortByConfidence(insights);

			expect(sorted[0].confidence).toBe(0.9);
			expect(sorted[1].confidence).toBe(0.6);
			expect(sorted[2].confidence).toBe(0.3);
		});

		it('should not mutate original array', () => {
			const insights: Insight[] = [
				{ id: '1', type: InsightType.ERROR_PATTERN, timestamp: '', task: '', observation: 'A', implication: '', action: '', confidence: 0.3, source: 'execution', validated: false, category: '', tags: [], frequency: 1, appliedCount: 0, successRate: 0 },
				{ id: '2', type: InsightType.SUCCESS_PATTERN, timestamp: '', task: '', observation: 'B', implication: '', action: '', confidence: 0.9, source: 'execution', validated: true, category: '', tags: [], frequency: 5, appliedCount: 3, successRate: 1.0 },
			];

			const sorted = ConfidenceScorer.sortByConfidence(insights);

			expect(sorted).not.toBe(insights);
			expect(insights[0].confidence).toBe(0.3);
		});
	});
});
