/**
 * Example 01 — Basic Memory Operations
 *
 * Demonstrates the fundamental operations of pi-agent-mind:
 * - Initializing the memory system
 * - Storing memories in the three layers
 * - Querying across layers
 * - Retrieving and updating entries
 *
 * Run with: npx tsx examples/01-basic-memory-operations.ts
 */

import {
  MemoryEngine,
  MemoryEntry,
  MemoryLayer,
  MemorySearchOptions,
} from '../src/index.js';

// ─────────────────────────────────────────────────────────────────────────────
// 1. Initialize the Memory Engine
// ─────────────────────────────────────────────────────────────────────────────

const memory = new MemoryEngine({
  episodic: { maxEntries: 500 },
  semantic: { maxEntries: 2000 },
  procedural: { maxEntries: 500 },
});

console.log('✅ Memory engine initialized\n');

// ─────────────────────────────────────────────────────────────────────────────
// 2. Store an Episodic Memory (experience / conversation)
// ─────────────────────────────────────────────────────────────────────────────

const sessionMemory = await memory.store(
  {
    type: 'episodic',
    content: 'User asked about setting up a CI pipeline with GitHub Actions. Walked them through a basic YAML config with Node.js matrix strategy.',
    tags: ['ci', 'github-actions', 'nodejs'],
    metadata: {
      sessionId: 'sess-001',
      userId: 'user-42',
      duration: 45,
    },
  },
  'episodic'
);

console.log('📝 Stored episodic memory:', sessionMemory.id);

// ─────────────────────────────────────────────────────────────────────────────
// 3. Store a Semantic Memory (factual knowledge)
// ─────────────────────────────────────────────────────────────────────────────

const factMemory = await memory.store(
  {
    type: 'semantic',
    content: 'TypeScript strict mode enables noImplicitAny, strictNullChecks, and strictFunctionTypes to catch type errors at compile time.',
    tags: ['typescript', 'strict-mode', 'types'],
    metadata: {
      confidence: 0.95,
      source: 'documentation',
    },
  },
  'semantic'
);

console.log('🧠 Stored semantic memory:', factMemory.id);

// ─────────────────────────────────────────────────────────────────────────────
// 4. Store a Procedural Memory (skill / procedure)
// ─────────────────────────────────────────────────────────────────────────────

const procedureMemory = await memory.store(
  {
    type: 'procedural',
    content: `To create a GitHub Actions workflow:
1. Create .github/workflows/ci.yml
2. Define trigger (on: push, pull_request)
3. Add jobs with steps
4. Use actions/checkout@v4
5. Use actions/setup-node@v4 with matrix strategy
6. Run npm ci && npm test`,
    tags: ['github-actions', 'ci', 'workflow'],
    metadata: {
      language: 'yaml',
      complexity: 'intermediate',
      estimatedTime: 15,
    },
  },
  'procedural'
);

console.log('⚙️  Stored procedural memory:', procedureMemory.id, '\n');

// ─────────────────────────────────────────────────────────────────────────────
// 5. Query by Layer
// ─────────────────────────────────────────────────────────────────────────────

const semanticResults = await memory.query('TypeScript', {
  layers: ['semantic'],
  limit: 10,
});

console.log(`🔍 Semantic query for "TypeScript" — found ${semanticResults.length} result(s):`);
for (const r of semanticResults) {
  console.log(`   • [${r.layer}] ${r.entry.content.slice(0, 60)}…`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Cross-Layer Search
// ─────────────────────────────────────────────────────────────────────────────

const crossLayerResults = await memory.query('GitHub Actions CI pipeline', {
  layers: ['episodic', 'semantic', 'procedural'],
  limit: 5,
  minScore: 0.3,
});

console.log(
  `\n🔀 Cross-layer query for "GitHub Actions CI pipeline" — found ${crossLayerResults.length} result(s):`
);
for (const r of crossLayerResults) {
  console.log(`   • [${r.layer}] score=${r.score.toFixed(2)} — ${r.entry.content.slice(0, 60)}…`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. List Recent Episodic Entries
// ─────────────────────────────────────────────────────────────────────────────

const recentEpisodic = await memory.list('episodic', { limit: 10 });

console.log(`\n📋 Recent episodic entries (${recentEpisodic.length} shown):`);
for (const entry of recentEpisodic) {
  console.log(`   • ${entry.id} — ${entry.createdAt.toISOString()}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. Get a Specific Memory by ID
// ─────────────────────────────────────────────────────────────────────────────

const fetched = await memory.get(sessionMemory.id, 'episodic');
console.log('\n📄 Fetched memory by ID:');
console.log(`   Content: ${fetched?.content}`);
console.log(`   Tags:    ${fetched?.tags?.join(', ')}`);

// ─────────────────────────────────────────────────────────────────────────────
// 9. Update a Memory Entry
// ─────────────────────────────────────────────────────────────────────────────

const updated = await memory.update(sessionMemory.id, 'episodic', {
  content: 'User asked about setting up a CI pipeline with GitHub Actions. Walked them through a basic YAML config with Node.js matrix strategy. Follow-up scheduled.',
  metadata: {
    followUp: true,
    followUpDate: '2025-02-01',
  },
});

console.log('\n✏️  Updated memory:');
console.log(`   New content: ${updated?.content}`);
console.log(`   Follow-up:   ${updated?.metadata?.followUp}`);

// ─────────────────────────────────────────────────────────────────────────────
// 10. Delete a Memory
// ─────────────────────────────────────────────────────────────────────────────

await memory.delete(updated!.id, 'episodic');
console.log('\n🗑️  Deleted memory', updated!.id);

// ─────────────────────────────────────────────────────────────────────────────
// 11. Memory Statistics
// ─────────────────────────────────────────────────────────────────────────────

const stats = await memory.stats();
console.log('\n📊 Memory store statistics:');
console.log(`   Episodic:    ${stats.episodic.stored} entries`);
console.log(`   Semantic:    ${stats.semantic.stored} entries`);
console.log(`   Procedural:  ${stats.procedural.stored} entries`);
console.log(`   Total:       ${stats.total} entries\n');

console.log('✅ All basic operations demonstrated successfully!');
