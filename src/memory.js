/**
 * Memory management for pi-agent-mind
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const MEMORY_DIR = path.join(
	os.homedir(),
	".pi",
	"agent",
	"extensions",
	"pi-agent-mind",
	"memories",
);

function ensureMemoryDir() {
	if (!fs.existsSync(MEMORY_DIR)) {
		fs.mkdirSync(MEMORY_DIR, { recursive: true });
	}
}

function getMemoryPath(name) {
	ensureMemoryDir();
	return path.join(MEMORY_DIR, `${name}.md`);
}

export function readMemory(name) {
	const filePath = getMemoryPath(name);
	if (fs.existsSync(filePath)) {
		return fs.readFileSync(filePath, "utf-8");
	}
	return "";
}

export function writeMemory(name, content) {
	const filePath = getMemoryPath(name);
	fs.writeFileSync(filePath, content, "utf-8");
}

export function appendMemory(name, content) {
	const existing = readMemory(name);
	const newContent = existing + "\n" + content;
	writeMemory(name, newContent);
}

export function getInsightsFromMemory() {
	const content = readMemory("MEMORY");
	if (!content) return [];

	const insights = [];
	const blocks = content.split("---").filter((b) => b.trim());

	for (const block of blocks) {
		const lines = block.trim().split("\n");
		const insight = {};
		for (const line of lines) {
			const idx = line.indexOf(":");
			if (idx > 0) {
				const key = line.substring(0, idx).trim();
				const value = line.substring(idx + 1).trim();
				insight[key] = value;
			}
		}
		if (insight.type && insight.observation) {
			insights.push(insight);
		}
	}

	return insights;
}

export function addInsight(insight) {
	const block = [
		"---",
		`type: ${insight.type}`,
		`timestamp: ${insight.timestamp}`,
		`task: ${insight.task}`,
		`observation: ${insight.observation}`,
		`implication: ${insight.implication}`,
		`action: ${insight.action}`,
		`confidence: ${insight.confidence}`,
		"---",
	].join("\n");

	appendMemory("MEMORY", block);
}

export function getMemoryStats() {
	ensureMemoryDir();
	const files = fs.readdirSync(MEMORY_DIR).filter((f) => f.endsWith(".md"));
	const stats = {};

	for (const file of files) {
		const content = fs.readFileSync(path.join(MEMORY_DIR, file), "utf-8");
		stats[file.replace(".md", "")] = {
			lines: content.split("\n").length,
			size: content.length,
		};
	}

	return stats;
}

export { MEMORY_DIR };
