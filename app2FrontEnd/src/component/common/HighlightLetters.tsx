import React from 'react';

interface HighlightLettersProps {
    text: string | number | null | undefined;
}

export const HighlightLetters: React.FC<HighlightLettersProps> = ({ text }) => {
    if (text === null || text === undefined || text === '') {
        return <></>;
    }

    const str = String(text);
    const parts = str.split(/([a-zA-Z]+)/);

    return (
        <>
            {parts.map((part, i) => {
                if (/[a-zA-Z]+/.test(part)) {
                    return <strong key={i} className="font-extrabold text-gray-900">{part}</strong>;
                }
                return <React.Fragment key={i}>{part}</React.Fragment>;
            })}
        </>
    );
};
