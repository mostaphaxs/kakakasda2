import React, { useState, useEffect } from 'react';

interface FormattedNumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
    value?: number;
    onChange: (value: number) => void;
}

const FormattedNumberInput: React.FC<FormattedNumberInputProps> = ({ value, onChange, className, ...props }) => {
    const [displayValue, setDisplayValue] = useState<string>('');

    useEffect(() => {
        if (value !== undefined && value !== null && !Number.isNaN(value)) {
            const formatted = value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const currentNumber = parseFormattedString(displayValue);
            if (currentNumber !== value) {
                setDisplayValue(formatted);
            }
        } else if (value === undefined || value === null || Number.isNaN(value)) {
            setDisplayValue('');
        }
    }, [value]);

    const parseFormattedString = (str: string) => {
        if (!str) return 0;
        // Remove periods (thousand separators) and replace comma with period
        const cleaned = str.replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '');
        return parseFloat(cleaned);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value;
        // allow users to type numbers, comma, and period
        val = val.replace(/[^0-9.,]/g, '');
        setDisplayValue(val);

        const numericValue = parseFormattedString(val);
        if (!isNaN(numericValue)) {
            onChange(numericValue);
        } else {
            onChange(0);
        }
    };

    const handleBlur = () => {
        if (displayValue) {
            const numericValue = parseFormattedString(displayValue);
            if (!isNaN(numericValue)) {
                setDisplayValue(numericValue.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
            }
        }
    };

    return (
        <input
            {...props}
            type="text"
            className={className}
            value={displayValue}
            onChange={handleChange}
            onBlur={handleBlur}
        />
    );
};

export default FormattedNumberInput;
