'use client'

import { Toaster as SonnerToaster } from 'sonner'
import useTheme from '@/utils/hooks/useTheme'

export function Toaster() {
    let mode: 'light' | 'dark' = 'light'
    try {
        const themeMode = useTheme((state) => state.mode)
        if (themeMode === 'dark' || themeMode === 'light') {
            mode = themeMode
        }
    } catch {
        mode = 'light'
    }

    return (
        <SonnerToaster
            theme={mode}
            position="top-right"
            richColors
            closeButton={false}
        />
    )
}

export default Toaster
