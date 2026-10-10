'use client'

import { useState } from 'react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { FormItem, Form } from '@/components/ui'
import PasswordInput from '@/components/shared/PasswordInput'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { CommonProps } from '@/@types/common'

export type SignUpFormSchema = {
    userName: string
    restaurantName: string
    email: string
    password: string
    confirmPassword: string
}

export type OnSignUpPayload = {
    values: SignUpFormSchema
    setSubmitting: (isSubmitting: boolean) => void
    setMessage: (message: string) => void
}

export type OnSignUp = (payload: OnSignUpPayload) => void

interface SignUpFormProps extends CommonProps {
    setMessage: (message: string) => void
    onSignUp?: OnSignUp
}

const validationSchema = z
    .object({
        userName: z.string().min(2, { message: 'Lütfen adınızı ve soyadınızı giriniz' }),
        restaurantName: z.string().min(2, { message: 'Lütfen restoran adınızı giriniz (en az 2 karakter)' }),
        email: z.string().email({ message: 'Lütfen geçerli bir e-posta adresi giriniz' }),
        password: z.string().min(6, { message: 'Şifre en az 6 karakter olmalıdır' }),
        confirmPassword: z.string().min(6, { message: 'Lütfen şifrenizi tekrar giriniz' }),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: 'Şifreler birbiriyle eşleşmiyor',
        path: ['confirmPassword'],
    })

const SignUpForm = (props: SignUpFormProps) => {
    const { onSignUp, className, setMessage } = props

    const [isSubmitting, setSubmitting] = useState<boolean>(false)

    const {
        handleSubmit,
        formState: { errors },
        control,
    } = useForm<SignUpFormSchema>({
        resolver: zodResolver(validationSchema),
        defaultValues: {
            userName: '',
            restaurantName: '',
            email: '',
            password: '',
            confirmPassword: '',
        },
    })

    const handleSignUp = async (values: SignUpFormSchema) => {
        if (onSignUp) {
            onSignUp({ values, setSubmitting, setMessage })
        }
    }

    return (
        <div className={className}>
            <Form onSubmit={handleSubmit(handleSignUp)}>
                <FormItem
                    label="Ad Soyad"
                    invalid={Boolean(errors.userName)}
                    errorMessage={errors.userName?.message}
                >
                    <Controller
                        name="userName"
                        control={control}
                        render={({ field }) => (
                            <Input
                                type="text"
                                placeholder="Adınız ve Soyadınız"
                                autoComplete="name"
                                {...field}
                            />
                        )}
                    />
                </FormItem>
                <FormItem
                    label="Restoran Adı"
                    invalid={Boolean(errors.restaurantName)}
                    errorMessage={errors.restaurantName?.message}
                >
                    <Controller
                        name="restaurantName"
                        control={control}
                        render={({ field }) => (
                            <Input
                                type="text"
                                placeholder="Örn: Lezzet Dünyası"
                                autoComplete="organization"
                                {...field}
                            />
                        )}
                    />
                </FormItem>
                <FormItem
                    label="E-posta"
                    invalid={Boolean(errors.email)}
                    errorMessage={errors.email?.message}
                >
                    <Controller
                        name="email"
                        control={control}
                        render={({ field }) => (
                            <Input
                                type="email"
                                placeholder="ornek@restoran.com"
                                autoComplete="email"
                                {...field}
                            />
                        )}
                    />
                </FormItem>
                <FormItem
                    label="Şifre"
                    invalid={Boolean(errors.password)}
                    errorMessage={errors.password?.message}
                >
                    <Controller
                        name="password"
                        control={control}
                        render={({ field }) => (
                            <PasswordInput
                                placeholder="Şifreniz (en az 6 karakter)"
                                autoComplete="new-password"
                                {...field}
                            />
                        )}
                    />
                </FormItem>
                <FormItem
                    label="Şifre Tekrarı"
                    invalid={Boolean(errors.confirmPassword)}
                    errorMessage={errors.confirmPassword?.message}
                >
                    <Controller
                        name="confirmPassword"
                        control={control}
                        render={({ field }) => (
                            <PasswordInput
                                placeholder="Şifrenizi tekrar giriniz"
                                autoComplete="new-password"
                                {...field}
                            />
                        )}
                    />
                </FormItem>
                <Button
                    block
                    loading={isSubmitting}
                    variant="solid"
                    type="submit"
                >
                    {isSubmitting ? 'Hesap ve Restoran Oluşturuluyor...' : 'Kayıt Ol ve Başla'}
                </Button>
            </Form>
        </div>
    )
}

export default SignUpForm

