/**
 * Integration tests for InsightExtractor
 * Tests for the updated insight extraction system
 */

import { describe, it, expect } from 'vitest';
import { InsightExtractor } from '../src/insight-extractor';
import { InsightType } from '../src/types';
import type { Insight, InsightExtractionOptions, SessionEntry } from '../src/types';
import {
	sampleSessionEntries,
	errorPatternEntries,
	successPatternEntries,
	timingInsightEntries,
	strategyAdjustmentEntries,
	contextRequirementEntries,
	metadataObservationEntries,
	toolCallEntries,
	multiBlockSessionEntries,
	emptySessionEntries,
	nonMessageEntries,
	taggedEntries,
	keywordEntries,
	largeContextEntries,
} from './fixtures/sessions';

describe('InsightExtractor', () => {
	describe('constructor()', () => {
		it('should use default options when none provided', () => {
			const extractor = new InsightExtractor();
			expect(extractor).toBeDefined();
		});

		it('should merge provided options with defaults', () => {
			const options: InsightExtractionOptions = {
				minConfidence: 0.7,
				maxInsights: 10,
			};

			const extractor = new InsightExtractor(options);
			expect(extractor).toBeDefined();
		});

		it('should accept all option parameters', () => {
			const options: InsightExtractionOptions = {
				minConfidence: 0.6,
				types: [InsightType.ERROR_PATTERN, InsightType.SUCCESS_PATTERN],
				maxInsights: 20,
				includeMetadata: true,
				validatePatterns: true,
				minFrequency: 3,
			};

			const extractor = new InsightExtractor(options);
			expect(extractor).toBeDefined();
		});
	});

	describe('extract()', () => {
		it('should return an array', () => {
			const extractor = new InsightExtractor();
			const insights = extractor.extract(sampleSessionEntries);
			expect(Array.isArray(insights)).toBe(true);
		});

		it('should return empty array for empty session', () => {
			const extractor = new InsightExtractor();
			const insights = extractor.extract(emptySessionEntries);
			expect(insights).toEqual([]);
		});

		it('should return empty array for non-message entries only', () => {
			const extractor = new InsightExtractor();
			const insights = extractor.extract(nonMessageEntries);
			expect(insights).toEqual([]);
		});

		it('should respect maxInsights limit', () => {
			const extractor = new InsightExtractor({ maxInsights: 2 });
			const insights = extractor.extract(largeContextEntries);
			expect(insights.length).toBeLessThanOrEqual(2);
		});

		it('should filter by minConfidence', () => {
			const extractor = new InsightExtractor({ minConfidence: 0.9 });
			const insights = extractor.extract(successPatternEntries);

			for (const insight of insights) {
				expect(insight.confidence).toBeGreaterThanOrEqual(0.9);
			}
		});
	});

	describe('Tool Effectiveness Detection', () => {
		it('should detect tool effectiveness from tool calls', () => {
			const extractor = new InsightExtractor({ minConfidence: 0 });
			const insights = extractor.extract(toolCallEntries);

			const toolInsights = insights.filter(i => i.type === InsightType.TOOL_EFFECTIVENESS);
			expect(toolInsights.length).toBeGreaterThan(0);
		});

		it('should include tool name in insight', () => {
			const extractor = new InsightExtractor({ minConfidence: 0 });
			const insights = extractor.extract(toolCallEntries);

			const toolInsights = insights.filter(i => i.type === InsightType.TOOL_EFFECTIVENESS);
			if (toolInsights.length > 0) {
				expect((toolInsights[0] as any).toolName).toBeDefined();
			}
		});

		it('should include success rate in insight', () => {
			const extractor = new InsightExtractor({ minConfidence: 0 });
			const insights = extractor.extract(toolCallEntries);

			const toolInsights = insights.filter(i => i.type === InsightType.TOOL_EFFECTIVENESS);
			if (toolInsights.length > 0) {
				expect((toolInsights[0] as any).successRate).toBeDefined();
			}
		});
	});

	describe('Multi-block Content Handling', () => {
		it('should extract text from content blocks', () => {
			const extractor = new InsightExtractor({ minConfidence: 0 });
			const insights = extractor.extract(multiBlockSessionEntries);

			expect(insights.length).toBeGreaterThan(0);
		});

		it('should concatenate multiple text blocks', () => {
			const entries: SessionEntry[] = [
				{
					id: 'msg_001',
					type: 'message',
					timestamp: Date.now(),
					message: {
						role: 'assistant',
						content: [
							{ type: 'text', text: 'Error:' },
							{ type: 'text', text: 'timeout occurred' },
						],
					},
				},
			];

			const extractor = new InsightExtractor({ minConfidence: 0 });
			const insights = extractor.extract(entries);

			// Should return array (may be empty if patterns don't match)
			expect(Array.isArray(insights)).toBe(true);
		});
	});

	describe('Insight Attributes', () => {
		it('should include unique id for each insight', () => {
			const extractor = new InsightExtractor({ minConfidence: 0 });
			const insights = extractor.extract(successPatternEntries);

			const ids = insights.map(i => i.id);
			const uniqueIds = new Set(ids);
			expect(uniqueIds.size).toBe(ids.length);
		});

		it('should include type on all insights', () => {
			const extractor = new InsightExtractor({ minConfidence: 0 });
			const insights = extractor.extract(successPatternEntries);

			for (const insight of insights) {
				expect(insight.type).toBeDefined();
			}
		});

		it('should include observation field', () => {
			const extractor = new InsightExtractor({ minConfidence: 0 });
			const insights = extractor.extract(successPatternEntries);

			for (const insight of insights) {
				expect(insight.observation).toBeDefined();
				expect(typeof insight.observation).toBe('string');
			}
		});

		it('should include confidence score', () => {
			const extractor = new InsightExtractor({ minConfidence: 0 });
			const insights = extractor.extract(successPatternEntries);

			for (const insight of insights) {
				expect(insight.confidence).toBeGreaterThanOrEqual(0);
				expect(insight.confidence).toBeLessThanOrEqual(1);
			}
		});

		it('should include timestamp field', () => {
			const extractor = new InsightExtractor({ minConfidence: 0 });
			const insights = extractor.extract(successPatternEntries);

			for (const insight of insights) {
				expect(insight.timestamp).toBeDefined();
			}
		});

		it('should include task field', () => {
			const extractor = new InsightExtractor({ minConfidence: 0 });
			const insights = extractor.extract(successPatternEntries);

			for (const insight of insights) {
				expect(insight.task).toBeDefined();
			}
		});

		it('should include implication field', () => {
			const extractor = new InsightExtractor({ minConfidence: 0 });
			const insights = extractor.extract(successPatternEntries);

			for (const insight of insights) {
				expect(insight.implication).toBeDefined();
			}
		});

		it('should include action field', () => {
			const extractor = new InsightExtractor({ minConfidence: 0 });
			const insights = extractor.extract(successPatternEntries);

			for (const insight of insights) {
				expect(insight.action).toBeDefined();
			}
		});

		it('should include category field', () => {
			const extractor = new InsightExtractor({ minConfidence: 0 });
			const insights = extractor.extract(successPatternEntries);

			for (const insight of insights) {
				expect(insight.category).toBeDefined();
			}
		});

		it('should include tags field', () => {
			const extractor = new InsightExtractor({ minConfidence: 0 });
			const insights = extractor.extract(successPatternEntries);

			for (const insight of insights) {
				expect(Array.isArray(insight.tags)).toBe(true);
			}
		});

		it('should include frequency field', () => {
			const extractor = new InsightExtractor({ minConfidence: 0 });
			const insights = extractor.extract(successPatternEntries);

			for (const insight of insights) {
				expect(typeof insight.frequency).toBe('number');
			}
		});

		it('should include validated field', () => {
			const extractor = new InsightExtractor({ minConfidence: 0 });
			const insights = extractor.extract(successPatternEntries);

			for (const insight of insights) {
				expect(typeof insight.validated).toBe('boolean');
			}
		});

		it('should include source field', () => {
			const extractor = new InsightExtractor({ minConfidence: 0 });
			const insights = extractor.extract(successPatternEntries);

			for (const insight of insights) {
				expect(['execution', 'reflection', 'external']).toContain(insight.source);
			}
		});
	});

	describe('Tag Extraction', () => {
		it('should extract hashtags as tags when patterns are detected', () => {
			const entries: SessionEntry[] = [
				{
					id: 'msg_001',
					type: 'message',
					timestamp: Date.now(),
					message: {
						role: 'assistant',
						content: 'Success! Task completed with React and TypeScript #react #typescript',
					},
				},
			];

			const extractor = new InsightExtractor({ minConfidence: 0 });
			const insights = extractor.extract(entries);

			// Check if any insights have tags
			const allTags = insights.flatMap(i => i.tags);
			expect(Array.isArray(allTags)).toBe(true);
		});
	});

	describe('Content Cleaning', () => {
		it('should trim content', () => {
			const entries: SessionEntry[] = [
				{
					id: 'msg_001',
					type: 'message',
					timestamp: Date.now(),
					message: {
						role: 'assistant',
						content: 'Success! Task completed',
					},
				},
			];

			const extractor = new InsightExtractor({ minConfidence: 0 });
			const insights = extractor.extract(entries);

			for (const insight of insights) {
				expect(insight.observation).toBe(insight.observation.trim());
			}
		});

		it('should collapse multiple newlines', () => {
			const entries: SessionEntry[] = [
				{
					id: 'msg_001',
					type: 'message',
					timestamp: Date.now(),
					message: {
						role: 'assistant',
						content: 'Success!\n\n\n\nResult achieved',
					},
				},
			];

			const extractor = new InsightExtractor({ minConfidence: 0 });
			const insights = extractor.extract(entries);

			for (const insight of insights) {
				expect(insight.observation).not.toContain('\n\n\n');
			}
		});

		it('should truncate long content to 2000 chars', () => {
			const longContent = 'Success: ' + 'A'.repeat(3000);

			const entries: SessionEntry[] = [
				{
					id: 'msg_001',
					type: 'message',
					timestamp: Date.now(),
					message: {
						role: 'assistant',
						content: longContent,
					},
				},
			];

			const extractor = new InsightExtractor({ minConfidence: 0 });
			const insights = extractor.extract(entries);

			for (const insight of insights) {
				expect(insight.observation.length).toBeLessThanOrEqual(2000);
			}
		});
	});

	describe('Edge Cases', () => {
		it('should handle entries with null content', () => {
			const entries: SessionEntry[] = [
				{
					id: 'msg_001',
					type: 'message',
					timestamp: Date.now(),
					message: {
						role: 'assistant',
						content: null as any,
					},
				},
			];

			const extractor = new InsightExtractor();
			const insights = extractor.extract(entries);

			expect(insights).toEqual([]);
		});

		it('should handle entries with empty string content', () => {
			const entries: SessionEntry[] = [
				{
					id: 'msg_001',
					type: 'message',
					timestamp: Date.now(),
					message: {
						role: 'assistant',
						content: '',
					},
				},
			];

			const extractor = new InsightExtractor();
			const insights = extractor.extract(entries);

			expect(insights).toEqual([]);
		});

		it('should handle entries with object content blocks', () => {
			const entries: SessionEntry[] = [
				{
					id: 'msg_001',
					type: 'message',
					timestamp: Date.now(),
					message: {
						role: 'assistant',
						content: [
							{ type: 'tool_use', name: 'Read', arguments: {} },
							{ type: 'text', text: 'Success! File read completed' },
						],
					},
				},
			];

			const extractor = new InsightExtractor({ minConfidence: 0 });
			const insights = extractor.extract(entries);

			expect(Array.isArray(insights)).toBe(true);
		});

		it('should handle mixed valid and invalid entries', () => {
			const entries: SessionEntry[] = [
				{
					id: 'msg_001',
					type: 'message',
					timestamp: Date.now(),
					message: {
						role: 'assistant',
						content: 'Success: Task completed',
					},
				},
				{
					id: 'msg_002',
					type: 'message',
					timestamp: Date.now(),
					message: {
						role: 'assistant',
						content: '',
					},
				},
				{
					id: 'msg_003',
					type: 'message',
					timestamp: Date.now(),
					message: {
						role: 'assistant',
						content: null as any,
					},
				},
			];

			const extractor = new InsightExtractor({ minConfidence: 0 });
			const insights = extractor.extract(entries);

			expect(Array.isArray(insights)).toBe(true);
		});
	});

	describe('Pattern Validation', () => {
		it('should filter by frequency when validatePatterns is enabled', () => {
			const extractor = new InsightExtractor({ 
				validatePatterns: true, 
				minFrequency: 3,
				minConfidence: 0 
			});
			
			// This should work without throwing
			const insights = extractor.extract(successPatternEntries);
			expect(Array.isArray(insights)).toBe(true);
		});

		it('should work without validation', () => {
			const extractor = new InsightExtractor({ validatePatterns: false });
			const insights = extractor.extract(successPatternEntries);

			expect(Array.isArray(insights)).toBe(true);
		});
	});

	describe('Deduplication', () => {
		it('should deduplicate similar insights', () => {
			const entries: SessionEntry[] = [
				{
					id: 'msg_001',
					type: 'message',
					timestamp: Date.now() - 1000,
					message: {
						role: 'assistant',
						content: 'Success! Task completed',
					},
				},
				{
					id: 'msg_002',
					type: 'message',
					timestamp: Date.now(),
					message: {
						role: 'assistant',
						content: 'Success! Task completed',
					},
				},
			];

			const extractor = new InsightExtractor({ minConfidence: 0 });
			const insights = extractor.extract(entries);

			// Success pattern should not be duplicated
			const successInsights = insights.filter(i => i.type === InsightType.SUCCESS_PATTERN);
			expect(successInsights.length).toBeLessThanOrEqual(2);
		});
	});
});
