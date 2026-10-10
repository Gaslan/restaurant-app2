import { NextResponse, type NextRequest } from "next/server";

import {
    authRoutes as _authRoutes,
    publicRoutes as _publicRoutes,
} from '@/configs/routes.config'
import { REDIRECT_URL_KEY } from '@/constants/app.constant'
import appConfig from '@/configs/app.config'

const publicRoutes = Object.entries(_publicRoutes).map(([key]) => key)
const authRoutes = Object.entries(_authRoutes).map(([key]) => key)

export default async function authMiddleware(request: NextRequest) {
    const { nextUrl } = request

    /** Skip proxy for API routes and static assets */
    if (nextUrl.pathname.startsWith('/api') || nextUrl.pathname.startsWith('/_next')) {
        return NextResponse.next()
    }

    const isPublicRoute = publicRoutes.some(
        (route) => nextUrl.pathname === route || nextUrl.pathname.startsWith(`${route}/`)
    )
    const isAuthRoute = authRoutes.includes(nextUrl.pathname)
    const isOnboardingRoute = nextUrl.pathname === '/onboarding'

    let isSignedIn = false
    let restaurantId: string | null = null

    try {
        const response = await fetch(`${request.nextUrl.origin}/api/auth/get-session`, {
            headers: {
                cookie: request.headers.get("cookie") || "",
            },
        })
        if (response.ok) {
            const data = await response.json()
            isSignedIn = !!data?.session
            restaurantId = data?.user?.restaurantId || null
        }
    } catch (err) {
        console.error("Middleware session check failed", err)
    }

    // 1. If signed in
    if (isSignedIn) {
        // If user does not have a restaurant associated yet, force them to /onboarding
        if (!restaurantId) {
            if (!isOnboardingRoute) {
                return Response.redirect(new URL('/onboarding', nextUrl))
            }
            return NextResponse.next()
        }

        // If user already has a restaurant and is on /onboarding, send to home
        if (isOnboardingRoute) {
            return Response.redirect(new URL(appConfig.authenticatedEntryPath, nextUrl))
        }

        // If user is on an auth route (e.g. /sign-in, /sign-up), redirect to home
        if (isAuthRoute) {
            return Response.redirect(new URL(appConfig.authenticatedEntryPath, nextUrl))
        }

        return NextResponse.next()
    }

    // 2. If not signed in
    if (isOnboardingRoute) {
        return Response.redirect(new URL(appConfig.unAuthenticatedEntryPath, nextUrl))
    }

    if (isAuthRoute || isPublicRoute) {
        return NextResponse.next()
    }

    // Redirect to sign-in for any other protected routes
    let callbackUrl = nextUrl.pathname
    if (nextUrl.search) {
        callbackUrl += nextUrl.search
    }

    return Response.redirect(
        new URL(
            `${appConfig.unAuthenticatedEntryPath}?${REDIRECT_URL_KEY}=${callbackUrl}`,
            nextUrl,
        ),
    )
}

export const config = {
    matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api)(.*)'],
}
