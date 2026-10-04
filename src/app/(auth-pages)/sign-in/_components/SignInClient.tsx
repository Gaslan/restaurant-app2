'use client'

import SignIn from '@/components/auth/SignIn'
import { authClient } from '@/lib/auth-client'
import { REDIRECT_URL_KEY } from '@/constants/app.constant'
import { useSearchParams } from 'next/navigation'
import type {
    OnSignInPayload,
    OnOauthSignInPayload,
} from '@/components/auth/SignIn'

const SignInClient = () => {
    const searchParams = useSearchParams()
    const callbackUrl = searchParams.get(REDIRECT_URL_KEY)

    const handleSignIn = async ({
        values,
        setSubmitting,
        setMessage,
    }: OnSignInPayload) => {
        setSubmitting(true)

        try {
            const { data, error } = await authClient.signIn.email({
                email: values.email,
                password: values.password,
                callbackURL: callbackUrl || '/home',
            })

            if (error) {
                setMessage(error.message || 'Giriş başarısız')
                setSubmitting(false)
            }
        } catch (err: any) {
            setMessage(err.message || 'Giriş başarısız')
            setSubmitting(false)
        }
    }

    const handleOAuthSignIn = async ({ type }: OnOauthSignInPayload) => {
        try {
            await authClient.signIn.social({
                provider: type as 'google' | 'github',
                callbackURL: callbackUrl || '/home',
            })
        } catch (err: any) {
            console.error(err)
        }
    }

    return <SignIn onSignIn={handleSignIn} onOauthSignIn={handleOAuthSignIn} />
}

export default SignInClient
