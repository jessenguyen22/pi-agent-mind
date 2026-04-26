/**
 * Core types for pi-agent-mind extension
 * Matches ARCHITECTURE.md specification
 */

// =============================================================================
// INSIGHT TYPES (7 types from ARCHITECTURE.md)
// =============================================================================

export enum InsightType {
	// 1. ERROR_PATTERN — Bugs, failures, exceptions
	ERROR_PATTERN = "error_pattern",

	// 2. SUCCESS_PATTERN — What worked well
	SUCCESS_PATTERN = "success_pattern",

	// 3. TOOL_EFFECTIVENESS — Which tools worked best
	TOOL_EFFECTIVENESS = "tool_effectiveness",

	// 4. TIMING_INSIGHT — When to use what approach
	TIMING_INSIGHT = "timing_insight",

	// 5. STRATEGY_ADJUSTMENT — Tactical pivots
	STRATEGY_ADJUSTMENT = "strategy_adjustment",

	// 6. CONTEXT_REQUIREMENT — What context was missing
	CONTEXT_REQUIREMENT = "context_requirement",

	// 7. METADATA_OBSERVATION — Environmental changes
	METADATA_OBSERVATION = "metadata_observation",
}

// =============================================================================
// INSIGHT INTERFACES
// =============================================================================

export interface Insight {
	id: string;
	type: InsightType;
	timestamp: string;
	task: string;
	observation: string;
	implication: string;
	action: string;
	confidence: number; // 0-1
	source: "execution" | "reflection" | "external";
	validated: boolean;
	// Category & metadata
	category: string;
	tags: string[];
	module?: string;
	component?: string;
	frequency: number;
	appliedCount: number;
	successRate: number;
}

// Type 1: Error Pattern
export interface ErrorPatternInsight extends Insight {
	type: InsightType.ERROR_PATTERN;
	errorType: string;
	frequency: number;
	rootCause: string;
	recoveryStrategy: string;
	preventionRules: string[];
}

// Type 2: Success Pattern
export interface SuccessPatternInsight extends Insight {
	type: InsightType.SUCCESS_PATTERN;
	approach: string;
	conditions: string[];
	outcome: string;
	reproducibility: "high" | "medium" | "low";
}

// Type 3: Tool Effectiveness
export interface ToolEffectivenessInsight extends Insight {
	type: InsightType.TOOL_EFFECTIVENESS;
	toolName: string;
	successRate: number;
	latency: number;
	costPerUse: number;
	bestUseCases: string[];
	failureModes: string[];
}

// Type 4: Timing Insight
export interface TimingInsight extends Insight {
	type: InsightType.TIMING_INSIGHT;
	strategy: string;
	optimalConditions: {
		timeOfDay?: string;
		websiteLoad?: string;
		retryDelay?: number;
	};
	empiricalData: {
		successRate: number;
		sampleSize: number;
	};
}

// Type 5: Strategy Adjustment
export interface StrategyAdjustmentInsight extends Insight {
	type: InsightType.STRATEGY_ADJUSTMENT;
	previousStrategy: string;
	newStrategy: string;
	trigger: string;
	expectedImprovement: number;
	actualImprovement?: number;
}

// Type 6: Context Requirement
export interface ContextRequirementInsight extends Insight {
	type: InsightType.CONTEXT_REQUIREMENT;
	missingContext: string;
	impact: "blocking" | "degrading" | "minor";
	workaround: string;
	idealSolution: string;
}

// Type 7: Metadata Observation
export interface MetadataObservationInsight extends Insight {
	type: InsightType.METADATA_OBSERVATION;
	source: "environment" | "model" | "api";
	change: string;
	previousValue: string;
	newValue: string;
	adaptation: string;
}

// =============================================================================
// SESSION & EXECUTION TYPES
// =============================================================================

export interface SessionEntry {
	id: string;
	type: "message" | "compaction" | "tool_call" | "tool_result";
	timestamp?: number;
	message?: {
		role: "user" | "assistant" | "system";
		content: unknown;
	};
	toolCall?: ToolCall;
	toolResult?: ToolResult;
}

