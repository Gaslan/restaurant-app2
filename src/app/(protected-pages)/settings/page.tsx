import React from 'react';
import type { Metadata } from 'next';
import Container from '@/components/shared/Container';
import { SettingsView } from '@/views/admin/settings/settings-view';

export const metadata: Metadata = {
    title: 'Settings | Restaurant App',
    description: 'Manage restaurant details, appearance, and social media settings',
};

export default function SettingsPage() {
    return (
        <div className="w-full min-h-full bg-[#f4f5f6]">
            <Container className="bg-[#f4f5f6]">
                <SettingsView />
            </Container>
        </div>
    );
}
