/**
 * Memory Artifact Generators
 * Implements YAML frontmatter format from ARCHITECTURE.md
 * 
 * Generates:
 * - Individual insight files with YAML frontmatter
 * - Category-organized directories (error-patterns/, success-patterns/, etc.)
 * - behavior-context.md for agent context accumulation
 * - index.json for fast lookup
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type {
	Insight,
	InsightType,
	MemoryArtifact,
	AgentContext,
	LearnedPattern,
	ToolMetric,
	Improvement,
	SessionSummary,
} from './types';

// =============================================================================
// YAML FRONTMATTER FORMATTER
// =============================================================================

export interface MemoryArtifactUpdater {
	addInsight(insight: Insight, category?: string): MemoryArtifact;
	addInsights(insights: Insight[]): MemoryArtifact[];
	updateArtifact(id: string, updates: Partial<MemoryArtifact>): MemoryArtifact | null;
	deleteArtifact(id: string): boolean;
	getArtifacts(): MemoryArtifact[];
	getArtifactsByType(type: string): MemoryArtifact[];
	getArtifactsByTag(tag: string): MemoryArtifact[];
	searchArtifacts(query: string): MemoryArtifact[];
	getArtifactsSince(timestamp: number): MemoryArtifact[];
	exportToFile(outputPath: string): void;
	importFromFile(inputPath: string): number;
	getStats(): { total: number; byType: Record<string, number>; byTag: Record<string, number> };
	clear(): void;
	generateBehaviorContext(): string;
}

interface MemoryIndex {
	artifacts: MemoryArtifact[];
	lastUpdated: number;
	version: string;
}

// Category directories per ARCHITECTURE.md
const CATEGORY_DIRS: Record<InsightType, string> = {
	[InsightType.ERROR_PATTERN]: 'error-patterns',
	[InsightType.SUCCESS_PATTERN]: 'success-patterns',
	[InsightType.TOOL_EFFECTIVENESS]: 'tool-effectiveness',
	[InsightType.TIMING_INSIGHT]: 'timing-insights',
	[InsightType.STRATEGY_ADJUSTMENT]: 'strategy-adjustments',
	[InsightType.CONTEXT_REQUIREMENT]: 'context-requirements',
	[InsightType.METADATA_OBSERVATION]: 'metadata-observations',
};

export class MemoryArtifactUpdaterImpl implements MemoryArtifactUpdater {
	private memoryPath: string;
	private contextPath: string;
	private index: MemoryIndex;
	private agentContext: AgentContext;

	constructor(memoryPath: string, contextPath?: string) {
		this.memoryPath = memoryPath;
		this.contextPath = contextPath ?? path.join(memoryPath, 'context', 'agent-mind');
		this.index = this.loadIndex();
		this.agentContext = this.loadAgentContext();
	}

	/**
	 * Load the memory index
	 */
	private loadIndex(): MemoryIndex {
		const indexPath = path.join(this.memoryPath, 'index.json');

		if (fs.existsSync(indexPath)) {
			try {
				const content = fs.readFileSync(indexPath, 'utf-8');
				return JSON.parse(content);
			} catch (error) {
				console.error('Failed to load memory index:', error);
			}
		}

		return {
			artifacts: [],
			lastUpdated: Date.now(),
			version: '1.0.0',
		};
	}

	/**
	 * Load agent context
	 */
	private loadAgentContext(): AgentContext {
		const contextFile = path.join(this.contextPath, 'behavior-context.md');

		if (fs.existsSync(contextFile)) {
			try {
				const content = fs.readFileSync(contextFile, 'utf-8');
				return this.parseBehaviorContext(content);
			} catch (error) {
				console.error('Failed to load agent context:', error);
			}
		}

		return {
			project: 'Shopiflame',
			timestamp: new Date().toISOString(),
			patterns: [],
			toolEffectiveness: [],
			pendingImprovements: [],
			sessionHistory: [],
		};
	}

	/**
	 * Parse behavior context from markdown
	 */
	private parseBehaviorContext(content: string): AgentContext {
		// Basic parsing - extract known patterns
		const patterns: LearnedPattern[] = [];
		const toolMetrics: ToolMetric[] = [];

		// Extract patterns from markdown sections
		const patternMatches = content.matchAll(/^\d+\.\s+\*\*([^*]+)\*\*/gm);
		for (const match of patternMatches) {
			if (match[1]) {
				patterns.push({
					id: `pattern_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
					category: InsightType.SUCCESS_PATTERN,
					description: match[1].trim(),
					frequency: 1,
					lastObserved: new Date().toISOString(),
					confidence: 0.7,
					appliedCount: 0,
					successRate: 0.8,
				});
			}
		}

		return {
			project: 'Shopiflame',
			timestamp: new Date().toISOString(),
			patterns,
			toolEffectiveness: toolMetrics,
			pendingImprovements: [],
			sessionHistory: [],
		};
	}

	/**
	 * Save the memory index
	 */
	private saveIndex(): void {
		if (!fs.existsSync(this.memoryPath)) {
			fs.mkdirSync(this.memoryPath, { recursive: true });
		}

		this.index.lastUpdated = Date.now();
		const indexPath = path.join(this.memoryPath, 'index.json');
		fs.writeFileSync(indexPath, JSON.stringify(this.index, null, 2));
	}

	/**
	 * Add a new insight as a memory artifact
	 */
	addInsight(insight: Insight, category?: string): MemoryArtifact {
		const cat = category ?? this.getCategoryForType(insight.type);
		const artifact: MemoryArtifact = {
			id: insight.id,
			type: insight.type,
			category: cat,
			content: insight.observation,
			lastUpdated: Date.now(),
			source: insight.source,
			tags: insight.tags,
			module: insight.module,
			component: insight.component,
			confidence: insight.confidence,
			frequency: insight.frequency,
			firstObserved: insight.timestamp,
			lastObserved: insight.timestamp,
			appliedCount: insight.appliedCount,
			successRate: insight.successRate,
			validated: insight.validated,
		};

		// Check if artifact already exists
		const existingIndex = this.index.artifacts.findIndex(a => a.id === insight.id);
		if (existingIndex >= 0) {
			// Update existing
			artifact.firstObserved = this.index.artifacts[existingIndex].firstObserved;
			this.index.artifacts[existingIndex] = artifact;
		} else {
			this.index.artifacts.push(artifact);
		}

		this.saveIndex();
		this.saveInsightFile(artifact, insight);

		return artifact;
	}

	/**
	 * Add multiple insights as artifacts
	 */
	addInsights(insights: Insight[]): MemoryArtifact[] {
		return insights.map(insight => this.addInsight(insight));
	}

	/**
	 * Update an existing artifact
	 */
	updateArtifact(id: string, updates: Partial<MemoryArtifact>): MemoryArtifact | null {
		const index = this.index.artifacts.findIndex(a => a.id === id);
		if (index < 0) {
			return null;
		}

		const updated: MemoryArtifact = {
			...this.index.artifacts[index],
			...updates,
			id, // Preserve original ID
			lastUpdated: Date.now(),
		};

		this.index.artifacts[index] = updated;
		this.saveIndex();

		// Update insight file
		const insight = this.indexToInsight(updated);
		this.saveInsightFile(updated, insight);

		return updated;
	}

	/**
	 * Delete an artifact
	 */
	deleteArtifact(id: string): boolean {
		const index = this.index.artifacts.findIndex(a => a.id === id);
		if (index < 0) {
			return false;
		}

		this.index.artifacts.splice(index, 1);
		this.saveIndex();

		// Delete the insight file
		const category = this.getCategoryForType(this.index.artifacts[index]?.type as InsightType);
		const filePath = path.join(this.memoryPath, 'learnings', category, `${id}.md`);
		if (fs.existsSync(filePath)) {
			fs.unlinkSync(filePath);
		}

		return true;
	}

	/**
	 * Get all artifacts
	 */
	getArtifacts(): MemoryArtifact[] {
		return [...this.index.artifacts];
	}

	/**
	 * Get artifacts by type
	 */
	getArtifactsByType(type: string): MemoryArtifact[] {
		return this.index.artifacts.filter(a => a.type === type);
	}

	/**
	 * Get artifacts by tag
	 */
	getArtifactsByTag(tag: string): MemoryArtifact[] {
		return this.index.artifacts.filter(a => a.tags.includes(tag));
	}

	/**
	 * Search artifacts by content
	 */
	searchArtifacts(query: string): MemoryArtifact[] {
		const lowerQuery = query.toLowerCase();
		return this.index.artifacts.filter(a =>
			a.content.toLowerCase().includes(lowerQuery) ||
			a.tags.some(t => t.toLowerCase().includes(lowerQuery))
		);
	}

	/**
	 * Get artifacts updated after a timestamp
	 */
	getArtifactsSince(timestamp: number): MemoryArtifact[] {
		return this.index.artifacts.filter(a => a.lastUpdated >= timestamp);
	}

	/**
	 * Export all artifacts to a single file
	 */
	exportToFile(outputPath: string): void {
		const exportData = {
			exportedAt: Date.now(),
			version: this.index.version,
			artifacts: this.index.artifacts,
		};

		const dir = path.dirname(outputPath);
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}

		fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2));
	}

	/**
	 * Import artifacts from a file
	 */
	importFromFile(inputPath: string): number {
		if (!fs.existsSync(inputPath)) {
			throw new Error(`Import file not found: ${inputPath}`);
		}

		const content = fs.readFileSync(inputPath, 'utf-8');
		const importData = JSON.parse(content);

		if (!importData.artifacts || !Array.isArray(importData.artifacts)) {
			throw new Error('Invalid import file format');
		}

		let added = 0;
		for (const artifact of importData.artifacts) {
			if (!this.index.artifacts.find(a => a.id === artifact.id)) {
				this.index.artifacts.push({
					...artifact,
					lastUpdated: Date.now(),
				});
				const insight = this.indexToInsight(artifact);
				this.saveInsightFile(artifact, insight);
				added++;
			}
		}

		this.saveIndex();
		return added;
	}

	/**
	 * Save an individual insight file with YAML frontmatter (per ARCHITECTURE.md)
	 */
	private saveInsightFile(artifact: MemoryArtifact, insight: Insight): void {
		const catDir = this.getCategoryDir(artifact.category);
		const learnDir = path.join(this.memoryPath, 'learnings', catDir);

		if (!fs.existsSync(learnDir)) {
			fs.mkdirSync(learnDir, { recursive: true });
		}

		const filePath = path.join(learnDir, `${artifact.id}.md`);
		const frontmatter = this.generateFrontmatter(artifact, insight);
		fs.writeFileSync(filePath, frontmatter);
	}

	/**
	 * Generate YAML frontmatter per ARCHITECTURE.md schema
	 */
	private generateFrontmatter(artifact: MemoryArtifact, insight: Insight): string {
		const lines: string[] = [];

		// YAML Frontmatter
		lines.push('---');
		lines.push(`id: ${artifact.id}`);
		lines.push(`type: ${insight.type}`);
		lines.push(`category: ${artifact.category}`);
		if (insight.tags.length > 0) {
			lines.push('tags:');
			for (const tag of insight.tags) {
				lines.push(`  - ${tag}`);
			}
		}
		if (artifact.module) {
			lines.push(`module: ${artifact.module}`);
		}
		if (artifact.component) {
			lines.push(`component: ${artifact.component}`);
		}
		lines.push(`confidence: ${artifact.confidence.toFixed(2)}`);
		lines.push(`frequency: ${artifact.frequency}`);
		lines.push(`first_observed: ${artifact.firstObserved}`);
		lines.push(`last_observed: ${artifact.lastObserved}`);
		lines.push(`track: ${insight.validated ? 'knowledge' : 'bug'}`);
		lines.push(`applied_count: ${artifact.appliedCount}`);
		lines.push(`success_rate: ${artifact.successRate.toFixed(2)}`);
		lines.push(`validated: ${insight.validated}`);
		lines.push('---');
		lines.push('');

		// Content
		lines.push(`# ${this.getTitle(insight)}`);
		lines.push('');
		lines.push('## Observation');
		lines.push('');
		lines.push(insight.observation);
		lines.push('');
		lines.push('## Implication');
		lines.push('');
		lines.push(insight.implication);
		lines.push('');
		lines.push('## Action');
		lines.push('');
		lines.push(insight.action);
		lines.push('');

		// Add type-specific fields
		if (insight.type === InsightType.ERROR_PATTERN && 'rootCause' in insight) {
			lines.push('## Root Cause');
			lines.push('');
			lines.push((insight as { rootCause: string }).rootCause);
			lines.push('');
		}

		if (insight.type === InsightType.SUCCESS_PATTERN && 'approach' in insight) {
			lines.push('## Approach');
			lines.push('');
			lines.push((insight as { approach: string }).approach);
			lines.push('');
		}

		if (insight.type === InsightType.TOOL_EFFECTIVENESS && 'toolName' in insight) {
			lines.push('## Tool Metrics');
			lines.push('');
			lines.push(`- Tool: ${(insight as { toolName: string }).toolName}`);
			lines.push(`- Success Rate: ${((insight as { successRate: number }).successRate * 100).toFixed(1)}%`);
			lines.push(`- Latency: ${(insight as { latency: number }).latency}ms`);
			lines.push('');
		}

		return lines.join('\n');
	}

	/**
	 * Get title for insight
	 */
	private getTitle(insight: Insight): string {
		const titles: Record<InsightType, string> = {
			[InsightType.ERROR_PATTERN]: `Error Pattern: ${this.truncate(insight.observation, 50)}`,
			[InsightType.SUCCESS_PATTERN]: `Success Pattern: ${this.truncate(insight.observation, 50)}`,
			[InsightType.TOOL_EFFECTIVENESS]: `Tool Effectiveness: ${'toolName' in insight ? insight.toolName : 'Unknown'}`,
			[InsightType.TIMING_INSIGHT]: `Timing Insight: ${this.truncate(insight.observation, 50)}`,
			[InsightType.STRATEGY_ADJUSTMENT]: `Strategy Adjustment: ${this.truncate(insight.observation, 50)}`,
			[InsightType.CONTEXT_REQUIREMENT]: `Context Requirement: ${this.truncate(insight.observation, 50)}`,
			[InsightType.METADATA_OBSERVATION]: `Metadata Observation: ${this.truncate(insight.observation, 50)}`,
		};
		return titles[insight.type] ?? 'Insight';
	}

	/**
	 * Truncate string
	 */
	private truncate(str: string, len: number): string {
		return str.length > len ? str.slice(0, len) + '...' : str;
	}

	/**
	 * Convert artifact back to insight
	 */
	private indexToInsight(artifact: MemoryArtifact): Insight {
		return {
			id: artifact.id,
			type: artifact.type as InsightType,
			timestamp: artifact.lastUpdated.toString(),
			task: artifact.category,
			observation: artifact.content,
			implication: '',
			action: '',
			confidence: artifact.confidence,
			source: artifact.source as 'execution' | 'reflection' | 'external',
			validated: artifact.validated,
			category: artifact.category,
			tags: artifact.tags,
			frequency: artifact.frequency,
			appliedCount: artifact.appliedCount,
			successRate: artifact.successRate,
		};
	}

	/**
	 * Get category directory
	 */
	private getCategoryDir(category: string): string {
		const type = category.replace(/-/g, '_').toUpperCase() as InsightType;
		return CATEGORY_DIRS[type] ?? category;
	}

	/**
	 * Get category for insight type
	 */
	private getCategoryForType(type: InsightType | string): string {
		const categories: Record<string, string> = {
			[InsightType.ERROR_PATTERN]: 'error-patterns',
			[InsightType.SUCCESS_PATTERN]: 'success-patterns',
			[InsightType.TOOL_EFFECTIVENESS]: 'tool-effectiveness',
			[InsightType.TIMING_INSIGHT]: 'timing-insights',
			[InsightType.STRATEGY_ADJUSTMENT]: 'strategy-adjustments',
			[InsightType.CONTEXT_REQUIREMENT]: 'context-requirements',
			[InsightType.METADATA_OBSERVATION]: 'metadata-observations',
		};
		return categories[type as string] ?? 'misc';
	}

	/**
	 * Generate behavior-context.md (per ARCHITECTURE.md Pattern 1)
	 */
	generateBehaviorContext(): string {
		const lines: string[] = [];

		lines.push('# Agent Behavior Context');
		lines.push('');
		lines.push(`## Project: ${this.agentContext.project}`);
		lines.push('');
		lines.push(`Last Updated: ${new Date().toISOString()}`);
		lines.push('');
		lines.push('## Learned Patterns');
		lines.push('');

		// Group patterns by category
		const patternsByCategory = new Map<string, LearnedPattern[]>();
		for (const pattern of this.agentContext.patterns) {
			const cat = pattern.category;
			if (!patternsByCategory.has(cat)) {
				patternsByCategory.set(cat, []);
			}
			patternsByCategory.get(cat)!.push(pattern);
		}

		for (const [category, patterns] of patternsByCategory) {
			lines.push(`### ${this.formatCategory(category)}`);
			lines.push('');
			for (const pattern of patterns) {
				lines.push(`1. **${pattern.description}**`);
				lines.push(`   - Frequency: ${pattern.frequency}x`);
				lines.push(`   - Confidence: ${(pattern.confidence * 100).toFixed(0)}%`);
				lines.push(`   - Success Rate: ${(pattern.successRate * 100).toFixed(0)}%`);
				lines.push(`   - Last Observed: ${pattern.lastObserved}`);
				lines.push('');
			}
		}

		lines.push('## Tool Effectiveness');
		lines.push('');
		lines.push('| Tool | Success Rate | Avg Latency | Invocations |');
		lines.push('|------|--------------|-------------|--------------|');

		for (const metric of this.agentContext.toolEffectiveness) {
			const successRate = metric.invocations > 0
				? (metric.successes / metric.invocations * 100).toFixed(1)
				: 'N/A';
			lines.push(`| ${metric.toolName} | ${successRate}% | ${metric.averageLatency.toFixed(0)}ms | ${metric.invocations} |`);
		}
		lines.push('');

		lines.push('## Pending Improvements');
		lines.push('');
		for (const improvement of this.agentContext.pendingImprovements) {
			const priority = improvement.priority === 'high' ? '🔴' : improvement.priority === 'medium' ? '🟡' : '🟢';
			lines.push(`- [${priority}] ${improvement.description} (${improvement.status})`);
		}
		lines.push('');

		lines.push('## Session History');
		lines.push('');
		for (const session of this.agentContext.sessionHistory.slice(-10)) {
			const outcome = session.outcome === 'success' ? '✅' : session.outcome === 'partial' ? '⚠️' : '❌';
			lines.push(`- ${outcome} ${session.task} - ${new Date(session.timestamp).toLocaleDateString()}`);
		}

		// Save to file
		const contextDir = this.contextPath;
		if (!fs.existsSync(contextDir)) {
			fs.mkdirSync(contextDir, { recursive: true });
		}

		const contextFile = path.join(contextDir, 'behavior-context.md');
		fs.writeFileSync(contextFile, lines.join('\n'));

		return lines.join('\n');
	}

	/**
	 * Format category name
	 */
	private formatCategory(category: string): string {
		return category
			.replace(/_/g, ' ')
			.replace(/\b\w/g, c => c.toUpperCase());
	}

	/**
	 * Update agent context with new patterns
	 */
	updateContextWithPattern(insight: Insight): void {
		const existingIndex = this.agentContext.patterns.findIndex(
			p => p.description === insight.observation
		);

		if (existingIndex >= 0) {
			const existing = this.agentContext.patterns[existingIndex];
			existing.frequency++;
			existing.lastObserved = insight.timestamp;
			existing.confidence = (existing.confidence + insight.confidence) / 2;
		} else {
			this.agentContext.patterns.push({
				id: insight.id,
				category: insight.type,
				description: insight.observation,
				frequency: insight.frequency,
				lastObserved: insight.timestamp,
				confidence: insight.confidence,
				appliedCount: insight.appliedCount,
				successRate: insight.successRate,
			});
		}

		this.agentContext.timestamp = new Date().toISOString();
		this.generateBehaviorContext();
	}

	/**
	 * Update tool effectiveness metrics
	 */
	updateToolMetrics(metrics: ToolMetric[]): void {
		for (const incoming of metrics) {
			const existingIndex = this.agentContext.toolEffectiveness.findIndex(
				m => m.toolName === incoming.toolName
			);

			if (existingIndex >= 0) {
				const existing = this.agentContext.toolEffectiveness[existingIndex];
				const totalInvocations = existing.invocations + incoming.invocations;
				existing.invocations = totalInvocations;
				existing.successes += incoming.successes;
				existing.failures += incoming.failures;
				existing.averageLatency = (
					(existing.averageLatency * existing.invocations) +
					(incoming.averageLatency * incoming.invocations)
				) / totalInvocations;
				existing.lastUsed = incoming.lastUsed;
			} else {
				this.agentContext.toolEffectiveness.push({ ...incoming });
			}
		}

		this.agentContext.timestamp = new Date().toISOString();
		this.generateBehaviorContext();
	}

	/**
	 * Add pending improvement
	 */
	addImprovement(improvement: Omit<Improvement, 'id'>): void {
		this.agentContext.pendingImprovements.push({
			...improvement,
			id: `improvement_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
		});
		this.agentContext.timestamp = new Date().toISOString();
		this.generateBehaviorContext();
	}

	/**
	 * Add session to history
	 */
	addSessionSummary(summary: SessionSummary): void {
		this.agentContext.sessionHistory.push(summary);
		// Keep only last 50 sessions
		if (this.agentContext.sessionHistory.length > 50) {
			this.agentContext.sessionHistory = this.agentContext.sessionHistory.slice(-50);
		}
		this.agentContext.timestamp = new Date().toISOString();
		this.generateBehaviorContext();
	}

	/**
	 * Get memory statistics
	 */
	getStats(): { total: number; byType: Record<string, number>; byTag: Record<string, number> } {
		const byType: Record<string, number> = {};
		const byTag: Record<string, number> = {};

		for (const artifact of this.index.artifacts) {
			byType[artifact.type] = (byType[artifact.type] || 0) + 1;

			for (const tag of artifact.tags) {
				byTag[tag] = (byTag[tag] || 0) + 1;
			}
		}

		return {
			total: this.index.artifacts.length,
			byType,
			byTag,
		};
	}

	/**
	 * Clear all artifacts (use with caution)
	 */
	clear(): void {
		this.index.artifacts = [];
		this.saveIndex();

		// Clear learning directories
		const learnDir = path.join(this.memoryPath, 'learnings');
		if (fs.existsSync(learnDir)) {
			this.rmdirRecursive(learnDir);
		}

		// Clear context
		this.agentContext = {
			project: 'Shopiflame',
			timestamp: new Date().toISOString(),
			patterns: [],
			toolEffectiveness: [],
			pendingImprovements: [],
			sessionHistory: [],
		};

		const contextFile = path.join(this.contextPath, 'behavior-context.md');
		if (fs.existsSync(contextFile)) {
			fs.unlinkSync(contextFile);
		}
	}

	/**
	 * Recursively remove directory
	 */
	private rmdirRecursive(dir: string): void {
		if (fs.existsSync(dir)) {
			fs.readdirSync(dir).forEach(file => {
				const filePath = path.join(dir, file);
				if (fs.lstatSync(filePath).isDirectory()) {
					this.rmdirRecursive(filePath);
				} else {
					fs.unlinkSync(filePath);
				}
			});
			fs.rmdirSync(dir);
		}
	}
}

// Export factory function
export function createMemoryArtifactUpdater(memoryPath: string, contextPath?: string): MemoryArtifactUpdater {
	return new MemoryArtifactUpdaterImpl(memoryPath, contextPath);
}
