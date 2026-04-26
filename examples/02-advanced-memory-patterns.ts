/**
 * Example 02 — Advanced Memory Patterns
 *
 * Demonstrates advanced usage of pi-agent-mind:
 * - Batch operations for bulk memory ingestion
 * - Memory expiration and TTL
 * - Cross-layer relationship linking
 * - Custom query filters and scoring
 * - Session windowing for long conversations
 * - Memory persistence and hydration
 *
 * Run with: npx tsx examples/02-advanced-memory-patterns.ts
 */

import {
  MemoryEngine,
  MemoryEntry,
  MemoryLayer,
  CrossLayerResult,
} from '../src/index.js';

// ─────────────────────────────────────────────────────────────────────────────
// Utility: Sleep helper
// ─────────────────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ─────────────────────────────────────────────────────────────────────────────
// 1. Batch Memory Ingestion
//    Load many memories efficiently with batchStore()
// ─────────────────────────────────────────────────────────────────────────────

const memory = new MemoryEngine();

const batchEntries: Array<MemoryEntry & { layer: MemoryLayer }> = [
  // Semantic facts about a project
  { type: 'semantic', layer: 'semantic', content: 'The payment gateway uses Stripe API v2023', tags: ['stripe', 'payments'] },
  { type: 'semantic', layer: 'semantic', content: 'Auth is handled by JWT with RS256 algorithm', tags: ['auth', 'jwt'] },
  { type: 'semantic', layer: 'semantic', content: 'Database is PostgreSQL 15 with TimescaleDB extension', tags: ['database', 'postgresql'] },
  { type: 'semantic', layer: 'semantic', content: 'Frontend is a Next.js 14 app with App Router', tags: ['frontend', 'nextjs'] },
  { type: 'semantic', layer: 'semantic', content: 'CDN is Cloudflare with edge caching enabled', tags: ['cdn', 'cloudflare'] },

  // Procedural skills
  { type: 'procedural', layer: 'procedural', content: 'To deploy: run `npm run build`, then `npm run deploy -- --env=production`', tags: ['deploy'] },
  { type: 'procedural', layer: 'procedural', content: 'To run migrations: `npm run db:migrate` (requires DB_URL env var)', tags: ['database', 'migrations'] },
  { type: 'procedural', layer: 'procedural', content: 'To add a new API route: create src/app/api/<name>/route.ts with GET/POST handlers', tags: ['api', 'nextjs'] },

  // Episodic memories from sessions
  { type: 'episodic', layer: 'episodic', content: 'Sprint planning: team committed to 40 story points. 3 blockers identified.', tags: ['sprint', 'planning'], metadata: { sprintNumber: 12 } },
  { type: 'episodic', layer: 'episodic', content: 'Refactored payment module — reduced error rate from 3% to 0.2%.', tags: ['refactor', 'payments'], metadata: { impact: 'high' } },
];

const batchResult = await memory.batchStore(batchEntries);

console.log(`📦 Batch store complete:`);
console.log(`   Total:    ${batchResult.total}`);
console.log(`   Stored:   ${batchResult.stored}`);
console.log(`   Failed:   ${batchResult.failed.length}`);
console.log(`   Duration: ${batchResult.durationMs}ms\n`);

// ─────────────────────────────────────────────────────────────────────────────
// 2. Memory with TTL (Time-To-Live)
//    Short-term memories that expire automatically
// ─────────────────────────────────────────────────────────────────────────────

const ephemeralMemory = new MemoryEngine({
  episodic: { maxEntries: 100 },
  semantic: { maxEntries: 500 },
  procedural: { maxEntries: 100 },
});

const shortLived = await ephemeralMemory.store(
  {
    type: 'episodic',
    content: 'User is currently browsing the pricing page',
    tags: ['session', 'browsing'],
    metadata: { page: '/pricing' },
  },
  'episodic',
  { expiresInMs: 30 * 60 * 1000 } // 30 minutes TTL
);

console.log(`⏱️  Ephemeral memory stored (TTL: 30 min):`);
console.log(`   ID:       ${shortLived.id}`);
console.log(`   Expires:  ${shortLived.expiresAt?.toISOString()}\n`);

// ─────────────────────────────────────────────────────────────────────────────
// 3. Cross-Layer Relationship Linking
//    Connect memories across layers for richer context
// ─────────────────────────────────────────────────────────────────────────────

