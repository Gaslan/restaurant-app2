import React from 'react';
import { Select } from '@/components/ui';

export interface Option {
    label: string;
    value: string;
}

export interface MultiSelectProps {
    options: Option[];
    value: string[];
    onChange: (value: string[]) => void;
    placeholder?: string;
    className?: string;
}

export function MultiSelect({ options, value, onChange, placeholder, className }: MultiSelectProps) {
    // Map string values to Option objects for React Select
    const selectedOptions = options.filter(option => value?.includes(option.value));

    // Handle change from React Select
    const handleChange = (newSelectedOptions: any) => {
        const values = newSelectedOptions ? newSelectedOptions.map((opt: Option) => opt.value) : [];
        onChange(values);
    };

    return (
        <Select<Option, true>
            isMulti
            options={options}
            value={selectedOptions}
            onChange={handleChange}
            placeholder={placeholder}
            className={className}
        />
    );
}
