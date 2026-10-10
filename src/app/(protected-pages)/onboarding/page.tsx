'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Store, UtensilsCrossed, Phone, DollarSign, ArrowRight, LogOut } from 'lucide-react';
import { Form, FormItem, Input, Button, Select } from '@/components/ui';
import Card from '@/components/ui/Card';
import { authClient } from '@/lib/auth-client';
import type { Currency } from '@/types';

const onboardingSchema = z.object({
    name: z.string().min(2, { message: 'Restoran adı en az 2 karakter olmalıdır' }),
    phone: z.string().optional(),
    currency: z.enum(['TRY', 'USD', 'EUR']),
    description: z.string().optional(),
});

type OnboardingFormData = z.infer<typeof onboardingSchema>;

const currencyOptions = [
    { value: 'TRY', label: 'Türk Lirası (₺ - TRY)' },
    { value: 'USD', label: 'Amerikan Doları ($ - USD)' },
    { value: 'EUR', label: 'Euro (€ - EUR)' },
];

export default function OnboardingPage() {
    const router = useRouter();
    const { data: session } = authClient.useSession();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        handleSubmit,
        formState: { errors },
        control,
    } = useForm<OnboardingFormData>({
        resolver: zodResolver(onboardingSchema),
        defaultValues: {
            name: '',
            phone: '',
            currency: 'TRY',
            description: '',
        },
    });

    const onSubmit = async (values: OnboardingFormData) => {
        setIsSubmitting(true);
        try {
            const response = await fetch('/api/restaurant/setup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(values),
            });

            const data = await response.json();

            if (!response.ok) {
                toast.error(data.error || 'Restoran oluşturulurken bir hata oluştu');
                setIsSubmitting(false);
                return;
            }

            toast.success('Restoranınız başarıyla oluşturuldu! Panele yönlendiriliyorsunuz...');

            // Force session reload / navigate to home
            setTimeout(() => {
                window.location.href = '/home';
            }, 800);
        } catch (error: any) {
            console.error('Onboarding error:', error);
            toast.error(error?.message || 'Bir hata meydana geldi.');
            setIsSubmitting(false);
        }
    };

    const handleSignOut = async () => {
        try {
            await authClient.signOut({
                fetchOptions: {
                    onSuccess: () => {
                        window.location.href = '/sign-in';
                    },
                },
            });
        } catch (e) {
            window.location.href = '/sign-in';
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                {/* Header */}
                <div className="text-center">
                    <div className="mx-auto h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-4 shadow-sm">
                        <Store className="h-8 w-8" />
                    </div>
                    <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                        Restoranınızı Tanımlayın
                    </h2>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        {session?.user?.name
                            ? `Merhaba ${session.user.name}, menülerinizi yönetmek için restoran kaydınızı oluşturalım.`
                            : 'Yönetim panelini kullanmadan önce lütfen restoran bilgilerinizi giriniz.'}
                    </p>
                </div>

                {/* Form Card */}
                <Card className="shadow-lg border border-gray-100 dark:border-gray-800 p-6 sm:p-8 bg-white dark:bg-gray-850 rounded-2xl">
                    <Form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <FormItem
                            label="Restoran Adı *"
                            invalid={Boolean(errors.name)}
                            errorMessage={errors.name?.message}
                        >
                            <Controller
                                name="name"
                                control={control}
                                render={({ field }) => (
                                    <Input
                                        type="text"
                                        placeholder="Örn: Lezzet Dünyası veya Burger House"
                                        prefix={<UtensilsCrossed className="h-4 w-4 text-muted-foreground mr-1" />}
                                        autoFocus
                                        {...field}
                                    />
                                )}
                            />
                        </FormItem>

                        <FormItem
                            label="Telefon Numarası"
                            invalid={Boolean(errors.phone)}
                            errorMessage={errors.phone?.message}
                        >
                            <Controller
                                name="phone"
                                control={control}
                                render={({ field }) => (
                                    <Input
                                        type="tel"
                                        placeholder="Örn: 0532 000 00 00"
                                        prefix={<Phone className="h-4 w-4 text-muted-foreground mr-1" />}
                                        {...field}
                                    />
                                )}
                            />
                        </FormItem>

                        <FormItem
                            label="Para Birimi"
                            invalid={Boolean(errors.currency)}
                            errorMessage={errors.currency?.message}
                        >
                            <Controller
                                name="currency"
                                control={control}
                                render={({ field }) => (
                                    <Select
                                        options={currencyOptions}
                                        value={currencyOptions.find((opt) => opt.value === field.value)}
                                        onChange={(opt: any) => field.onChange(opt?.value || 'TRY')}
                                        placeholder="Para birimi seçin"
                                    />
                                )}
                            />
                        </FormItem>

                        <FormItem
                            label="Kısa Açıklama (İsteğe bağlı)"
                            invalid={Boolean(errors.description)}
                            errorMessage={errors.description?.message}
                        >
                            <Controller
                                name="description"
                                control={control}
                                render={({ field }) => (
                                    <Input
                                        type="text"
                                        placeholder="Örn: Geleneksel lezzetler ve taş fırın pide"
                                        {...field}
                                    />
                                )}
                            />
                        </FormItem>

                        <div className="pt-2">
                            <Button
                                block
                                variant="solid"
                                type="submit"
                                loading={isSubmitting}
                                className="h-11 font-medium text-base shadow-sm"
                            >
                                <span>{isSubmitting ? 'Restoran Oluşturuluyor...' : 'Restoranı Oluştur & Başla'}</span>
                                {!isSubmitting && <ArrowRight className="ml-2 h-4 w-4" />}
                            </Button>
                        </div>
                    </Form>
                </Card>

                {/* Footer Switch Account */}
                <div className="text-center pt-2">
                    <button
                        type="button"
                        onClick={handleSignOut}
                        className="inline-flex items-center text-xs text-muted-foreground hover:text-destructive transition-colors gap-1"
                    >
                        <LogOut className="h-3.5 w-3.5" />
                        <span>Farklı bir hesapla giriş yapmak istiyorum</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
