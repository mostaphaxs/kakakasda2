import React, { useState, useEffect } from 'react';

interface MoneyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'max'> {
    value: number | string;
    onChange: (val: number | '') => void;
    max?: number;
}

export default function MoneyInput({ value, onChange, max, className, ...props }: MoneyInputProps) {
    const [display, setDisplay] = useState('');

    useEffect(() => {
        if (value === '' || value === null || value === undefined) {
            setDisplay('');
        } else {
            const num = Number(value);
            if (!isNaN(num)) {
                setDisplay(num.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
            }
        }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value;
        const commaIndex = val.indexOf(',');

        if (commaIndex !== -1) {
            const whole = val.slice(0, commaIndex).replace(/\D/g, '');
            const fraction = val.slice(commaIndex + 1).replace(/\D/g, '');

            if (fraction.length > 2) {
                const newDigit = fraction.slice(2);
                const combined = (whole || '0') + newDigit;
                const num = parseInt(combined, 10);
                onChange(isNaN(num) ? '' : num);
                return;
            }

            const numVal = parseFloat(`${whole || '0'}.${fraction}`);
            onChange(isNaN(numVal) ? '' : numVal);
        } else {
            const digits = val.replace(/\D/g, '');
            if (!digits) {
                onChange('');
                return;
            }
            const numVal = parseInt(digits, 10);
            onChange(isNaN(numVal) ? '' : numVal);
        }
    };

    return (
        <input
            {...props}
            type="text"
            inputMode="numeric"
            value={display}
            onChange={handleChange}
            className={className}
            onFocus={(e) => e.target.select()}
        />
    );
}
