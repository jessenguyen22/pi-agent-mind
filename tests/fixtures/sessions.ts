/**
 * Test fixtures for pi-agent-mind tests
 * Updated to match current type definitions
 */

import { InsightType } from '../../src/types';
import type { SessionEntry, Insight, ToolCall, ToolResult } from '../../src/types';

// Sample session entries with message content
export const sampleSessionEntries: SessionEntry[] = [
	{
		id: 'msg_001',
		type: 'message',
		timestamp: Date.now() - 100000,
		message: {
			role: 'user',
			content: 'I need to scrape a website using puppeteer',
		},
	},
	{
		id: 'msg_002',
		type: 'message',
		timestamp: Date.now() - 90000,
		message: {
			role: 'assistant',
			content: 'Error: Bot detection triggered on this website',
		},
	},
	{
		id: 'msg_003',
		type: 'message',
		timestamp: Date.now() - 80000,
		message: {
			role: 'assistant',
			content: [
				{ type: 'text', text: 'Solution: Use stealth plugin to avoid detection' },
			],
		},
	},
	{
		id: 'msg_004',
		type: 'message',
		timestamp: Date.now() - 70000,
		message: {
			role: 'user',
			content: 'This works now, great approach!',
		},
	},
	{
		id: 'msg_005',
		type: 'message',
		timestamp: Date.now() - 60000,
		message: {
			role: 'assistant',
			content: 'Completed the scraping successfully',
		},
	},
];

// Entries with error patterns
export const errorPatternEntries: SessionEntry[] = [
	{
		id: 'err_001',
		type: 'message',
		timestamp: Date.now() - 40000,
		message: {
			role: 'assistant',
			content: 'Error: Authentication failed for the API',
		},
	},
	{
		id: 'err_002',
		type: 'message',
		timestamp: Date.now() - 30000,
		message: {
			role: 'assistant',
			content: 'Root cause: Missing API key in environment variables',
		},
	},
	{
		id: 'err_003',
		type: 'message',
		timestamp: Date.now() - 20000,
		message: {
			role: 'user',
			content: 'This is blocking our progress',
		},
	},
];

// Entries with success patterns
export const successPatternEntries: SessionEntry[] = [
	{
		id: 'succ_001',
		type: 'message',
		timestamp: Date.now() - 30000,
		message: {
			role: 'assistant',
			content: 'Success! The API call completed and returned valid data',
		},
	},
	{
		id: 'succ_002',
		type: 'message',
		timestamp: Date.now() - 25000,
		message: {
			role: 'assistant',
			content: 'This approach works consistently for similar tasks',
		},
	},
	{
		id: 'succ_003',
		type: 'message',
		timestamp: Date.now() - 20000,
		message: {
			role: 'user',
			content: 'Verified the output is correct',
		},
	},
];

// Entries with timing insights
export const timingInsightEntries: SessionEntry[] = [
	{
		id: 'tim_001',
		type: 'message',
		timestamp: Date.now() - 15000,
		message: {
			role: 'assistant',
			content: 'Added exponential backoff with 500ms delay between retries',
		},
	},
];

// Entries with strategy adjustments
export const strategyAdjustmentEntries: SessionEntry[] = [
	{
		id: 'strat_001',
		type: 'message',
		timestamp: Date.now() - 10000,
		message: {
			role: 'assistant',
			content: 'Instead of using puppeteer, switched to crawl4ai for better performance',
		},
	},
];

// Entries with context requirements
export const contextRequirementEntries: SessionEntry[] = [
	{
		id: 'ctx_001',
		type: 'message',
		timestamp: Date.now() - 5000,
		message: {
			role: 'assistant',
			content: 'Missing context: We needed to know the website has JavaScript rendering',
		},
	},
];

// Entries with metadata observations
export const metadataObservationEntries: SessionEntry[] = [
	{
		id: 'meta_001',
		type: 'message',
		timestamp: Date.now() - 3000,
		message: {
			role: 'assistant',
			content: 'API changed from v1 to v2, updated the endpoint accordingly',
		},
	},
];

