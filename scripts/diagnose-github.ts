import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export interface DiagnosticResult {
  step: string;
  status: "PASS" | "WARN" | "FAIL" | "INFO";
  message: string;
  details?: Record<string, unknown> | string;
}

export interface DiagnosticReport {
  timestamp: string;
  summary: {
    total: number;
    passed: number;
    warnings: number;
    failed: number;
  };
  results: DiagnosticResult[];
  recommendations: string[];
}

/**
 * Masks sensitive token keeping prefix and length hints
 */
export function maskToken(token?: string | null): string {
  if (!token) return "(not provided)";
  if (token.length <= 10) return "********";
  const prefix = token.slice(0, 12);
  const suffix = token.slice(-4);
  return `${prefix}...${suffix} (${token.length} chars)`;
}

/**
 * Categorizes GitHub Token format
 */
export function identifyTokenType(token: string): string {
  if (token.startsWith("github_pat_")) return "Fine-Grained Personal Access Token (PAT v2)";
  if (token.startsWith("ghp_")) return "Classic Personal Access Token";
  if (token.startsWith("gho_")) return "GitHub OAuth Access Token";
  if (token.startsWith("ghu_")) return "GitHub User-to-Server Token";
  if (token.startsWith("ghs_")) return "GitHub App Server-to-Server Token";
  if (token.startsWith("ghr_")) return "GitHub Refresh Token";
  return "Custom/Unknown Token format";
}

/**
 * Runs the full GitHub connectivity & authentication diagnostic suite
 */
