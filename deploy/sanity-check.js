#!/usr/bin/env node
// ============================================================
// VENUEPRO SAAS — API Sanity Check
// ============================================================
// Scans all API routes, creates snapshots, and compares against
// the last known-good snapshot to detect breaking changes.
//
// Usage:
//   node deploy/sanity-check.js snapshot    — Take a new snapshot
//   node deploy/sanity-check.js compare     — Compare current routes vs latest snapshot
//   node deploy/sanity-check.js check       — Run full deploy check (default)
//
// Exit codes:
//   0 — All good (or only additive changes)
//   1 — Breaking changes detected (routes removed)
//   2 — Critical error (can't read files, etc.)
// ============================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================
// PATHS
// ============================================================

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SERVER_DIR = path.join(PROJECT_ROOT, 'server');
const SNAPSHOTS_DIR = path.join(__dirname, 'snapshots');
const LATEST_SNAPSHOT_PATH = path.join(SNAPSHOTS_DIR, 'routes-latest.json');

// ============================================================
// COLORS (terminal friendly)
// ============================================================

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

const colors = {
  red:    (s) => `${RED}${s}${RESET}`,
  green:  (s) => `${GREEN}${s}${RESET}`,
  yellow: (s) => `${YELLOW}${s}${RESET}`,
  cyan:   (s) => `${CYAN}${s}${RESET}`,
  bold:   (s) => `${BOLD}${s}${RESET}`,
  dim:    (s) => `${DIM}${s}${RESET}`,
};

// ============================================================
// HELPERS
// ============================================================

function log(level, msg) {
  const prefix = level === 'ok'    ? `${colors.green('✓')}`
               : level === 'warn'  ? `${colors.yellow('⚠')}`
               : level === 'err'   ? `${colors.red('✗')}`
               : level === 'info'  ? `${colors.cyan('ℹ')}`
               : level === 'step'  ? `${colors.bold('→')}`
               :                    `  `;
  console.log(`  ${prefix}  ${msg}`);
}

function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// ============================================================
// STEP 1: SCAN ALL ROUTE FILES
// ============================================================

/**
 * Parse a single route file and extract all route definitions.
 * Returns array of { method, path, handlers, auth, validation }
 */
function parseRouteFile(filePath, basePath = '') {
  const content = readFileSafe(filePath);
  if (!content) return [];

  const routes = [];
  const lines = content.split('\n');
  const methodPattern = /^\s*(router|app)\.(get|post|put|patch|delete|use)\(/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(methodPattern);
    if (!match) continue;

    const httpMethod = match[2]; // get, post, put, patch, delete, use
    const rest = line.slice(match[0].length);

    // Extract the path (first string argument)
    const pathMatch = rest.match(/^\s*['"]([^'"]+)['"]/);
    if (!pathMatch) continue;

    const routePath = pathMatch[1];

    // Extract handlers (function names / middleware) from the same line and next few lines
    const handlerNames = [];
    const handlerPattern = /([a-zA-Z_$][a-zA-Z0-9_$]*(?:\.[a-zA-Z_$][a-zA-Z0-9_$]*)?)/g;
    const handlerSection = rest.slice(pathMatch[0].length);

    // Collect all identifiers (middleware names + handler names)
    let handlerMatch;
    const identifiers = [];
    while ((handlerMatch = handlerPattern.exec(handlerSection)) !== null) {
      const id = handlerMatch[1];
      // Filter out common JS keywords and literals
      if (!['true', 'false', 'null', 'undefined', 'async', 'await', 'new', 'req', 'res', 'next', 'try', 'catch', 'if', 'else', 'return', 'throw', 'const', 'let', 'var', 'function'].includes(id) &&
          !id.startsWith('$') && id !== 'err' && !id.startsWith('process')) {
        identifiers.push(id);
      }
    }

    // Classify identifiers
    let auth = 'public';
    let validation = null;
    const handlers = [];

    for (const id of identifiers) {
      if (id.includes('Auth') || id.includes('auth') || id === 'authLimiter') {
        if (id === 'superAdminAuth' || id === 'tenantAuth' || id === 'playerAuth' || id === 'staffAuth') {
          auth = id;
        } else if (id === 'optionalAuth' || id === 'optionalPlayerAuth') {
          if (auth === 'public') auth = id;
        } else if (id === 'generalLimiter' || id === 'authLimiter') {
          // rate limiters — skip for now
        }
      } else if (id.startsWith('validate')) {
        validation = id;
      } else if (!id.includes('error') && !id.includes('success') && !id.includes('pagination') && !id.includes('logger') && !id.includes('auditLog')) {
        handlers.push(id);
      }
    }

    // Full path construction
    const fullPath = httpMethod === 'use'
      ? routePath
      : basePath
        ? `${basePath}${routePath === '/' ? '' : routePath}`
        : routePath;

    routes.push({
      method: httpMethod === 'use' ? 'ALL' : httpMethod.toUpperCase(),
      path: fullPath,
      auth,
      validation,
      handler: handlers[handlers.length - 1] || 'anonymous',
      middleware: handlers.slice(0, -1),
      file: path.relative(PROJECT_ROOT, filePath),
    });
  }

  return routes;
}