export interface ToolCall {
	name: string;
	arguments?: Record<string, unknown>;
	inputTokens?: number;
}

export interface ToolResult {
	name: string;
	output?: unknown;
	error?: string;
	duration?: number;
	outputTokens?: number;
}

export interface SessionAnalysis {
	sessionId: string;
	timestamp: string;
	toolCalls: ToolCall[];
	toolResults: ToolResult[];
	toolMetrics: ToolMetric[];
	totalDuration?: number;
	errors: string[];
	successPatterns: string[];
}

export interface ToolMetric {
	toolName: string;
	invocations: number;
	successes: number;
	failures: number;
	averageLatency: number;
	lastUsed: string;
}

// =============================================================================
// CONFIDENCE SCORING
// =============================================================================

export interface ConfidenceScore {
	overall: number;
	factors: {
		repetition: number;    // How often this pattern appears (weight: 0.25)
		frequency: number;     // Number of occurrences (weight: 0.20)
		clarity: number;       // Content quality (weight: 0.15)
		pattern: number;       // Type-specific confidence (weight: 0.15)
		context: number;      // Richness of surrounding context (weight: 0.15)
		source: number;        // Execution > Reflection > External (weight: 0.10)
	};
	reasoning: string;
}

// =============================================================================
// AGENT CONTEXT
// =============================================================================

export interface AgentContext {
	project: string;
	timestamp: string;
	patterns: LearnedPattern[];
	toolEffectiveness: ToolMetric[];
	pendingImprovements: Improvement[];
	sessionHistory: SessionSummary[];
}

export interface LearnedPattern {
	id: string;
	category: InsightType;
	description: string;
	frequency: number;
	lastObserved: string;
	confidence: number;
	appliedCount: number;
	successRate: number;
}

export interface Improvement {
	id: string;
	source: "execution" | "reflection" | "optimization";
	description: string;
	priority: "high" | "medium" | "low";
	status: "proposed" | "approved" | "applied" | "verified";
	expectedImpact?: number;
	actualImpact?: number;
}

export interface SessionSummary {
	sessionId: string;
	timestamp: string;
	task: string;
	outcome: "success" | "partial" | "failed";
	insightsExtracted: number;
	duration: number;
}

// =============================================================================
// MEMORY ARTIFACTS
// =============================================================================

export interface MemoryArtifact {
	id: string;
	type: string;
	category: string;
	content: string;
	lastUpdated: number;
	source: string;
	tags: string[];
	module?: string;
	component?: string;
	confidence: number;
	frequency: number;
	firstObserved: string;
	lastObserved: string;
	appliedCount: number;
	successRate: number;
	validated: boolean;
}

export interface MemoryIndex {
	artifacts: MemoryArtifact[];
	lastUpdated: number;
	version: string;
}

// =============================================================================
// EXECUTION LEARNINGS
// =============================================================================

export interface ExecutionLearnings {
	taskType: string;
	timestamp: string;
	steps: number;
	success: boolean;
	duration: number;
	errors: string[];
	patterns: string[];
	improvements: string[];
}

// =============================================================================
// CONFIGURATION
// =============================================================================

export interface InsightExtractionOptions {
	minConfidence?: number;
	types?: InsightType[];
	maxInsights?: number;
	includeMetadata?: boolean;
	validatePatterns?: boolean;
	minFrequency?: number; // Minimum occurrences to validate pattern
}

export interface SessionScanResult {
	sessionId: string;
	timestamp: number;
	entries: number;
	insights: Insight[];
	analysis: SessionAnalysis;
	summary: string;
}

export interface AgentMindConfig {
	enabled: boolean;
	autoExtract: boolean;
	memoryPath: string;
	confidenceThreshold: number;
	validatePatterns: boolean;
	minFrequency: number;
}

// =============================================================================
// TOOL CALL PARSING (Hermes Format)
// =============================================================================

export interface HermesToolCall {
	type: "function";
	function: {
		name: string;
		arguments: string | Record<string, unknown>;
	};
}

export interface ParsedToolInvocation {
	name: string;
	arguments: Record<string, unknown>;
	raw: HermesToolCall;
	timestamp?: number;
}
