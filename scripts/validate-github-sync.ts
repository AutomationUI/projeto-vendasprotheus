import { spawnSync } from "node:child_process";

export interface SyncValidationResult {
  step: string;
  status: "SUCCESS" | "WARNING" | "FAILURE" | "INFO";
  title: string;
  details?: Record<string, unknown> | string;
  error?: string;
  remediation?: string;
}

export interface SyncValidationReport {
  timestamp: string;
  targetRepository: string;
  targetBranch: string;
  tokenType: string;
  maskedToken: string;
  summary: {
    total: number;
    passed: number;
    warnings: number;
    failed: number;
  };
  results: SyncValidationResult[];
  canPush: boolean;
  blockers: string[];
  recommendations: string[];
}

/**
 * Safely masks a token showing only prefix and suffix
 */
export function maskSecretToken(token?: string | null): string {
  if (!token) return "(none provided)";
  if (token.length <= 12) return "************";
  const prefix = token.slice(0, 15);
  const suffix = token.slice(-6);
  return `${prefix}...${suffix} (${token.length} chars)`;
}

/**
 * Detects token classification
 */
export function getTokenType(token: string): string {
  if (token.startsWith("github_pat_")) return "Fine-Grained Personal Access Token (PAT v2)";
  if (token.startsWith("ghp_")) return "Classic Personal Access Token";
  if (token.startsWith("gho_")) return "GitHub OAuth Access Token";
  if (token.startsWith("ghu_")) return "GitHub User-to-Server Token";
  if (token.startsWith("ghs_")) return "GitHub App Server-to-Server Token";
  if (token.startsWith("ghr_")) return "GitHub Refresh Token";
  return "Custom or Standard Bearer Token";
}

/**
 * Main validation suite for GitHub repository sync & authentication
 */