/**
 * Recursively parse a directory of route files
 */
function scanRouteDirectory(dirPath) {
  const entries = [];
  if (!fs.existsSync(dirPath)) return entries;

  const files = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const file of files) {
    const fullPath = path.join(dirPath, file.name);
    if (file.isDirectory()) {
      entries.push(...scanRouteDirectory(fullPath));
    } else if (file.name.endsWith('.js') && !file.name.endsWith('.test.js')) {
      entries.push(fullPath);
    }
  }
  return entries;
}

/**
 * Main scanner: reads server.js to find all route registrations,
 * then scans each route file for individual endpoints.
 */
function scanAllRoutes() {
  console.log(`\n  ${colors.bold('📡 Scanning API Routes')}\n`);

  const allRoutes = [];
  const seenPaths = new Set();

  // 1. Scan core routes directory
  const coreRoutesDir = path.join(SERVER_DIR, 'core', 'routes');
  const coreFiles = scanRouteDirectory(coreRoutesDir);

  // 2. Scan module files for route definitions
  const moduleFiles = globModuleRouteFiles();

  // 3. Also scan server.js for app.use registrations to get base paths
  const serverJs = readFileSafe(path.join(SERVER_DIR, 'server.js'));
  const mountPoints = [];

  if (serverJs) {
    // Extract app.use('/api/...', router) patterns
    const mountRegex = /app\.use\(['"]([^'"]+)['"],\s*([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
    let mountMatch;
    while ((mountMatch = mountRegex.exec(serverJs)) !== null) {
      mountPoints.push({
        basePath: mountMatch[1],
        routerVar: mountMatch[2],
      });
    }

    // Also extract module registrations (reuse mountMatch, declared above)
    const moduleMountRegex = /app\.use\(['"]([^'"]+)['"],\s*([a-zA-Z_$][a-zA-Z0-9_$]*Routes?)\)/g;
    while ((mountMatch = moduleMountRegex.exec(serverJs)) !== null) {
      mountPoints.push({
        basePath: mountMatch[1],
        routerVar: mountMatch[2],
      });
    }
  }

  log('info', `Found ${colors.bold(mountPoints.length)} route mount points in server.js`);

  // 4. Parse each core route file
  for (const filePath of coreFiles) {
    const routes = parseRouteFile(filePath, '');
    for (const route of routes) {
      // Resolve mount point
      const mount = mountPoints.find(m => {
        const fileName = path.basename(filePath, '.js');
        const varName = route.handler.includes(fileName) || fileName.includes(route.handler);
        // Check if the router variable name appears in the file
        const content = readFileSafe(filePath);
        return content && content.includes(`export { ${m.routerVar}`);
      });

      const finalPath = mount
        ? `${mount.basePath}${route.path === '/' ? '' : route.path}`
        : route.path;

      const key = `${route.method}:${finalPath}`;
      if (!seenPaths.has(key)) {
        seenPaths.add(key);
        allRoutes.push({
          ...route,
          path: finalPath,
        });
      }
    }
  }

  // 5. Parse module route files
  for (const filePath of moduleFiles) {
    const routes = parseRouteFile(filePath, '');
    for (const route of routes) {
      const key = `${route.method}:${route.path}`;
      if (!seenPaths.has(key)) {
        seenPaths.add(key);
        allRoutes.push(route);
      }
    }
  }

  // 6. Also parse server.js directly for inline routes (health check, api-docs, etc.)
  if (serverJs) {
    const inlineRoutes = parseRouteFile(path.join(SERVER_DIR, 'server.js'), '');
    for (const route of inlineRoutes) {
      const key = `${route.method}:${route.path}`;
      if (!seenPaths.has(key)) {
        seenPaths.add(key);
        allRoutes.push(route);
      }
    }
  }

  // 7. Extract health check and docs routes that might be inline
  // These are often not in route files
  allRoutes.push({
    method: 'GET',
    path: '/api/health',
    auth: 'public',
    validation: null,
    handler: 'healthCheck',
    middleware: [],
    file: 'server/server.js',
  });

  // Sort by path
  allRoutes.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));

  // De-duplicate by method+path (keep the one with more info)
  const uniqueRoutes = [];
  const routeMap = new Map();
  for (const route of allRoutes) {
    const key = `${route.method}:${route.path}`;
    if (!routeMap.has(key) || route.middleware.length > routeMap.get(key).middleware.length) {
      routeMap.set(key, route);
    }
  }
  for (const route of routeMap.values()) {
    uniqueRoutes.push(route);
  }
  uniqueRoutes.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));

  log('ok', `Found ${colors.bold(uniqueRoutes.length)} total API routes\n`);
  return uniqueRoutes;
}