// Find a semantic memory about Stripe payments
const stripeFact = await memory.query('Stripe API payment', { layers: ['semantic'], limit: 1 });
if (stripeFact.length > 0) {
  // Link it to the related procedural memory about deployments
  const deployProc = await memory.query('deploy production', { layers: ['procedural'], limit: 1 });

  if (deployProc.length > 0) {
    const linked = await memory.link(
      stripeFact[0].entry.id, 'semantic',
      deployProc[0].entry.id, 'procedural',
      'related'
    );
    console.log(`🔗 Linked two memories:`);
    console.log(`   From: ${linked.sourceId} [semantic]`);
    console.log(`   To:   ${linked.targetId} [procedural]`);
    console.log(`   Rel:  ${linked.relationship}`);
    console.log(`   ID:   ${linked.id}\n`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Advanced Query with Filters
//    Use custom scoring and metadata filters
// ─────────────────────────────────────────────────────────────────────────────

const advancedResults = await memory.query('database migration', {
  layers: ['semantic', 'procedural'],
  limit: 10,
  minScore: 0.1,
  filters: {
    tags: ['database'],
  },
  scoreWeights: {
    text: 0.6,
    tags: 0.3,
    metadata: 0.1,
  },
});

console.log(`🔎 Advanced query (database + migrations):`);
for (const r of advancedResults) {
  console.log(`   [${r.layer}] score=${r.score.toFixed(3)} tags=[${r.entry.tags?.join(', ')}]`);
  console.log(`      ${r.entry.content.slice(0, 80)}…`);
}
console.log();

// ─────────────────────────────────────────────────────────────────────────────
// 5. Session Windowing
//    Focus on memories from a specific conversation session
// ─────────────────────────────────────────────────────────────────────────────

const sessionId = 'sess-2025-w10';
const sessionMemories = await memory.getBySession(sessionId);

console.log(`💬 Session "${sessionId}" memories (${sessionMemories.length} found):`);
for (const m of sessionMemories) {
  console.log(`   • [${m.layer}] ${m.entry.content.slice(0, 70)}…`);
}

// Add session metadata for windowing
const windowed = await memory.queryWithinSession(sessionId, 'API route', {
  layers: ['procedural'],
  limit: 5,
});

console.log(`\n🔍 Within session "${sessionId}", searching "API route": ${windowed.length} result(s)`);

// ─────────────────────────────────────────────────────────────────────────────
// 6. Memory Persistence
//    Save to / load from disk for durability
// ─────────────────────────────────────────────────────────────────────────────

import { writeFile, readFile } from 'fs/promises';

const snapshotPath = './memory-snapshot.json';

await memory.persist(snapshotPath);
console.log(`\n💾 Memory persisted to: ${snapshotPath}`);

// Simulate reload — create new engine and hydrate from disk
const rehydrated = new MemoryEngine();
await rehydrated.hydrate(snapshotPath);

const hydratedCount = await rehydrated.stats();
console.log(`♻️  Memory rehydrated — total entries: ${hydratedCount.total}`);

// ─────────────────────────────────────────────────────────────────────────────
// 7. Memory Eviction & Cleanup
//    Manually trigger eviction when approaching limits
// ─────────────────────────────────────────────────────────────────────────────

const smallMemory = new MemoryEngine({
  episodic: { maxEntries: 3 },
  semantic: { maxEntries: 3 },
  procedural: { maxEntries: 3 },
});

// Add more entries than the limit to trigger eviction
for (let i = 1; i <= 5; i++) {
  await smallMemory.store(
    { type: 'semantic', content: `Fact number ${i} about the project`, tags: ['fact'] },
    'semantic'
  );
}

const postEvictionStats = await smallMemory.stats();
console.log(`\n🧹 After eviction (max=3): ${postEvictionStats.semantic.stored} semantic entries retained`);

// ─────────────────────────────────────────────────────────────────────────────
// 8. Memory Pruning by Age
//    Remove memories older than a given threshold
// ─────────────────────────────────────────────────────────────────────────────

const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
const pruned = await memory.prune({ olderThan: sevenDaysAgo, layers: ['episodic'] });

console.log(`\n🗂️  Pruned episodic memories older than 7 days: ${pruned.count} removed`);
console.log(`   By layer:`, pruned.byLayer);

// ─────────────────────────────────────────────────────────────────────────────
// 9. Memory Export for Analytics
//    Export full memory state as JSON for external processing
// ─────────────────────────────────────────────────────────────────────────────

const exportData = await memory.export({ format: 'json', includeMetadata: true });
console.log(`\n📤 Export summary:`);
console.log(`   Format:    ${exportData.format}`);
console.log(`   Exported:  ${exportData.totalEntries} entries`);
console.log(`   Layers:   `, exportData.layers);
console.log(`   Size:     ${exportData.sizeBytes} bytes`);

// ─────────────────────────────────────────────────────────────────────────────
// 10. Cleanup temp snapshot file
// ─────────────────────────────────────────────────────────────────────────────

try {
  await writeFile(snapshotPath, '');
  await sleep(50);
} catch {
  // snapshot already handled
}

console.log('\n✅ All advanced patterns demonstrated successfully!');
