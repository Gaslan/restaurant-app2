import type { Route } from '@/@types/routes'
import { protectedRoutes, publicRoutes } from '@/configs/routes.config'

const routes = { ...publicRoutes, ...protectedRoutes }

export const matchRoute = (path: string): Route | null => {
    const normalizedPath = path.endsWith('/') ? path.slice(0, -1) : path

    if (routes[normalizedPath]) {
        return routes[normalizedPath]
    }

    const inputSegments = normalizedPath.split('/').filter(Boolean)

    let bestMatch: Route | null = null
    let highestMatchScore = -1

    for (const [routePath, route] of Object.entries(routes)) {
        if (!route.dynamicRoute) continue

        const routeSegments = routePath.split('/').filter(Boolean)

        if (routeSegments.length !== inputSegments.length) {
            continue
        }

        let matchScore = 0
        let isMatch = true

        for (let i = 0; i < routeSegments.length; i++) {
            const routeSegment = routeSegments[i]
            const inputSegment = inputSegments[i]

            if (routeSegment.startsWith('[') && routeSegment.endsWith(']')) {
                continue
            }

            if (routeSegment === inputSegment) {
                matchScore++
            } else {
                isMatch = false
                break
            }
        }

        if (isMatch && matchScore > highestMatchScore) {
            highestMatchScore = matchScore
            bestMatch = route
        }
    }

    // Fallback: If no direct or dynamic route matched, try parent path matching (e.g. /menus/... -> /menus)
    if (!bestMatch) {
        for (let i = inputSegments.length - 1; i > 0; i--) {
            const parentPath = '/' + inputSegments.slice(0, i).join('/')
            if (routes[parentPath]) {
                return routes[parentPath]
            }
        }
    }

    return bestMatch
}

export default matchRoute