export async function runGitHubDiagnostics(options: {
  token?: string;
  repository?: string;
  branch?: string;
  targetDir?: string;
} = {}): Promise<DiagnosticReport> {
  const results: DiagnosticResult[] = [];
  const recommendations: string[] = [];
  const cwd = options.targetDir || process.cwd();

  const token = options.token || process.env.GITHUB_TOKEN || process.env.GH_TOKEN || process.env.GITHUB_PAT;
  let repoTarget = options.repository || process.env.GITHUB_REPOSITORY;
  const targetBranch = options.branch || "main";

  // ──────────────────────────────────────────────────────────
  // Step 1: Internet & GitHub API Reachability
  // ──────────────────────────────────────────────────────────
  try {
    const startTime = Date.now();
    const res = await fetch("https://api.github.com/zen", {
      headers: {
        "User-Agent": "AI-Studio-GitHub-Diagnostic/1.0",
      },
    });
    const latency = Date.now() - startTime;
    const zen = await res.text();
    const edgeRegion = res.headers.get("x-github-edge-region") || "unknown";
    const reqId = res.headers.get("x-github-request-id") || "none";

    results.push({
      step: "1. GitHub API Reachability",
      status: "PASS",
      message: `Successfully connected to GitHub API (${latency}ms, edge region: ${edgeRegion})`,
      details: {
        statusCode: res.status,
        latencyMs: latency,
        edgeRegion,
        requestId: reqId,
        zenQuote: zen.trim(),
      },
    });
  } catch (err: any) {
    results.push({
      step: "1. GitHub API Reachability",
      status: "FAIL",
      message: `Failed to reach https://api.github.com: ${err.message}`,
      details: err.stack,
    });
    recommendations.push("Verify network connectivity or DNS resolution to api.github.com.");
  }

  // ──────────────────────────────────────────────────────────
  // Step 2: Rate Limit Verification
  // ──────────────────────────────────────────────────────────
  try {
    const headers: Record<string, string> = {
      "User-Agent": "AI-Studio-GitHub-Diagnostic/1.0",
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch("https://api.github.com/rate_limit", { headers });
    const rateData = (await res.json()) as any;

    if (res.ok && rateData?.resources?.core) {
      const core = rateData.resources.core;
      const resetDate = new Date(core.reset * 1000).toISOString();
      const isExhausted = core.remaining === 0;

      results.push({
        step: "2. GitHub API Rate Limit",
        status: isExhausted ? "FAIL" : core.remaining < 5 ? "WARN" : "PASS",
        message: `Rate limit: ${core.remaining}/${core.limit} requests remaining. Resets at ${resetDate}`,
        details: {
          remaining: core.remaining,
          limit: core.limit,
          reset: resetDate,
          authType: token ? "Authenticated (5,000/hr limit)" : "Unauthenticated (60/hr limit)",
        },
      });

      if (isExhausted) {
        recommendations.push(
          `GitHub API rate limit is exhausted. Automated sync will fail until ${resetDate}. Use an authenticated token with sufficient quota.`
        );
      }
    } else {
      results.push({
        step: "2. GitHub API Rate Limit",
        status: "WARN",
        message: `Unexpected response from rate limit endpoint (HTTP ${res.status})`,
      });
    }
  } catch (err: any) {
    results.push({
      step: "2. GitHub API Rate Limit",
      status: "WARN",
      message: `Could not query GitHub rate limit: ${err.message}`,
    });
  }

  // ──────────────────────────────────────────────────────────
  // Step 3: Authentication Headers & Token Validation
  // ──────────────────────────────────────────────────────────
  if (!token) {
    results.push({
      step: "3. Authentication Header Validation",
      status: "WARN",
      message: "No GitHub token detected in environment (GITHUB_TOKEN / GH_TOKEN) or arguments",
      details: "Set GITHUB_TOKEN environment variable or pass --token to validate credentials.",
    });
    recommendations.push(
      "Provide a valid GitHub Personal Access Token (PAT) via GITHUB_TOKEN environment variable or --token argument."
    );
  } else {
    const tokenType = identifyTokenType(token);
    try {
      const authHeaders = {
        "User-Agent": "AI-Studio-GitHub-Diagnostic/1.0",
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
      };

      const res = await fetch("https://api.github.com/user", { headers: authHeaders });
      const oauthScopes = res.headers.get("x-oauth-scopes");
      const acceptedScopes = res.headers.get("x-accepted-oauth-scopes");
      const ssoHeader = res.headers.get("x-github-sso");
      const expHeader = res.headers.get("github-authentication-token-expiration");
      const reqId = res.headers.get("x-github-request-id");

      if (res.status === 200) {
        const user = (await res.json()) as any;
        const scopesList = oauthScopes ? oauthScopes.split(",").map((s) => s.trim()) : [];
        const hasRepoScope = scopesList.includes("repo") || token.startsWith("github_pat_");

        results.push({
          step: "3. Authentication Header Validation",
          status: hasRepoScope ? "PASS" : "WARN",
          message: `Authenticated as @${user.login} (${tokenType}). Active headers validated.`,
          details: {
            user: user.login,
            accountType: user.type,
            tokenType,
            maskedToken: maskToken(token),
            scopesGranted: oauthScopes || "(Fine-grained token: check specific repository permissions)",
            acceptedScopes: acceptedScopes || "All general endpoints",
            ssoEnforcement: ssoHeader || "None",
            tokenExpiration: expHeader || "No expiration header returned",
            requestId: reqId,
          },
        });

        if (!hasRepoScope && scopesList.length > 0) {
          recommendations.push(
            `Token lacks the 'repo' scope (current scopes: ${oauthScopes || "none"}). Pushing code to private repositories requires 'repo' scope.`
          );
        }

        if (ssoHeader) {
          recommendations.push(
            `SAML SSO is enforced by organization: ${ssoHeader}. You must click 'Configure SSO' next to your token on GitHub to authorize it.`
          );
        }
      } else {
        const errBody = await res.text();
        let parsedErr: any = {};
        try {
          parsedErr = JSON.parse(errBody);
        } catch {
          parsedErr = { raw: errBody };
        }

        results.push({
          step: "3. Authentication Header Validation",
          status: "FAIL",
          message: `Authentication failed with HTTP ${res.status}: ${parsedErr.message || errBody}`,
          details: {
            statusCode: res.status,
            tokenType,
            maskedToken: maskToken(token),
            requestId: reqId,
            githubMessage: parsedErr.message,
            documentationUrl: parsedErr.documentation_url,
          },
        });

        if (res.status === 401) {
          recommendations.push(
            "The token is invalid, expired, or was revoked. Please generate a new Personal Access Token on GitHub with 'repo' and 'workflow' scopes."
          );
        } else if (res.status === 403 && (ssoHeader || errBody.includes("SAML"))) {
          recommendations.push(
            "Organization SAML SSO enforcement blocked this token. Authorize your token for your organization at https://github.com/settings/tokens."
          );
        }
      }
    } catch (err: any) {
      results.push({
        step: "3. Authentication Header Validation",
        status: "FAIL",
        message: `Failed while dispatching authentication verification: ${err.message}`,
      });
    }
  }

  // ──────────────────────────────────────────────────────────
  // Step 4: Local Git Workspace & Remote Inspection
  // ──────────────────────────────────────────────────────────
  let hasGitRepo = false;
  try {
    const gitStatus = spawnSync("git", ["rev-parse", "--is-inside-work-tree"], {
      cwd,
      encoding: "utf-8",
    });
    hasGitRepo = gitStatus.status === 0 && gitStatus.stdout.trim() === "true";

    if (hasGitRepo) {
      const remotes = spawnSync("git", ["remote", "-v"], { cwd, encoding: "utf-8" }).stdout.trim();
      const currentBranch = spawnSync("git", ["branch", "--show-current"], {
        cwd,
        encoding: "utf-8",
      }).stdout.trim();

      // Detect repo from remote if not set
      if (!repoTarget && remotes) {
        const match = remotes.match(/github\.com[:/]([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+?)(?:\.git)?\s/);
        if (match) {
          repoTarget = `${match[1]}/${match[2]}`;
        }
      }

      results.push({
        step: "4. Local Git Repository Configuration",
        status: "PASS",
        message: `Local git repository active on branch '${currentBranch || "HEAD"}'`,
        details: {
          currentBranch: currentBranch || "(detached HEAD)",
          remotes: remotes || "(no remotes configured)",
          detectedRepo: repoTarget || "(none detected)",
        },
      });
    } else {
      results.push({
        step: "4. Local Git Repository Configuration",
        status: "INFO",
        message: "No local .git directory found in current working directory.",
        details:
          "In AI Studio container environments, git is usually initialized during the export/sync process or via 'git init'.",
      });
      recommendations.push(
        "To sync manually via Git CLI, run: git init && git remote add origin https://github.com/<owner>/<repo>.git"
      );
    }
  } catch (err: any) {
    results.push({
      step: "4. Local Git Repository Configuration",
      status: "WARN",
      message: `Error inspecting git repository: ${err.message}`,
    });
  }

  // ──────────────────────────────────────────────────────────
  // Step 5: File Tree Integrity (Case Collisions & Large Files)
  // ──────────────────────────────────────────────────────────
  try {
    const collisionCheck = checkCaseCollisions(cwd);
    if (collisionCheck.length > 0) {
      results.push({
        step: "5. File Tree Integrity & Sync Blockers",
        status: "FAIL",
        message: `Detected ${collisionCheck.length} case collision(s) that break GitHub Git Data API synchronization:`,
        details: collisionCheck,
      });
      recommendations.push(
        `Remove or rename duplicate case-conflicting files: ${collisionCheck.map((c) => c.join(" vs ")).join(", ")}`
      );
    } else {
      // Check large files
      const largeFiles = findLargeFiles(cwd, 50 * 1024 * 1024); // > 50MB
      if (largeFiles.length > 0) {
        const fatalFiles = largeFiles.filter((f) => f.sizeMb > 100);
        results.push({
          step: "5. File Tree Integrity & Sync Blockers",
          status: fatalFiles.length > 0 ? "FAIL" : "WARN",
          message:
            fatalFiles.length > 0
              ? `Found ${fatalFiles.length} file(s) exceeding GitHub's 100MB limit (Sync will be rejected)`
              : `Found ${largeFiles.length} file(s) larger than 50MB (GitHub warning threshold)`,
          details: largeFiles,
        });
        recommendations.push(
          "Ensure files larger than 100MB are added to .gitignore or tracked with Git LFS (Large File Storage)."
        );
      } else {
        results.push({
          step: "5. File Tree Integrity & Sync Blockers",
          status: "PASS",
          message: "No case-collision filenames or oversized files (>50MB) detected.",
        });
      }
    }
  } catch (err: any) {
    results.push({
      step: "5. File Tree Integrity & Sync Blockers",
      status: "WARN",
      message: `Failed to inspect file tree: ${err.message}`,
    });
  }

  // ──────────────────────────────────────────────────────────
  // Step 6: Target Repository Connection & Push Permissions
  // ──────────────────────────────────────────────────────────
  if (repoTarget) {
    try {
      const authHeaders: Record<string, string> = {
        "User-Agent": "AI-Studio-GitHub-Diagnostic/1.0",
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      };
      if (token) authHeaders.Authorization = `Bearer ${token}`;

      const res = await fetch(`https://api.github.com/repos/${repoTarget}`, { headers: authHeaders });
      const reqId = res.headers.get("x-github-request-id");

      if (res.status === 200) {
        const repo = (await res.json()) as any;
        const canPush = repo.permissions?.push ?? true;
        const isArchived = repo.archived;
        const isLocked = repo.locked;

        if (isArchived || isLocked) {
          results.push({
            step: "6. Target Repository Status",
            status: "FAIL",
            message: `Repository ${repoTarget} is ${isArchived ? "ARCHIVED" : "LOCKED"}. Push operations are rejected by GitHub.`,
          });
          recommendations.push(`Unarchive repository https://github.com/${repoTarget} in repository settings.`);
        } else if (!canPush && token) {
          results.push({
            step: "6. Target Repository Status",
            status: "FAIL",
            message: `User does NOT have push (write) permissions to repository ${repoTarget}`,
            details: {
              permissions: repo.permissions,
              isPrivate: repo.private,
              defaultBranch: repo.default_branch,
              requestId: reqId,
            },
          });
          recommendations.push(
            `Request Collaborator or Write/Push access to ${repoTarget}, or check if the token's fine-grained permissions grant write access to this repo.`
          );
        } else {
          results.push({
            step: "6. Target Repository Status",
            status: "PASS",
            message: `Repository ${repoTarget} exists and push permission is confirmed`,
            details: {
              fullName: repo.full_name,
              isPrivate: repo.private,
              defaultBranch: repo.default_branch,
              permissions: repo.permissions || "(public unauthenticated view)",
              requestId: reqId,
            },
          });
        }
      } else if (res.status === 404) {
        results.push({
          step: "6. Target Repository Status",
          status: "WARN",
          message: `Repository ${repoTarget} was not found (HTTP 404)`,
          details: {
            possibleCauses: [
              "Repository does not exist yet (sync might attempt to create it)",
              "Repository is private and the token lacks permission to see it",
              "Repository name is misspelled",
            ],
            requestId: reqId,
          },
        });
        recommendations.push(
          `If ${repoTarget} is a private repository, ensure the token has 'repo' scope to access it.`
        );
      } else {
        const errText = await res.text();
        results.push({
          step: "6. Target Repository Status",
          status: "FAIL",
          message: `Error checking repository ${repoTarget} (HTTP ${res.status}): ${errText}`,
        });
      }
    } catch (err: any) {
      results.push({
        step: "6. Target Repository Status",
        status: "WARN",
        message: `Failed to connect to repository ${repoTarget}: ${err.message}`,
      });
    }
  } else {
    results.push({
      step: "6. Target Repository Status",
      status: "INFO",
      message: "No target repository specified (--repo owner/name or GITHUB_REPOSITORY)",
    });
  }

  // ──────────────────────────────────────────────────────────
  // Step 7: Push Handshake / Dry-Run Verification
  // ──────────────────────────────────────────────────────────
  if (hasGitRepo && repoTarget && token) {
    try {
      // Test git remote push dry run safely
      const remoteUrl = `https://x-access-token:${token}@github.com/${repoTarget}.git`;
      const pushTest = spawnSync("git", ["push", "--dry-run", remoteUrl, `HEAD:${targetBranch}`], {
        cwd,
        encoding: "utf-8",
        timeout: 15000,
      });

      if (pushTest.status === 0) {
        results.push({
          step: "7. Git Push Dry-Run Handshake",
          status: "PASS",
          message: `Push handshake simulation to ${repoTarget} (${targetBranch}) succeeded!`,
          details: pushTest.stdout || pushTest.stderr,
        });
      } else {
        const errorOutput = pushTest.stderr || pushTest.stdout || "Unknown git push error";
        results.push({
          step: "7. Git Push Dry-Run Handshake",
          status: "FAIL",
          message: `Push dry-run failed with code ${pushTest.status}`,
          details: errorOutput.replace(token, "******"),
        });

        if (errorOutput.includes("non-fast-forward") || errorOutput.includes("fetch first")) {
          recommendations.push(
            "The remote branch contains commits that do not exist locally (unrelated or diverging histories). Use --force or pull/merge before pushing."
          );
        } else if (errorOutput.includes("Authentication failed")) {
          recommendations.push("Authentication failed during git push. Check token permissions and expiration.");
        } else if (errorOutput.includes("protected branch")) {
          recommendations.push(
            `Branch '${targetBranch}' is protected. Direct pushes might be disallowed without a pull request.`
          );
        }
      }
    } catch (err: any) {
      results.push({
        step: "7. Git Push Dry-Run Handshake",
        status: "WARN",
        message: `Could not complete push handshake simulation: ${err.message}`,
      });
    }
  }

  // Calculate totals
  const total = results.length;
  const passed = results.filter((r) => r.status === "PASS").length;
  const warnings = results.filter((r) => r.status === "WARN").length;
  const failed = results.filter((r) => r.status === "FAIL").length;

  return {
    timestamp: new Date().toISOString(),
    summary: { total, passed, warnings, failed },
    results,
    recommendations,
  };
}

/**
 * Helper: Detects duplicate filenames on case-insensitive filesystems
 */
function checkCaseCollisions(root: string): string[][] {
  const collisions: string[][] = [];
  try {
    const files = getFilesRecursive(root, ["node_modules", ".git", "dist", ".cache"]);
    const map = new Map<string, string[]>();

    for (const f of files) {
      const lower = f.toLowerCase();
      const list = map.get(lower) || [];
      list.push(f);
      map.set(lower, list);
    }

    for (const [, entries] of map.entries()) {
      if (entries.length > 1) {
        collisions.push(entries);
      }
    }
  } catch {
    // Ignore traversal errors
  }
  return collisions;
}

/**
 * Helper: Find files exceeding size threshold
 */
function findLargeFiles(root: string, maxBytes: number): { file: string; sizeMb: number }[] {
  const large: { file: string; sizeMb: number }[] = [];
  try {
    const files = getFilesRecursive(root, ["node_modules", ".git", "dist", ".cache"]);
    for (const f of files) {
      try {
        const stat = fs.statSync(path.join(root, f));
        if (stat.isFile() && stat.size > maxBytes) {
          large.push({
            file: f,
            sizeMb: Math.round((stat.size / (1024 * 1024)) * 10) / 10,
          });
        }
      } catch {
        // Skip inaccessible files
      }
    }
  } catch {
    // Ignore traversal errors
  }
  return large;
}

function getFilesRecursive(dir: string, ignoreDirs: string[]): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (ignoreDirs.includes(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = getFilesRecursive(fullPath, ignoreDirs);
      results.push(...sub.map((s) => path.join(entry.name, s)));
    } else {
      results.push(entry.name);
    }
  }
  return results;
}

// ──────────────────────────────────────────────────────────
// CLI Execution
// ──────────────────────────────────────────────────────────
async function runCli() {
  const args = process.argv.slice(2);
  const options: Record<string, string> = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--token" && args[i + 1]) options.token = args[++i];
    if (args[i] === "--repo" && args[i + 1]) options.repository = args[++i];
    if (args[i] === "--branch" && args[i + 1]) options.branch = args[++i];
  }

  console.log("\n=======================================================");
  console.log(" 🔍 GITHUB CONNECTION & AUTHENTICATION DIAGNOSTIC TOOL ");
  console.log("=======================================================\n");

  const report = await runGitHubDiagnostics(options);

  for (const res of report.results) {
    const icon =
      res.status === "PASS"
        ? "✅ [PASS]"
        : res.status === "WARN"
        ? "⚠️  [WARN]"
        : res.status === "FAIL"
        ? "❌ [FAIL]"
        : "ℹ️  [INFO]";
    console.log(`${icon} ${res.step}: ${res.message}`);
    if (res.details) {
      if (typeof res.details === "object") {
        console.log("   " + JSON.stringify(res.details, null, 2).replace(/\n/g, "\n   "));
      } else {
        console.log(`   ${res.details}`);
      }
    }
    console.log();
  }

  console.log("-------------------------------------------------------");
  console.log(
    `Diagnostic Summary: ${report.summary.passed} Passed | ${report.summary.warnings} Warnings | ${report.summary.failed} Failed`
  );
  console.log("-------------------------------------------------------");

  if (report.recommendations.length > 0) {
    console.log("\n💡 Actionable Recommendations:");
    report.recommendations.forEach((rec, idx) => {
      console.log(`  ${idx + 1}. ${rec}`);
    });
    console.log();
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runCli().catch((err) => {
    console.error("Diagnostic utility error:", err);
    process.exit(1);
  });
}
