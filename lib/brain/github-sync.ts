import { env } from '../config/env';
import { createServiceClient } from '../supabase/service';
import { logToBrain } from './unified';

export interface SyncSummary {
  reposSynced: number;
  commitsScanned: number;
  brainEntriesAdded: number;
}

export async function syncGithub(): Promise<SyncSummary> {
  const supabase = createServiceClient();

  // 1. Fetch repositories from GitHub
  const reposRes = await fetch('https://api.github.com/user/repos?per_page=100&affiliation=owner&sort=updated', {
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
    },
  });
  if (!reposRes.ok) {
    throw new Error(`GitHub user/repos API call failed: ${reposRes.status} ${reposRes.statusText}`);
  }
  const repos = await reposRes.json();
  if (!Array.isArray(repos)) {
    throw new Error(`Invalid repos response format: ${JSON.stringify(repos)}`);
  }

  console.log(`[GitHub-Sync] Syncing ${repos.length} repositories...`);
  const syncSummary: SyncSummary = { reposSynced: 0, commitsScanned: 0, brainEntriesAdded: 0 };

  for (const r of repos) {
    try {
      // Fetch the currently saved state for this repository
      const { data: savedRepo } = await supabase
        .from('github_repos')
        .select('*')
        .eq('full_name', r.full_name)
        .maybeSingle();

      // Upsert the current repo details to github_repos
      const { error: upsertErr } = await supabase
        .from('github_repos')
        .upsert({
          full_name: r.full_name,
          name: r.name,
          is_private: r.private,
          language: r.language || null,
          updated_at: r.updated_at,
        });
      if (upsertErr) {
        console.error(`[GitHub-Sync] Failed to upsert repo ${r.full_name}:`, upsertErr);
        continue;
      }
      syncSummary.reposSynced++;

      // 2. Fetch the top 10 recent commits for the repository
      const commitsRes = await fetch(`https://api.github.com/repos/${r.full_name}/commits?per_page=10`, {
        headers: {
          Authorization: `Bearer ${env.GITHUB_TOKEN}`,
          Accept: 'application/vnd.github+json',
        },
      });
      if (!commitsRes.ok) {
        console.warn(`[GitHub-Sync] Failed to fetch commits for ${r.full_name}: ${commitsRes.status}`);
        continue;
      }
      const commits = await commitsRes.json();
      if (!Array.isArray(commits) || commits.length === 0) {
        continue;
      }

      // 3. Scan commits to see what needs to be logged
      let newCommits: any[] = [];
      const savedLastSha = savedRepo?.last_commit_sha;

      if (!savedLastSha) {
        // If never synced before, seed with just the latest commit to prevent bulk historic logs
        newCommits = [commits[0]];
      } else {
        // Collect commits newer than the saved last commit SHA
        const lastIndex = commits.findIndex((c: any) => c.sha === savedLastSha);
        if (lastIndex === -1) {
          newCommits = commits;
        } else {
          newCommits = commits.slice(0, lastIndex);
        }
      }

      syncSummary.commitsScanned += newCommits.length;

      // Process in reverse chronological order (oldest new commit first)
      for (const c of [...newCommits].reverse()) {
        const message = c.commit.message || '';
        const titleLine = message.split('\n')[0].trim();

        // 4. Apply significance filter
        const isFeat = /^(feat|feat\(.*\)):/i.test(titleLine);
        const isBreaking = /breaking/i.test(message);
        const isCriticalKeyword = /(\bcritical\b|\bsecurity\b|\bdecision\b|\bmilestone\b|\barchitecture\b)/i.test(message);

        if (isFeat || isBreaking || isCriticalKeyword) {
          const entryType = isBreaking ? 'flag' : (isFeat ? 'build' : 'note');
          const importance = isBreaking ? 5 : (isFeat ? 4 : 3);

          await logToBrain({
            agent: 'GitHub Sync',
            entry_type: entryType,
            project: r.name,
            title: titleLine.substring(0, 80),
            summary: message,
            importance,
            detail: {
              sha: c.sha,
              author: c.commit.author?.name || 'Unknown',
              date: c.commit.author?.date || new Date().toISOString(),
              repo_full_name: r.full_name,
            },
            source: 'github',
          });
          syncSummary.brainEntriesAdded++;
        }
      }

      // 5. Update the repo state with the absolute latest commit
      const latestCommit = commits[0];
      const { error: updateStateErr } = await supabase
        .from('github_repos')
        .update({
          last_commit_sha: latestCommit.sha,
          last_commit_at: latestCommit.commit.author?.date || null,
        })
        .eq('full_name', r.full_name);

      if (updateStateErr) {
        console.error(`[GitHub-Sync] Failed to update state for ${r.full_name}:`, updateStateErr);
      }
    } catch (err: any) {
      console.error(`[GitHub-Sync] Error syncing repository ${r.full_name}:`, err);
    }
  }

  console.log(`[GitHub-Sync] Completed. Summary:`, syncSummary);
  return syncSummary;
}