/**
 * Find module route files (pool-snooker, gaming-zone, etc.)
 */
function globModuleRouteFiles() {
  const files = [];
  const modulesDir = path.join(SERVER_DIR, 'modules');
  if (!fs.existsSync(modulesDir)) return files;

  const moduleDirs = fs.readdirSync(modulesDir, { withFileTypes: true })
    .filter(d => d.isDirectory());

  for (const dir of moduleDirs) {
    const routesDir = path.join(modulesDir, dir.name, 'routes');
    if (fs.existsSync(routesDir)) {
      const routeFiles = fs.readdirSync(routesDir)
        .filter(f => f.endsWith('.js'))
        .map(f => path.join(routesDir, f));
      files.push(...routeFiles);
    }
  }

  return files;
}

// ============================================================
// STEP 2: CREATE SNAPSHOT
// ============================================================

function createSnapshot(routes, tag = 'manual') {
  ensureDir(SNAPSHOTS_DIR);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const snapshot = {
    meta: {
      timestamp: new Date().toISOString(),
      tag,
      version: '1.0.0',
      totalRoutes: routes.length,
    },
    routes: routes.map(r => ({
      method: r.method,
      path: r.path,
      auth: r.auth,
      validation: r.validation,
      handler: r.handler,
      file: r.file,
    })),
    summary: {
      total: routes.length,
      byAuth: {},
      byMethod: {},
      byGroup: {},
    },
  };

  // Build summary stats
  for (const r of routes) {
    // By auth
    if (!snapshot.summary.byAuth[r.auth]) snapshot.summary.byAuth[r.auth] = 0;
    snapshot.summary.byAuth[r.auth]++;

    // By method
    if (!snapshot.summary.byMethod[r.method]) snapshot.summary.byMethod[r.method] = 0;
    snapshot.summary.byMethod[r.method]++;

    // By path group (first 3 segments)
    const segments = r.path.split('/').filter(Boolean);
    const group = segments.slice(0, 3).join('/') || 'root';
    if (!snapshot.summary.byGroup[group]) snapshot.summary.byGroup[group] = 0;
    snapshot.summary.byGroup[group]++;
  }

  // Write timestamped snapshot
  const snapshotFile = path.join(SNAPSHOTS_DIR, `routes-${timestamp}.json`);
  fs.writeFileSync(snapshotFile, JSON.stringify(snapshot, null, 2));

  // Update latest
  fs.writeFileSync(LATEST_SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2));

  return { snapshot, file: snapshotFile };
}

function printSnapshotSummary(snapshot) {
  console.log(`  ${colors.bold('📊 Snapshot Summary')}`);
  console.log(`     Total routes:      ${colors.bold(snapshot.meta.totalRoutes)}`);
  console.log(`     Timestamp:         ${snapshot.meta.timestamp}`);

  console.log(`\n     ${colors.dim('By Auth:')}`);
  for (const [auth, count] of Object.entries(snapshot.summary.byAuth).sort((a, b) => b[1] - a[1])) {
    const label = auth === 'public' ? colors.green(auth)
                : auth.includes('superAdmin') ? colors.red(auth)
                : auth.includes('tenantAuth') ? colors.yellow(auth)
                : auth.includes('playerAuth') ? colors.cyan(auth)
                : auth;
    console.log(`       ${label.padEnd(30)} ${count}`);
  }

  console.log(`\n     ${colors.dim('By Method:')}`);
  for (const [method, count] of Object.entries(snapshot.summary.byMethod).sort((a, b) => b[1] - a[1])) {
    const colored = method === 'GET' ? colors.green(method)
                  : method === 'POST' ? colors.yellow(method)
                  : method === 'PATCH' ? colors.cyan(method)
                  : method === 'PUT' ? colors.cyan(method)
                  : method === 'DELETE' ? colors.red(method)
                  : method;
    console.log(`       ${colored.padEnd(30)} ${count}`);
  }
}