export async function validateGitHubSync(options: {
  token?: string;
  repository?: string;
  branch?: string;
  workDir?: string;
} = {}): Promise<SyncValidationReport> {
  const cwd = options.workDir || process.cwd();
  const repoTarget = options.repository || process.env.GITHUB_REPOSITORY || "AutomationUI/projeto-vendasprotheus";
  const branch = options.branch || "main";
  const token = options.token || process.env.GITHUB_TOKEN || process.env.GITHUB_PAT || process.env.GH_TOKEN;

  const [owner, repoName] = repoTarget.split("/");
  const results: SyncValidationResult[] = [];
  const blockers: string[] = [];
  const recommendations: string[] = [];
  let canPush = false;

  const tokenType = token ? getTokenType(token) : "No token provided";
  const maskedToken = maskSecretToken(token);

  // ─────────────────────────────────────────────────────────────
  // 1. API CONNECTIVITY & NETWORK HANDSHAKE
  // ─────────────────────────────────────────────────────────────
  try {
    const t0 = Date.now();
    const res = await fetch("https://api.github.com/zen", {
      headers: { "User-Agent": "AI-Studio-Sync-Validator/1.0" },
    });
    const latency = Date.now() - t0;
    const reqId = res.headers.get("x-github-request-id") || "N/A";
    const edgeRegion = res.headers.get("x-github-edge-region") || "N/A";

    if (res.ok) {
      results.push({
        step: "1. API Connection",
        status: "SUCCESS",
        title: `Connected to GitHub API (${latency}ms, Edge: ${edgeRegion})`,
        details: { latencyMs: latency, edgeRegion, requestId: reqId, status: res.status },
      });
    } else {
      results.push({
        step: "1. API Connection",
        status: "FAILURE",
        title: `GitHub API returned unexpected status HTTP ${res.status}`,
        details: { requestId: reqId },
      });
      blockers.push(`GitHub API returned HTTP ${res.status}`);
    }
  } catch (err: any) {
    results.push({
      step: "1. API Connection",
      status: "FAILURE",
      title: "Network unreachable: failed connecting to api.github.com",
      error: err.message,
      remediation: "Verify DNS and HTTPS outbound connectivity to api.github.com",
    });
    blockers.push(`Cannot connect to api.github.com: ${err.message}`);
  }

  // ─────────────────────────────────────────────────────────────
  // 2. AUTHENTICATION & IDENTITY VERIFICATION
  // ─────────────────────────────────────────────────────────────
  let authenticatedUser: string | null = null;
  if (!token) {
    results.push({
      step: "2. Token Authentication",
      status: "FAILURE",
      title: "No Personal Access Token provided",
      error: "Missing credentials. Sync cannot authenticate write operations.",
      remediation:
        "Provide a valid PAT via --token <PAT> or set GITHUB_TOKEN in your environment variables.",
    });
    blockers.push("Authentication token missing.");
  } else {
    try {
      const authHeaders: Record<string, string> = {
        "User-Agent": "AI-Studio-Sync-Validator/1.0",
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
      };

      const res = await fetch("https://api.github.com/user", { headers: authHeaders });
      const reqId = res.headers.get("x-github-request-id") || "N/A";
      const ssoHeader = res.headers.get("x-github-sso");
      const oauthScopes = res.headers.get("x-oauth-scopes");
      const expHeader = res.headers.get("github-authentication-token-expiration");
      const remainingRate = res.headers.get("x-ratelimit-remaining");

      if (res.status === 200) {
        const userData = (await res.json()) as any;
        authenticatedUser = userData.login;

        results.push({
          step: "2. Token Authentication",
          status: "SUCCESS",
          title: `Authenticated successfully as @${userData.login}`,
          details: {
            user: userData.login,
            accountType: userData.type,
            tokenType,
            maskedToken,
            tokenExpiration: expHeader || "No expiration returned",
            oauthScopes: oauthScopes || "(Fine-Grained PAT: specific repo permissions)",
            ssoEnforcement: ssoHeader || "None",
            remainingRateLimit: remainingRate,
            requestId: reqId,
          },
        });

        if (ssoHeader) {
          results.push({
            step: "2.1 SAML SSO Organization Policy",
            status: "WARNING",
            title: `SAML SSO required by organization: ${ssoHeader}`,
            details: "The token needs explicit SSO authorization for the target organization.",
            remediation: `Authorize your token at https://github.com/settings/tokens by clicking 'Configure SSO' next to your token.`,
          });
          recommendations.push(`Authorize this PAT for SAML SSO organization '${owner}'.`);
        }

        // Check which repositories this token is authorized to access
        try {
          const reposRes = await fetch("https://api.github.com/user/repos?per_page=100&affiliation=owner,collaborator,organization_member", {
            headers: authHeaders,
          });
          if (reposRes.ok) {
            const accessibleRepos = (await reposRes.json()) as Array<{ full_name: string; permissions?: Record<string, boolean> }>;
            const repoNames = accessibleRepos.map((r) => r.full_name);
            const targetIncluded = repoNames.some((n) => n.toLowerCase() === repoTarget.toLowerCase());

            if (targetIncluded) {
              results.push({
                step: "2.2 Token Repository Scope",
                status: "SUCCESS",
                title: `Token has explicit access to target repository '${repoTarget}'`,
                details: { accessibleRepositories: repoNames },
              });
            } else {
              const fineGrainedNote = tokenType.includes("Fine-Grained")
                ? `\n⚠️ CAUSE IDENTIFIED: This Fine-Grained PAT was created with 'Only select repositories' and only grants access to: [${
                    repoNames.length ? repoNames.join(", ") : "no repositories"
                  }]. It DOES NOT grant access to '${repoTarget}'.`
                : "";

              results.push({
                step: "2.2 Token Repository Scope",
                status: "WARNING",
                title: `Target repository '${repoTarget}' not found in token's accessible repositories list`,
                details: {
                  accessibleRepositories: repoNames.length > 0 ? repoNames : ["(none visible to this token)"],
                  note: fineGrainedNote.trim(),
                },
                remediation:
                  tokenType.includes("Fine-Grained")
                    ? `1. Open GitHub -> Settings -> Developer Settings -> Personal access tokens -> Fine-grained tokens\n` +
                      `2. Select this token and edit 'Repository access'\n` +
                      `3. Under 'Selected repositories', select or add '${repoName}' (or select 'All repositories')\n` +
                      `4. Ensure 'Repository permissions' -> 'Contents' is set to 'Read and write'.\n` +
                      `   Note: If '${owner}' is an organization, the token's 'Resource owner' must be '${owner}', or generate a Classic Token with 'repo' scope.`
                    : `Ensure the user @${authenticatedUser} is an owner or collaborator with push access on ${repoTarget}.`,
              });

              if (tokenType.includes("Fine-Grained")) {
                blockers.push(
                  `Fine-Grained PAT scope mismatch: Token only has permission for [${
                    repoNames.join(", ") || "none"
                  }]. You must add '${repoTarget}' to the token's 'Repository access' list in GitHub Settings.`
                );
              }
            }
          }
        } catch {
          // Non-blocking repository enumeration check
        }
      } else {
        const errText = await res.text();
        let parsedErr: any = {};
        try {
          parsedErr = JSON.parse(errText);
        } catch {
          parsedErr = { message: errText };
        }

        results.push({
          step: "2. Token Authentication",
          status: "FAILURE",
          title: `Authentication failed (HTTP ${res.status})`,
          error: parsedErr.message || errText,
          details: {
            statusCode: res.status,
            maskedToken,
            tokenType,
            requestId: reqId,
            documentationUrl: parsedErr.documentation_url,
          },
          remediation:
            res.status === 401
              ? "The Personal Access Token is invalid, expired, or was revoked. Generate a new token with 'repo' scope."
              : "Check token authorization and scopes.",
        });
        blockers.push(`GitHub rejected token with HTTP ${res.status}: ${parsedErr.message || errText}`);
      }
    } catch (err: any) {
      results.push({
        step: "2. Token Authentication",
        status: "FAILURE",
        title: "Exception verifying authentication",
        error: err.message,
      });
      blockers.push(`Authentication check exception: ${err.message}`);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 3. TARGET REPOSITORY EXISTENCE & PERMISSIONS CHECK
  // ─────────────────────────────────────────────────────────────
  if (repoTarget) {
    try {
      const headers: Record<string, string> = {
        "User-Agent": "AI-Studio-Sync-Validator/1.0",
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(`https://api.github.com/repos/${repoTarget}`, { headers });
      const reqId = res.headers.get("x-github-request-id") || "N/A";

      if (res.status === 200) {
        const repo = (await res.json()) as any;
        const pushAllowed = repo.permissions?.push === true;
        const adminAllowed = repo.permissions?.admin === true;
        const pullAllowed = repo.permissions?.pull === true;

        if (repo.archived) {
          results.push({
            step: "3. Repository Status & Permissions",
            status: "FAILURE",
            title: `Repository ${repoTarget} is ARCHIVED (read-only)`,
            remediation: "Unarchive the repository in GitHub Settings to permit pushes.",
          });
          blockers.push(`Repository ${repoTarget} is archived.`);
        } else if (repo.locked) {
          results.push({
            step: "3. Repository Status & Permissions",
            status: "FAILURE",
            title: `Repository ${repoTarget} is LOCKED by GitHub`,
            remediation: "Contact GitHub Support to unlock the repository.",
          });
          blockers.push(`Repository ${repoTarget} is locked.`);
        } else if (!pushAllowed) {
          results.push({
            step: "3. Repository Status & Permissions",
            status: "FAILURE",
            title: `Read-only access: User '${authenticatedUser || "current"}' lacks write/push permission`,
            details: {
              permissions: repo.permissions,
              isPrivate: repo.private,
              defaultBranch: repo.default_branch,
              requestId: reqId,
            },
            remediation:
              tokenType.includes("Fine-Grained")
                ? `In your Fine-Grained PAT settings, ensure 'Repository access' includes '${repoTarget}' with 'Contents: Read and write' permissions.`
                : `Grant Collaborator (Write/Admin) permission to user @${authenticatedUser} on https://github.com/${repoTarget}/settings/access`,
          });
          blockers.push(`Token lacks write/push permissions for ${repoTarget}.`);
        } else {
          canPush = true;
          results.push({
            step: "3. Repository Status & Permissions",
            status: "SUCCESS",
            title: `Full write access confirmed for ${repoTarget}`,
            details: {
              fullName: repo.full_name,
              isPrivate: repo.private,
              defaultBranch: repo.default_branch,
              permissions: { push: pushAllowed, pull: pullAllowed, admin: adminAllowed },
              requestId: reqId,
            },
          });
        }
      } else if (res.status === 404) {
        // Detailed 404 diagnostic
        results.push({
          step: "3. Repository Status & Permissions",
          status: "FAILURE",
          title: `Repository ${repoTarget} not found (HTTP 404)`,
          details: {
            possibleCauses: [
              `1. The repository does not exist yet at https://github.com/${repoTarget}`,
              `2. The repository is Private and the token lacks permission to view it`,
              `3. Organization '${owner}' requires SAML SSO authorization for this token`,
              `4. Fine-grained PAT was not granted access to repository '${repoName}'`,
            ],
            requestId: reqId,
          },
          remediation:
            `1. Create the repository at https://github.com/organizations/${owner}/repositories/new (or https://github.com/new)\n` +
            `2. If private, edit your Personal Access Token and add '${repoName}' under 'Selected repositories' with 'Contents: Read and write'.`,
        });
        blockers.push(`Target repository ${repoTarget} does not exist or token has no read/write access to it (HTTP 404).`);
      } else if (res.status === 403) {
        const errBody = await res.text();
        results.push({
          step: "3. Repository Status & Permissions",
          status: "FAILURE",
          title: `Access Forbidden (HTTP 403)`,
          error: errBody,
          remediation: "Check organization third-party access restrictions or IP allowlist.",
        });
        blockers.push(`Access forbidden to ${repoTarget}: ${errBody}`);
      } else {
        const errBody = await res.text();
        results.push({
          step: "3. Repository Status & Permissions",
          status: "FAILURE",
          title: `Repository check returned HTTP ${res.status}`,
          error: errBody,
        });
      }
    } catch (err: any) {
      results.push({
        step: "3. Repository Status & Permissions",
        status: "FAILURE",
        title: "Failed querying repository endpoint",
        error: err.message,
      });
      blockers.push(`Exception checking repository: ${err.message}`);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 4. BRANCH PROTECTION VERIFICATION (IF REPO ACCESSIBLE)
  // ─────────────────────────────────────────────────────────────
  if (canPush && token) {
    try {
      const protRes = await fetch(
        `https://api.github.com/repos/${repoTarget}/branches/${branch}/protection`,
        {
          headers: {
            "User-Agent": "AI-Studio-Sync-Validator/1.0",
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${token}`,
            "X-GitHub-Api-Version": "2022-11-28",
          },
        }
      );

      if (protRes.status === 200) {
        const protData = (await protRes.json()) as any;
        results.push({
          step: "4. Branch Protection Rules",
          status: "WARNING",
          title: `Branch '${branch}' has active protection rules`,
          details: {
            requiredReviews: Boolean(protData.required_pull_request_reviews),
            enforceAdmins: protData.enforce_admins?.enabled ?? false,
            requiredStatusChecks: Boolean(protData.required_status_checks),
          },
          remediation:
            "Direct pushes to this branch may be rejected if pull request reviews or checks are required.",
        });
        recommendations.push(
          `Branch '${branch}' is protected. Consider pushing to a feature branch or adjusting protection rules if automated direct sync is desired.`
        );
      } else if (protRes.status === 404) {
        results.push({
          step: "4. Branch Protection Rules",
          status: "SUCCESS",
          title: `No blocking branch protection rules found on '${branch}'`,
        });
      }
    } catch {
      // Non-critical, continue
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 5. LOCAL GIT STATE & DRY-RUN PUSH HANDSHAKE
  // ─────────────────────────────────────────────────────────────
  try {
    const isGit =
      spawnSync("git", ["rev-parse", "--is-inside-work-tree"], { cwd, encoding: "utf-8" }).status === 0;

    if (!isGit) {
      results.push({
        step: "5. Git Push Simulation",
        status: "INFO",
        title: "Workspace is not yet a local Git repository",
        details: "Local git repository will be initialized on first sync or via 'git init'.",
        remediation:
          "To initialize locally: git init && git remote add origin https://github.com/" +
          repoTarget +
          ".git",
      });
    } else if (token && repoTarget) {
      const remoteUrl = `https://x-access-token:${token}@github.com/${repoTarget}.git`;
      const pushTest = spawnSync("git", ["push", "--dry-run", remoteUrl, `HEAD:${branch}`], {
        cwd,
        encoding: "utf-8",
        timeout: 20000,
      });

      const sanitizedOutput = (pushTest.stderr || pushTest.stdout || "")
        .replace(new RegExp(escapeRegExp(token), "g"), "******")
        .trim();

      if (pushTest.status === 0) {
        results.push({
          step: "5. Git Push Simulation",
          status: "SUCCESS",
          title: `Push handshake test to ${repoTarget} (${branch}) PASSED`,
          details: sanitizedOutput || "Push dry-run succeeded without errors.",
        });
      } else {
        results.push({
          step: "5. Git Push Simulation",
          status: "FAILURE",
          title: `Git push dry-run failed with exit code ${pushTest.status}`,
          error: sanitizedOutput,
          details: { exitCode: pushTest.status, output: sanitizedOutput },
        });

        if (sanitizedOutput.includes("non-fast-forward") || sanitizedOutput.includes("fetch first")) {
          recommendations.push(
            "The remote branch contains existing commits. Run 'git pull --rebase' or use '--force' to overwrite remote with current state."
          );
        } else if (sanitizedOutput.includes("Repository not found") || sanitizedOutput.includes("404")) {
          blockers.push("Git CLI confirmed repository not found or inaccessible with token.");
        } else if (sanitizedOutput.includes("Authentication failed")) {
          blockers.push("Git CLI push authentication failed.");
        }
      }
    }
  } catch (err: any) {
    results.push({
      step: "5. Git Push Simulation",
      status: "WARNING",
      title: "Could not perform git push simulation",
      error: err.message,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // COMPILE REPORT
  // ─────────────────────────────────────────────────────────────
  const total = results.length;
  const passed = results.filter((r) => r.status === "SUCCESS").length;
  const warnings = results.filter((r) => r.status === "WARNING").length;
  const failed = results.filter((r) => r.status === "FAILURE").length;

  return {
    timestamp: new Date().toISOString(),
    targetRepository: repoTarget,
    targetBranch: branch,
    tokenType,
    maskedToken,
    summary: { total, passed, warnings, failed },
    results,
    canPush: canPush && failed === 0,
    blockers,
    recommendations,
  };
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ─────────────────────────────────────────────────────────────
// CLI EXECUTION
// ─────────────────────────────────────────────────────────────
async function run() {
  const args = process.argv.slice(2);
  const options: Record<string, string> = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--token" && args[i + 1]) options.token = args[++i];
    if (args[i] === "--repo" && args[i + 1]) options.repository = args[++i];
    if (args[i] === "--branch" && args[i + 1]) options.branch = args[++i];
  }

  console.log("\n==================================================================");
  console.log(" 🚀 GITHUB SYNC & AUTHENTICATION VALIDATOR ");
  console.log("==================================================================\n");

  const report = await validateGitHubSync(options);

  console.log(`📌 Target Repository: ${report.targetRepository}`);
  console.log(`🌿 Target Branch:     ${report.targetBranch}`);
  console.log(`🔑 Token Format:       ${report.tokenType}`);
  console.log(`🔒 Masked Token:      ${report.maskedToken}`);
  console.log("------------------------------------------------------------------\n");

  for (const item of report.results) {
    const badge =
      item.status === "SUCCESS"
        ? "✅ [SUCCESS]"
        : item.status === "WARNING"
        ? "⚠️  [WARNING]"
        : item.status === "FAILURE"
        ? "❌ [FAILURE]"
        : "ℹ️  [INFO]   ";

    console.log(`${badge} ${item.step}: ${item.title}`);
    if (item.error) {
      console.log(`   🚨 Error: ${item.error}`);
    }
    if (item.details) {
      if (typeof item.details === "object") {
        console.log("   📋 Details: " + JSON.stringify(item.details, null, 2).replace(/\n/g, "\n      "));
      } else {
        console.log(`   📋 Details: ${item.details}`);
      }
    }
    if (item.remediation) {
      console.log(`   💡 Action:  ${item.remediation.replace(/\n/g, "\n      ")}`);
    }
    console.log();
  }

  console.log("==================================================================");
  console.log(
    `📊 SUMMARY: ${report.summary.passed} Passed | ${report.summary.warnings} Warnings | ${report.summary.failed} Failed`
  );
  console.log(`🚀 Ready to Push: ${report.canPush ? "YES (All verifications green)" : "NO (Blockers present)"}`);
  console.log("==================================================================");

  if (report.blockers.length > 0) {
    console.log("\n🛑 CRITICAL BLOCKERS TO RESOLVE:");
    report.blockers.forEach((b, idx) => console.log(`   ${idx + 1}. ${b}`));
  }

  if (report.recommendations.length > 0) {
    console.log("\n💡 RECOMMENDED NEXT STEPS:");
    report.recommendations.forEach((r, idx) => console.log(`   ${idx + 1}. ${r}`));
  }
  console.log();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((err) => {
    console.error("Validator unhandled exception:", err);
    process.exit(1);
  });
}
