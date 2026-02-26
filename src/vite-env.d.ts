interface ImportMetaEnv {
    readonly VITE_GEMINI_API_KEY: string
    readonly VITE_FACEBOOK_PAGE_ID: string
    readonly VITE_FACEBOOK_PAGE_ACCESS_TOKEN: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}