// Tool call and result entries
export const toolCallEntries: SessionEntry[] = [
	{
		id: 'tool_call_001',
		type: 'tool_call',
		timestamp: Date.now() - 50000,
		toolCall: {
			name: 'Read',
			arguments: { path: 'package.json' },
			inputTokens: 100,
		},
	},
	{
		id: 'tool_result_001',
		type: 'tool_result',
		timestamp: Date.now() - 49000,
		toolResult: {
			name: 'Read',
			output: '{ "name": "test" }',
			duration: 150,
			outputTokens: 50,
		},
	},
	{
		id: 'tool_call_002',
		type: 'tool_call',
		timestamp: Date.now() - 40000,
		toolCall: {
			name: 'Read',
			arguments: { path: 'tsconfig.json' },
			inputTokens: 80,
		},
	},
	{
		id: 'tool_result_002',
		type: 'tool_result',
		timestamp: Date.now() - 39000,
		toolResult: {
			name: 'Read',
			error: 'File not found',
			duration: 50,
		},
	},
	{
		id: 'tool_call_003',
		type: 'tool_call',
		timestamp: Date.now() - 30000,
		toolCall: {
			name: 'Read',
			arguments: { path: 'README.md' },
			inputTokens: 90,
		},
	},
	{
		id: 'tool_result_003',
		type: 'tool_result',
		timestamp: Date.now() - 29000,
		toolResult: {
			name: 'Read',
			output: '# Project Readme',
			duration: 120,
			outputTokens: 40,
		},
	},
];

// Entries with multiple content blocks
export const multiBlockSessionEntries: SessionEntry[] = [
	{
		id: 'multi_001',
		type: 'message',
		timestamp: Date.now() - 50000,
		message: {
			role: 'assistant',
			content: [
				{ type: 'text', text: 'Error detected:' },
				{ type: 'text', text: 'Connection timeout after 30 seconds' },
				{ type: 'text', text: 'Root cause: Server was overloaded' },
			],
		},
	},
];

// Empty entries for edge case testing
export const emptySessionEntries: SessionEntry[] = [];

// Entries with only non-message types
export const nonMessageEntries: SessionEntry[] = [
	{
		id: 'comp_001',
		type: 'compaction',
		timestamp: Date.now() - 10000,
		message: {
			role: 'assistant',
			content: 'Session summary...',
		},
	},
];

// Entries with hashtags for tag extraction
export const taggedEntries: SessionEntry[] = [
	{
		id: 'tag_001',
		type: 'message',
		timestamp: Date.now() - 3000,
		message: {
			role: 'assistant',
			content: 'Created a new React component for the dashboard. #react #typescript #components',
		},
	},
];

// Entries with keywords for tag extraction
export const keywordEntries: SessionEntry[] = [
	{
		id: 'kw_001',
		type: 'message',
		timestamp: Date.now() - 2000,
		message: {
			role: 'assistant',
			content: 'Successfully connected to the PostgreSQL database using the Node.js API',
		},
	},
];

// Large context for testing context scoring
export const largeContextEntries: SessionEntry[] = Array.from({ length: 35 }, (_, i) => ({
	id: `ctx_${i}`,
	type: 'message' as const,
	timestamp: Date.now() - i * 1000,
	message: {
		role: i % 2 === 0 ? 'user' : 'assistant',
		content: `This is message number ${i} in a long conversation about testing the system`,
	},
}));

// Sample insights for testing
export const sampleInsights: Insight[] = [
	{
		id: 'insight_001',
		type: InsightType.ERROR_PATTERN,
		timestamp: new Date().toISOString(),
		task: 'API integration',
		observation: 'Bot detection triggered on website',
		implication: 'Consider using stealth mode',
		action: 'Implement anti-detection measures',
		confidence: 0.85,
		source: 'execution',
		validated: false,
		category: 'error-patterns',
		tags: ['puppeteer', 'scraping'],
		frequency: 3,
		appliedCount: 1,
		successRate: 0.5,
		errorType: 'BOT_DETECTION',
		rootCause: 'Website blocks automated browsers',
		recoveryStrategy: 'Use stealth plugin',
		preventionRules: ['Use realistic user agents'],
	},
	{
		id: 'insight_002',
		type: InsightType.SUCCESS_PATTERN,
		timestamp: new Date().toISOString(),
		task: 'Data extraction',
		observation: 'Successfully parsed JSON from API response',
		implication: 'This approach is reliable',
		action: 'Apply to similar tasks',
		confidence: 0.9,
		source: 'execution',
		validated: true,
		category: 'success-patterns',
		tags: ['api', 'json'],
		frequency: 5,
		appliedCount: 3,
		successRate: 1.0,
		approach: 'Direct JSON parsing',
		conditions: ['Valid JSON response'],
		outcome: 'Data extracted successfully',
		reproducibility: 'high',
	},
];
