interface FirmwareIndexFile {
    name: string;
    url: string;
}

interface FirmwareIndexRelease {
    name: string;
    prerelease: boolean;
    note?: string;
    files: FirmwareIndexFile[];
}

export type FirmwareIndexStatus = 'pending' | 'success' | 'error';

const FIRMWARE_INDEX_PATH = 'firmware/index.json';
const isAbsoluteUrl = (url: string) => /^https?:\/\//i.test(url);

export const useFirmwareIndex = () => {
    const releases = ref<FirmwareIndexRelease[]>([]);
    const status = ref<FirmwareIndexStatus>('pending');
    const stableReleases = computed(() => releases.value.filter(r => !r.prerelease));

    onMounted(async () => {
        const baseURL = (useRuntimeConfig().app.baseURL || '/').replace(/\/$/, '');
        const resolveUrl = (url: string) => isAbsoluteUrl(url) ? url : `${baseURL}/${url.replace(/^\//, '')}`;

        try {
            const index = await $fetch<{ releases?: FirmwareIndexRelease[] }>(`${baseURL}/${FIRMWARE_INDEX_PATH}`);
            releases.value = (index?.releases ?? [])
                .map(release => ({
                    name: release.name,
                    prerelease: !!release.prerelease,
                    note: release.note,
                    files: (release.files ?? [])
                        .filter(file => !!file?.name && !!file?.url)
                        .map(file => ({ name: file.name, url: resolveUrl(file.url) }))
                }))
                .filter(release => release.files.length > 0);
            status.value = releases.value.length > 0 ? 'success' : 'error';
        } catch {
            releases.value = [];
            status.value = 'error';
        }
    });

    return { releases, status, stableReleases };
};
