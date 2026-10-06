import authRoute from './authRoute'
import type { Routes } from '@/@types/routes'

export const protectedRoutes: Routes = {
    '/home': {
        key: 'home',
        authority: [],
        meta: {
            pageBackgroundType: 'plain',
            pageContainerType: 'contained',
        },
    },
    '/menus': {
        key: 'menu-management.menus',
        authority: [],
        meta: {
            pageBackgroundType: 'plain',
            pageContainerType: 'contained',
        },
    },
    '/menu2': {
        key: 'menu-management.menu2',
        authority: [],
        meta: {
            pageBackgroundType: 'plain',
            pageContainerType: 'default',
        },
    },
    '/settings': {
        key: 'settings',
        authority: [],
        meta: {
            pageBackgroundType: 'default',
            pageContainerType: 'contained',
        },
    },
}

export const publicRoutes: Routes = {
    '/qr': {
        key: 'qr',
        authority: [],
        meta: {}
    }
}

export const authRoutes = authRoute
