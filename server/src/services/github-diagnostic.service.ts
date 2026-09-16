import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { logger } from "../lib/logger.js";

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

export function maskToken(token?: string | null): string {
  if (!token) return "(not provided)";
  if (token.length <= 10) return "********";
  const prefix = token.slice(0, 12);
  const suffix = token.slice(-4);
  return `${prefix}...${suffix} (${token.length} chars)`;
}

export function identifyTokenType(token: string): string {
  if (token.startsWith("github_pat_")) return "Fine-Grained Personal Access Token (PAT v2)";
  if (token.startsWith("ghp_")) return "Classic Personal Access Token";
  if (token.startsWith("gho_")) return "GitHub OAuth Access Token";
  if (token.startsWith("ghu_")) return "GitHub User-to-Server Token";
  if (token.startsWith("ghs_")) return "GitHub App Server-to-Server Token";
  if (token.startsWith("ghr_")) return "GitHub Refresh Token";
  return "Custom/Unknown Token format";
}

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

  logger.info({ repoTarget, targetBranch, hasToken: Boolean(token) }, "Starting GitHub diagnostic run");

  // Step 1: Reachability
  try {
    const startTime = Date.now();
    const res = await fetch("https://api.github.com/zen", {
      headers: { "User-Agent": "AI-Studio-GitHub-Diagnostic/1.0" },
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

  // Step 2: Rate Limit
  try {
    const headers: Record<string, string> = {
      "User-Agent": "AI-Studio-GitHub-Diagnostic/1.0",
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };
    if (token) headers.Authorization = `Bearer ${token}`;

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

  // Step 3: Authentication & Headers
  if (!token) {
    results.push({
      step: "3. Authentication Header Validation",
      status: "WARN",
      message: "No GitHub token detected in environment (GITHUB_TOKEN / GH_TOKEN) or arguments",
      details: "Set GITHUB_TOKEN environment variable or pass token in request body to validate credentials.",
    });
    recommendations.push(
      "Provide a valid GitHub Personal Access Token (PAT) via GITHUB_TOKEN environment variable."
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
            scopesGranted: oauthScopes || "(Fine-grained token: verify repository write permission)",
            ssoEnforcement: ssoHeader || "None",
            tokenExpiration: expHeader || "No expiration header returned",
            requestId: reqId,
          },
        });

        if (!hasRepoScope && scopesList.length > 0) {
          recommendations.push(
            `Token lacks 'repo' scope (current scopes: ${oauthScopes}). Pushing to private repositories requires 'repo' scope.`
          );
        }
        if (ssoHeader) {
          recommendations.push(`SAML SSO enforced by organization (${ssoHeader}). Authorize token for your organization.`);
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
          recommendations.push("The token is invalid, expired, or was revoked. Generate a new Personal Access Token on GitHub.");
        } else if (res.status === 403 && (ssoHeader || errBody.includes("SAML"))) {
          recommendations.push("Organization SAML SSO enforcement blocked token. Authorize it on GitHub settings.");
        }
      }
    } catch (err: any) {
      results.push({
        step: "3. Authentication Header Validation",
        status: "FAIL",
        message: `Failed while verifying credentials: ${err.message}`,
      });
    }
  }

  // Step 4: Local Git Workspace & Remote Inspection
  let hasGitRepo = false;
  try {
    const gitStatus = spawnSync("git", ["rev-parse", "--is-inside-work-tree"], { cwd, encoding: "utf-8" });
    hasGitRepo = gitStatus.status === 0 && gitStatus.stdout.trim() === "true";

    if (hasGitRepo) {
      const remotes = spawnSync("git", ["remote", "-v"], { cwd, encoding: "utf-8" }).stdout.trim();
      const currentBranch = spawnSync("git", ["branch", "--show-current"], { cwd, encoding: "utf-8" }).stdout.trim();

      if (!repoTarget && remotes) {
        const match = remotes.match(/github\.com[:/]([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+?)(?:\.git)?\s/);
        if (match) repoTarget = `${match[1]}/${match[2]}`;
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
        details: "Git repository is initialized on demand or via manual 'git init'.",
      });
      recommendations.push("To initialize Git locally: git init && git remote add origin https://github.com/<owner>/<repo>.git");
    }
  } catch (err: any) {
    results.push({
      step: "4. Local Git Repository Configuration",
      status: "WARN",
      message: `Error inspecting git repository: ${err.message}`,
    });
  }

  // Step 5: File Tree Integrity
  try {
    const collisions = checkCaseCollisions(cwd);
    if (collisions.length > 0) {
      results.push({
        step: "5. File Tree Integrity & Sync Blockers",
        status: "FAIL",
        message: `Detected ${collisions.length} case collision(s) that break GitHub Git Data API synchronization:`,
        details: collisions,
      });
      recommendations.push(
        `Remove duplicate case-conflicting files: ${collisions.map((c) => c.join(" vs ")).join(", ")}`
      );
    } else {
      const largeFiles = findLargeFiles(cwd, 50 * 1024 * 1024);
      if (largeFiles.length > 0) {
        const fatalFiles = largeFiles.filter((f) => f.sizeMb > 100);
        results.push({
          step: "5. File Tree Integrity & Sync Blockers",
          status: fatalFiles.length > 0 ? "FAIL" : "WARN",
          message:
            fatalFiles.length > 0
              ? `Found ${fatalFiles.length} file(s) exceeding GitHub 100MB limit (Pushes will fail)`
              : `Found ${largeFiles.length} file(s) larger than 50MB`,
          details: largeFiles,
        });
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

  // Step 6: Target Repo Connection & Push Permissions
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

        if (repo.archived || repo.locked) {
          results.push({
            step: "6. Target Repository Status",
            status: "FAIL",
            message: `Repository ${repoTarget} is ${repo.archived ? "ARCHIVED" : "LOCKED"}. Push rejected.`,
          });
        } else if (!canPush && token) {
          results.push({
            step: "6. Target Repository Status",
            status: "FAIL",
            message: `Authenticated user lacks push/write permissions to repository ${repoTarget}`,
            details: { permissions: repo.permissions, isPrivate: repo.private, requestId: reqId },
          });
          recommendations.push(`Grant push/write permissions to user for ${repoTarget}.`);
        } else {
          results.push({
            step: "6. Target Repository Status",
            status: "PASS",
            message: `Repository ${repoTarget} verified with push capability confirmed`,
            details: { fullName: repo.full_name, isPrivate: repo.private, permissions: repo.permissions, requestId: reqId },
          });
        }
      } else if (res.status === 404) {
        results.push({
          step: "6. Target Repository Status",
          status: "WARN",
          message: `Repository ${repoTarget} was not found (HTTP 404)`,
          details: { possibleCauses: ["Repository does not exist yet", "Repository is private and token lacks access", "Name misspelled"], requestId: reqId },
        });
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
        message: `Failed connecting to repository ${repoTarget}: ${err.message}`,
      });
    }
  } else {
    results.push({
      step: "6. Target Repository Status",
      status: "INFO",
      message: "No target repository specified (--repo owner/name or GITHUB_REPOSITORY)",
    });
  }

  // Step 7: Push Handshake Simulation
  if (hasGitRepo && repoTarget && token) {
    try {
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
        const errorOutput = pushTest.stderr || pushTest.stdout || "Unknown push error";
        results.push({
          step: "7. Git Push Dry-Run Handshake",
          status: "FAIL",
          message: `Push dry-run failed with code ${pushTest.status}`,
          details: errorOutput.replace(token, "******"),
        });

        if (errorOutput.includes("non-fast-forward") || errorOutput.includes("fetch first")) {
          recommendations.push("Remote branch has diverging history. Use pull/rebase or force push if replacing entirely.");
        } else if (errorOutput.includes("Authentication failed")) {
          recommendations.push("Authentication failed during git push handshake. Recheck token permissions.");
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
      if (entries.length > 1) collisions.push(entries);
    }
  } catch {
    // Ignore traversal errors
  }
  return collisions;
}

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
