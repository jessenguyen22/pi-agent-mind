/**
 * pi-agent-mind types
 */

export const InsightType = {
	ERROR_PATTERN: "error_pattern",
	SUCCESS_PATTERN: "success_pattern",
	TOOL_EFFECTIVENESS: "tool_effectiveness",
	TIMING_INSIGHT: "timing_insight",
	STRATEGY_ADJUSTMENT: "strategy_adjustment",
	CONTEXT_REQUIREMENT: "context_requirement",
	METADATA_OBSERVATION: "metadata_observation",
};

export function createInsight(
	type,
	task,
	observation,
	implication,
	action,
	confidence,
) {
	return {
		id: `${type}-${Date.now()}`,
		type,
		timestamp: new Date().toISOString(),
		task,
		observation,
		implication,
		action,
		confidence: confidence || 0.7,
		source: "execution",
		validated: false,
		category: "general",
		tags: [],
		frequency: 1,
		appliedCount: 0,
		successRate: 0,
	};
}
