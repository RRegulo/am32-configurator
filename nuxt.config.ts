import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import pkg from './package.json';

// Ship the icon subset used by this SPA. @nuxt/icon otherwise fetches unknown
// collections from api.iconify.design at runtime, which is unreachable for
// some users without a VPN.
const localIconNames: Record<string, string[]> = {
    'material-symbols': [
        'avg-pace', 'check-circle-outline', 'cloud-sync',
        ...Array.from({ length: 8 }, (_, index) => `counter-${index + 1}-outline`),
        'delete-forever-outline', 'download-rounded', 'error', 'error-outline',
        'find-in-page-outline', 'flight', 'full-stacked-bar-chart', 'help-outline',
        'info', 'install-desktop', 'menu-book-outline', 'mimo-disconnect-outline',
        'music-note', 'save', 'settings', 'sim-card-download-outline',
        'sim-card-outline', 'speed', 'stop-circle', 'tune', 'upload-file-outline',
        'usb', 'volume-up', 'warning'
    ],
    fluent: ['serial-port-16-filled'],
    'heroicons': [
        'cpu-chip-16-solid', 'exclamation-triangle-16-solid', 'folder', 'home',
        'x-mark-20-solid'
    ],
    mdi: ['telegram'],
    ph: ['arrows-out'],
    'svg-spinners': ['blocks-wave']
};

const localIconCollections = Object.entries(localIconNames).map(([prefix, names]) => {
    const collection = JSON.parse(readFileSync(new URL(`./node_modules/@iconify/json/json/${prefix}.json`, import.meta.url), 'utf8'));
    const icons = Object.fromEntries(names.map((name) => {
        const icon = collection.icons[name];
        if (!icon) {
            throw new Error(`Missing bundled ${prefix}:${name} icon`);
        }
        return [name, icon];
    }));

    return {
        prefix,
        width: collection.width,
        height: collection.height,
        icons
    };
});

// version shown in the corner of the UI: package.json + commit and date of the build
// (from git; -dirty when there are uncommitted changes)
const git = (cmd: string) => {
    try {
        return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    } catch {
        return '';
    }
};
const commit = git('git rev-parse --short HEAD');
// nuxt.config.ts is excluded: the site build edits it temporarily (typeCheck off)
const dirty = commit && git("git status --porcelain --untracked-files=no -- . ':!nuxt.config.ts'") ? '-dirty' : '';

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    // Site is deployed under https://regulo.ru/configurator/
    app: {
        baseURL: '/configurator/'
    },

    devtools: {
        enabled: true,

        timeline: {
            enabled: true
        }
    },

    typescript: {
        shim: false,
        typeCheck: true
    },

    ssr: false,

    icon: {
        provider: 'none',
        fallbackToApi: false,
        customCollections: localIconCollections,
        clientBundle: {
            includeCustomCollections: true
        }
    },

    runtimeConfig: {
        public: {
            appVersion: pkg.version,
            appCommit: commit + dirty,
            appDate: git('git log -1 --format=%cs')
        },
        redis: { // Default values
            host: process.env.REDIS_HOST,
            port: 6379
            /* other redis connector options */
        }
    },

    modules: [
        '@vite-pwa/nuxt',
        'nuxt-svgo',
        'dayjs-nuxt',
        '@nuxt/ui',
        '@pinia/nuxt',
        '@vueuse/nuxt',
        ['@nuxtjs/google-fonts', {
            families: {
                Roboto: true,
                'Nunito Sans': true
            }
        }],
        '@nuxt/content',
        '@nuxt/image'
    ],

    pinia: {
        storesDirs: ['./stores/**']
    },

    colorMode: {
        preference: 'dark'
    },

    svgo: {
        autoImportPath: false,
        explicitImportsOnly: true
    },

    pwa: {
        registerType: 'autoUpdate',
        manifest: {
            id: '/',
            name: 'AM32 configurator',
            short_name: 'AM32CONF',
            theme_color: '#000000',
            description: 'Configurator for the ESC firmware AM32',
            icons: [
                {
                    src: 'assets/images/am32-logo.png',
                    sizes: '848x848',
                    type: 'image/png'
                },
                {
                    src: 'assets/images/192x192.png',
                    sizes: '192x192',
                    type: 'image/png'
                },
                {
                    src: 'assets/images/144x144.png',
                    sizes: '144x144',
                    type: 'image/png',
                    purpose: 'any'
                },
                {
                    src: 'assets/images/96x96.png',
                    sizes: '96x96',
                    type: 'image/png',
                    purpose: 'any'
                }
            ],
            screenshots: [
                {
                    src: 'assets/images/screenshot1.png',
                    sizes: '1742x918',
                    type: 'image/png',
                    form_factor: 'wide',
                    label: '4in1 ESC'
                },
                {
                    src: 'assets/images/screenshot1.png',
                    sizes: '1742x918',
                    type: 'image/png',
                    form_factor: 'narrow',
                    label: '4in1 ESC'
                }
            ]
        },
        workbox: {
            // Include index.html so the baseURL navigation fallback is present
            // in the precache manifest for the /configurator/ deployment.
            globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}']
        },
        client: {
            installPrompt: true,
            // you don't need to include this: only for testing purposes
            // if enabling periodic sync for update use 1 hour or so (periodicSyncForUpdates: 3600)
            periodicSyncForUpdates: 3600
        },
        devOptions: {
            enabled: true,
            suppressWarnings: true,
            navigateFallbackAllowlist: [/^\/$/],
            type: 'module'
        }
    },

    compatibilityDate: '2024-09-16'
});
