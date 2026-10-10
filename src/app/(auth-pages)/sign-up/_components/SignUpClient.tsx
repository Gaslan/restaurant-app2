'use client'

import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import SignUp from '@/components/auth/SignUp'
import { authClient } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'
import type { OnSignUpPayload } from '@/components/auth/SignUp'
import type { OnOauthSignInPayload } from '@/components/auth/SignIn/OauthSignIn'

const SignUpClient = () => {
    const router = useRouter()

    const handleSignUp = async ({
        values,
        setSubmitting,
        setMessage,
    }: OnSignUpPayload) => {
        try {
            setSubmitting(true)

            // 1. Register user and create restaurant on server
            const response = await fetch('/api/auth/sign-up', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userName: values.userName,
                    restaurantName: values.restaurantName,
                    email: values.email,
                    password: values.password,
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                setMessage(data.error || 'Kayıt işlemi sırasında bir hata oluştu.')
                setSubmitting(false)
                return
            }

            // 2. Automatically sign in with credentials
            const { error: signInError } = await authClient.signIn.email({
                email: values.email,
                password: values.password,
                callbackURL: '/home',
            })

            if (signInError) {
                // If auto-login fails, redirect to sign-in page with informative toast
                toast.push(
                    <Notification title="Hesabınız ve Restoranınız Oluşturuldu!" type="success">
                        Lütfen giriş sayfasından giriş yapınız.
                    </Notification>,
                )
                router.push('/sign-in')
            } else {
                toast.push(
                    <Notification title="Hoş Geldiniz!" type="success">
                        Hesabınız ve restoranınız başarıyla oluşturuldu.
                    </Notification>,
                )
                router.push('/home')
                router.refresh()
            }
        } catch (error: any) {
            console.error('Registration client error:', error)
            setMessage(error?.message || 'Beklenmeyen bir hata oluştu.')
        } finally {
            setSubmitting(false)
        }
    }

    const handleOAuthSignUp = async ({ type }: OnOauthSignInPayload) => {
        try {
            await authClient.signIn.social({
                provider: type as 'google' | 'github',
                callbackURL: '/home',
            })
        } catch (err: any) {
            console.error('OAuth sign up error:', err)
        }
    }

    return (
        <SignUp
            onSignUp={handleSignUp}
            onOauthSignUp={handleOAuthSignUp}
        />
    )
}

export default SignUpClient
