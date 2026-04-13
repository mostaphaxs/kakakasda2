import React from 'react';

interface MarkdownTextProps {
    text: string | null | undefined;
}

const MarkdownText: React.FC<MarkdownTextProps> = ({ text }) => {
    if (!text) return null;

    // Simple bold markdown renderer (support **bold**)
    const parts = String(text).split(/(\*\*.*?\*\*)/g);

    return (
        <span>
            {parts.map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={i}>{part.slice(2, -2)}</strong>;
                }
                return part;
            })}
        </span>
    );
};

export default MarkdownText;