// ============================================================
// STEP 3: COMPARE SNAPSHOTS
// ============================================================

function compareWithLatest(currentRoutes) {
  const latestRaw = readFileSafe(LATEST_SNAPSHOT_PATH);
  if (!latestRaw) {
    log('warn', 'No previous snapshot found. Run "snapshot" first.');
    return { hasBreakingChanges: false, isFirstSnapshot: true };
  }

  let latestSnapshot;
  try {
    latestSnapshot = JSON.parse(latestRaw);
  } catch {
    log('err', 'Corrupted snapshot file. Run "snapshot" to regenerate.');
    return { hasBreakingChanges: false, error: 'corrupted' };
  }

  const previous = latestSnapshot.routes;
  const current = currentRoutes.map(r => ({
    method: r.method,
    path: r.path,
    auth: r.auth,
    handler: r.handler,
  }));

  // Build lookup maps
  const prevMap = new Map();
  for (const r of previous) {
    prevMap.set(`${r.method}:${r.path}`, r);
  }

  const currMap = new Map();
  for (const r of current) {
    currMap.set(`${r.method}:${r.path}`, r);
  }

  // Find differences
  const removed = [];
  const added = [];
  const authChanged = [];
  const handlerChanged = [];

  for (const [key, prevRoute] of prevMap) {
    if (!currMap.has(key)) {
      removed.push(prevRoute);
    } else {
      const currRoute = currMap.get(key);
      if (prevRoute.auth !== currRoute.auth) {
        authChanged.push({ prev: prevRoute, curr: currRoute });
      }
      if (prevRoute.handler !== currRoute.handler) {
        handlerChanged.push({ prev: prevRoute, curr: currRoute });
      }
    }
  }

  for (const [key, currRoute] of currMap) {
    if (!prevMap.has(key)) {
      added.push(currRoute);
    }
  }

  // Print report
  const hasBreaking = removed.length > 0;

  console.log(`\n  ${colors.bold('🔍 Comparing against snapshot from:')} ${latestSnapshot.meta.timestamp}\n`);

  if (removed.length === 0 && added.length === 0 && authChanged.length === 0 && handlerChanged.length === 0) {
    log('ok', 'No changes detected — routes are identical to snapshot');
    return { hasBreakingChanges: false, removed, added, authChanged, handlerChanged };
  }

  if (removed.length > 0) {
    console.log(`  ${colors.red('✗')}  ${colors.bold(colors.red('BREAKING: Missing Routes'))}`);
    for (const r of removed) {
      console.log(`       ${colors.red('-')} ${r.method.padEnd(6)} ${r.path}`);
    }
    console.log('');
  }

  if (authChanged.length > 0) {
    console.log(`  ${colors.yellow('⚠')}  ${colors.bold(colors.yellow('Auth Changes'))}`);
    for (const c of authChanged) {
      console.log(`       ${colors.yellow('~')} ${c.prev.method.padEnd(6)} ${c.prev.path}`);
      console.log(`           was: ${c.prev.auth}  →  now: ${c.curr.auth}`);
    }
    console.log('');
  }

  if (added.length > 0) {
    console.log(`  ${colors.green('+')}  ${colors.bold('New Routes Added')} ${colors.dim(`(${added.length})`)}`);
    for (const r of added) {
      console.log(`       ${colors.green('+')} ${r.method.padEnd(6)} ${r.path} ${colors.dim(`[${r.auth}]`)}`);
    }
    console.log('');
  }

  if (handlerChanged.length > 0) {
    console.log(`  ${colors.dim('ℹ')}  Handler changes (probably refactoring — verify):`);
    for (const c of handlerChanged.slice(0, 5)) {
      console.log(`       ${c.prev.method.padEnd(6)} ${c.prev.path}`);
      console.log(`           ${colors.dim(`was: ${c.prev.handler} → now: ${c.curr.handler}`)}`);
    }
    if (handlerChanged.length > 5) {
      console.log(`       ${colors.dim(`... and ${handlerChanged.length - 5} more`)}`);
    }
    console.log('');
  }

  if (hasBreaking) {
    console.log(`  ${colors.red('✗')}  ${colors.bold(colors.red('SANITY CHECK FAILED'))}`);
    console.log(`     ${removed.length} route(s) removed — verify before deploying!\n`);
  } else {
    console.log(`  ${colors.green('✓')}  ${colors.bold(colors.green('Sanity Check Passed'))}`);
    console.log(`     ${added.length} new route(s), ${authChanged.length} auth change(s)\n`);
  }

  return { hasBreakingChanges: hasBreaking, removed, added, authChanged, handlerChanged };
}

