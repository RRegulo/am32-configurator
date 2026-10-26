export default defineAppConfig({
    ui: {
        primary: 'red',
        notifications: {
            position: 'top-0 bottom-auto'
        },
        tooltip: {
            // Default theme uses `h-6 ... truncate`, which clips long help texts
            // to a single line. Allow wrapping so the whole description shows.
            width: 'max-w-md',
            base: '[@media(pointer:coarse)]:hidden h-auto px-2 py-1 text-xs font-normal whitespace-normal break-words relative'
        }
    },
    nuxtIcon: {}
});
