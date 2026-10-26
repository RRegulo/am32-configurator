export default defineEventHandler(async (event) => {
    const query = getQuery(event);
    const url = query.url as string | undefined;

    if (!url) {
        event.node.res.statusCode = 400;
        return { error: true, message: 'Missing url parameter' };
    }

    try {
        const parsed = new URL(url);
        const host = parsed.hostname.toLowerCase();
        // restrict proxy to known GitHub hosts to avoid open proxy
        if (!host.includes('github.com') && !host.includes('githubusercontent.com')) {
            event.node.res.statusCode = 403;
            return { error: true, message: 'Host not allowed' };
        }

        // fetch raw content server-side to avoid CORS issues
        const body = await $fetch<string>(url, { responseType: 'text' as const });
        event.node.res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return body;
    } catch (e: any) {
        console.error('[esc-firmware/download] proxy fetch failed:', e?.message ?? e);
        event.node.res.statusCode = 502;
        return { error: true, message: 'Failed to fetch remote url' };
    }
});
