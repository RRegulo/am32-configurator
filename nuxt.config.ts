import { execSync } from 'node:child_process';
import pkg from './package.json';

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
        // workbox: {
        //    globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
        //    navigateFallback: '/'
        // },
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
