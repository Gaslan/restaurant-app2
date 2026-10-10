'use client'

import Logo from '@/components/template/Logo'
import Alert from '@/components/ui/Alert'
import SignUpForm from './SignUpForm'
import OauthSignIn from '@/components/auth/SignIn/OauthSignIn'
import ActionLink from '@/components/shared/ActionLink'
import useTimeOutMessage from '@/utils/hooks/useTimeOutMessage'
import useTheme from '@/utils/hooks/useTheme'
import type { OnSignUp } from './SignUpForm'
import type { OnOauthSignIn } from '@/components/auth/SignIn/OauthSignIn'

type SignUpProps = {
    signInUrl?: string
    onSignUp?: OnSignUp
    onOauthSignUp?: OnOauthSignIn
}

export const SignUp = ({
    onSignUp,
    onOauthSignUp,
    signInUrl = '/sign-in',
}: SignUpProps) => {
    const [message, setMessage] = useTimeOutMessage()

    const mode = useTheme((state) => state.mode)

    return (
        <>
            <div className="mb-6">
                <Logo
                    type="streamline"
                    mode={mode}
                    logoWidth={60}
                    logoHeight={60}
                />
            </div>
            <div className="mb-8">
                <h3 className="mb-1 text-2xl font-bold">Kayıt Olun</h3>
                <p className="font-semibold heading-text text-sm">
                    Restoranınızı ve hesabınızı oluşturup hemen başlayın
                </p>
            </div>
            {message && (
                <Alert showIcon className="mb-4" type="danger">
                    <span className="break-all">{message}</span>
                </Alert>
            )}
            <SignUpForm onSignUp={onSignUp} setMessage={setMessage} />
            <div className="mt-6">
                <div className="flex items-center gap-2 mb-6">
                    <div className="border-t border-gray-200 dark:border-gray-800 flex-1 mt-[1px]" />
                    <p className="font-medium text-xs text-muted-foreground uppercase tracking-wider">
                        veya Google ile devam edin
                    </p>
                    <div className="border-t border-gray-200 dark:border-gray-800 flex-1 mt-[1px]" />
                </div>
                <OauthSignIn
                    setMessage={setMessage}
                    onOauthSignIn={onOauthSignUp}
                />
            </div>
            <div>
                <div className="mt-6 text-center">
                    <span>Zaten bir hesabınız var mı? </span>
                    <ActionLink
                        href={signInUrl}
                        className="heading-text font-bold text-primary underline ml-1"
                        themeColor={false}
                    >
                        Giriş Yap
                    </ActionLink>
                </div>
            </div>
        </>
    )
}

export default SignUp