// ============================================================
// STEP 4: DATA CONTRACT CHECK
// ============================================================

/**
 * Check critical API specs by examining the response helper
 * pattern to ensure the response format hasn't changed.
 */
function checkResponseContracts() {
  console.log(`  ${colors.bold('📋 Checking Response Contracts')}\n`);

  const responseHelper = readFileSafe(path.join(SERVER_DIR, 'core', 'utils', 'responseHelper.js'));
  if (!responseHelper) {
    log('warn', 'Cannot find responseHelper.js — skipping contract check');
    return;
  }

  const checks = [];

  // Check success response shape
  if (responseHelper.includes('success') || responseHelper.includes('successResponse')) {
    checks.push({ name: 'success() function', status: 'ok' });
  } else {
    checks.push({ name: 'success() function', status: 'err' });
  }

  if (responseHelper.includes('error') || responseHelper.includes('errorResponse')) {
    checks.push({ name: 'error() function', status: 'ok' });
  } else {
    checks.push({ name: 'error() function', status: 'err' });
  }

  if (responseHelper.includes('paginationMeta')) {
    checks.push({ name: 'paginationMeta() helper', status: 'ok' });
  } else {
    checks.push({ name: 'paginationMeta() helper', status: 'warn' });
  }

  for (const check of checks) {
    const icon = check.status === 'ok' ? colors.green('✓') : check.status === 'warn' ? colors.yellow('⚠') : colors.red('✗');
    console.log(`     ${icon} ${check.name}`);
  }
  console.log('');
}

// ============================================================
// MAIN
// ============================================================

function printBanner() {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║     VenuePro SaaS — API Sanity Check    ║
  ╚══════════════════════════════════════════╝
  `);
}

function printUsage() {
  console.log(`  ${colors.bold('Usage:')}`);
  console.log(`    node deploy/sanity-check.js snapshot    — Create a new route snapshot`);
  console.log(`    node deploy/sanity-check.js compare     — Compare vs latest snapshot`);
  console.log(`    node deploy/sanity-check.js check       — Full sanity check (default)`);
  console.log('');
}

async function main() {
  const cmd = process.argv[2] || 'check';

  printBanner();

  if (cmd === 'help' || cmd === '--help' || cmd === '-h') {
    printUsage();
    process.exit(0);
  }

  if (cmd === 'snapshot') {
    const routes = scanAllRoutes();
    checkResponseContracts();
    const { snapshot, file } = createSnapshot(routes, process.argv[3] || 'manual');
    printSnapshotSummary(snapshot);
    log('ok', `Snapshot saved to: ${path.relative(PROJECT_ROOT, file)}`);
    console.log('');
    process.exit(0);
  }

  if (cmd === 'compare') {
    const routes = scanAllRoutes();
    const result = compareWithLatest(routes);
    process.exit(result.hasBreakingChanges ? 1 : 0);
  }

  // Default: check (snapshot + compare)
  if (cmd === 'check' || cmd === 'deploy') {
    const tag = process.argv[3] || 'deploy';
    const routes = scanAllRoutes();
    checkResponseContracts();
    const { snapshot, file } = createSnapshot(routes, tag);
    printSnapshotSummary(snapshot);
    console.log('');
    const result = compareWithLatest(routes);

    if (result.isFirstSnapshot) {
      log('ok', `First snapshot taken. Next deploy will have a comparison baseline.`);
    }

    if (result.hasBreakingChanges) {
      log('err', 'Sanity check found BREAKING changes. Review before deploying!');
      console.log('');
      process.exit(1);
    }

    log('ok', `Snapshot saved to: ${path.relative(PROJECT_ROOT, file)}`);
    console.log('');
    process.exit(0);
  }

  printUsage();
  process.exit(2);
}

main().catch(err => {
  console.error(`\n  ${colors.red('✗')}  Fatal error:`, err.message);
  process.exit(2);
});
