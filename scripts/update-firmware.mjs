// Syncs esc-firmware .hex files from GitHub releases into public/firmware/
// and regenerates firmware/index.json. Runs before build/generate.
// Non-fatal: on any error the existing index.json is kept as-is.
// Public repos use the anonymous GitHub API; for private repos (API returns
// 401/403/404) falls back to the authenticated `gh` CLI (gh must be logged in).

import { writeFile, mkdir, readFile, stat } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);

const REPO = 'RRegulo/esc-firmware';
const INDEX_PATH = `${fileURLToPath(new URL('../', import.meta.url))}public/firmware/index.json`;
const USER_AGENT = 'am32-configurator';

try {
    let releases;
    let viaGh = false;

    const apiRes = await fetch(`https://api.github.com/repos/${REPO}/releases`, {
        headers: { 'User-Agent': USER_AGENT }
    });
    if (apiRes.ok) {
        releases = await apiRes.json();
    } else {
        console.warn(`[firmware] GitHub API responded ${apiRes.status}; falling back to 'gh' CLI`);
        const { stdout } = await execFileAsync('gh', ['api', `repos/${REPO}/releases`], {
            maxBuffer: 16 * 1024 * 1024
        });
        releases = JSON.parse(stdout.toString());
        viaGh = true;
    }

    const entries = [];
    for (const release of releases) {
        if (release.draft || release.prerelease) {
            continue;
        }

        const dir = `${fileURLToPath(new URL('../', import.meta.url))}public/firmware/${release.tag_name}/`;
        await mkdir(dir, { recursive: true });

        const files = [];
        for (const asset of release.assets ?? []) {
            if (asset.name.toLowerCase().endsWith('.hex')) {
                // hex assets are hosted locally so flashing works without CORS
                if (viaGh) {
                    // private repo: download the binary asset via gh (octet-stream)
                    const { stdout } = await execFileAsync('gh', [
                        'api', `repos/${REPO}/releases/assets/${asset.id}`,
                        '-H', 'Accept: application/octet-stream'
                    ], { maxBuffer: 256 * 1024 * 1024 });
                    await writeFile(`${dir}${asset.name}`, stdout);
                } else {
                    const assetRes = await fetch(asset.browser_download_url, {
                        headers: { 'User-Agent': USER_AGENT }
                    });
                    if (!assetRes.ok) {
                        throw new Error(`Failed to download ${asset.name}: ${assetRes.status}`);
                    }
                    await writeFile(`${dir}${asset.name}`, Buffer.from(await assetRes.arrayBuffer()));
                }
                files.push({ name: asset.name, url: `firmware/${release.tag_name}/${asset.name}` });
            } else if (asset.name.toLowerCase().endsWith('.bin')) {
                files.push({ name: asset.name, url: asset.browser_download_url });
            }
        }

        if (files.length > 0) {
            entries.push({
                name: release.tag_name,
                prerelease: false,
                files
            });
        }
    }

    if (entries.length === 0) {
        throw new Error('no stable releases with firmware assets found');
    }

    entries.sort((a, b) => b.name.localeCompare(a.name, undefined, { numeric: true }));

    let currentIndex = null;
    try {
        if ((await stat(INDEX_PATH)).isFile()) {
            currentIndex = JSON.parse(await readFile(INDEX_PATH, 'utf8'));
        }
    } catch {
        // no existing file
    }

    // Skip writing when nothing changed, to avoid build-time git churn
    if (currentIndex?.releases && JSON.stringify(currentIndex.releases) === JSON.stringify(entries)) {
        console.log(`[firmware] index.json already up to date (${entries.length} releases)`);
    } else {
        await writeFile(INDEX_PATH, JSON.stringify({
            generated: new Date().toISOString(),
            releases: entries
        }, null, 2) + '\n');
        console.log(`[firmware] index.json updated: ${entries.map(r => r.name).join(', ')}`);
    }
} catch (e) {
    console.warn(`[firmware] sync skipped: ${e?.message ?? e}`);
}