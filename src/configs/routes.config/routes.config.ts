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
        key: 'menu-management',
        authority: [],
        meta: {
            pageBackgroundType: 'plain',
            pageContainerType: 'contained',
        },
    },
    '/menus/[menuId]': {
        key: 'menu-management',
        authority: [],
        dynamicRoute: true,
        meta: {
            pageBackgroundType: 'plain',
            pageContainerType: 'default',
        },
    },
    '/menus/[menuId]/bulk': {
        key: 'menu-management',
        authority: [],
        dynamicRoute: true,
        meta: {
            pageBackgroundType: 'plain',
            pageContainerType: 'default',
        },
    },
    '/menus/[menuId]/price-editor': {
        key: 'menu-management',
        authority: [],
        dynamicRoute: true,
        meta: {
            pageBackgroundType: 'plain',
            pageContainerType: 'default',
        },
    },
    '/menus/[menuId]/categories/[categoryId]': {
        key: 'menu-management',
        authority: [],
        dynamicRoute: true,
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
    '/onboarding': {
        key: 'onboarding',
        authority: [],
        meta: {
            layout: 'blank',
            pageBackgroundType: 'plain',
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
