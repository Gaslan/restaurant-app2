import { authClient } from '@/lib/auth-client'

const useCurrentSession = () => {
    const { data: session } = authClient.useSession()

    return {
        session,
    }
}

export default useCurrentSession
