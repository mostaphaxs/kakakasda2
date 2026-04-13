import React, { useRef, useEffect, useState } from 'react';
import { Bold, Sparkles } from 'lucide-react';

interface EnhancedInputProps {
    type?: 'input' | 'textarea';
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    className?: string;
    showPolite?: boolean;
    rows?: number;
    dir?: string;
}

const htmlToMarkdown = (html: string) => {
    let text = html;
    // Handle basic formatting
    text = text.replace(/<b>(.*?)<\/b>/g, '**$1**');
    text = text.replace(/<strong>(.*?)<\/strong>/g, '**$1**');
    // Handle line breaks from divs (Safari/Chrome style)
    text = text.replace(/<div>(.*?)<\/div>/g, '\n$1');
    text = text.replace(/<br\s*\/?>/g, '\n');
    // Strip other tags
    text = text.replace(/<[^>]*>/g, '');
    // Decode entities
    const doc = new DOMParser().parseFromString(text, 'text/html');
    return doc.documentElement.textContent || '';
};

const markdownToHtml = (md: string) => {
    if (!md) return '';
    return md
        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
        .replace(/\n/g, '<br>');
};

const EnhancedInput: React.FC<EnhancedInputProps> = ({
    type = 'input',
    value,
    onChange,
    placeholder,
    className,
    showPolite = false,
    rows = 3,
    dir
}) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const [isFocused, setIsFocused] = useState(false);

    // Initial content load
    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== markdownToHtml(value)) {
            // Only update if external value sync is needed
            // To prevent cursor jump, we only update if not focused or if value significantly different
            if (!isFocused) {
                editorRef.current.innerHTML = markdownToHtml(value);
            }
        }
    }, [value, isFocused]);

    const handleInput = () => {
        if (editorRef.current) {
            const html = editorRef.current.innerHTML;
            const md = htmlToMarkdown(html);
            onChange(md);
        }
    };

    const applyBold = (e: React.MouseEvent) => {
        e.preventDefault();
        document.execCommand('bold', false);
        handleInput();
    };

    const applyPolite = (e: React.MouseEvent) => {
        e.preventDefault();
        if (!value.toLowerCase().includes("bonjour")) {
            const politeText = `Bonjour,\n\n${value}`;
            onChange(politeText);
            if (editorRef.current) {
                editorRef.current.innerHTML = markdownToHtml(politeText);
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (type === 'input' && e.key === 'Enter') {
            e.preventDefault(); // Prevent multi-line in "input" type
        }
    };

    const isEmpty = !value || value === '';

    return (
        <div className="relative group w-full">
            <div
                ref={editorRef}
                contentEditable
                onInput={handleInput}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onKeyDown={handleKeyDown}
                dir={dir}
                className={`${className} overflow-y-auto outline-none transition-all pr-12 min-h-[40px] ${type === 'textarea' ? 'h-auto' : 'flex items-center whitespace-nowrap overflow-x-hidden'
                    } ${isEmpty && !isFocused ? 'before:content-[attr(data-placeholder)] before:text-slate-400 before:absolute' : ''}`}
                data-placeholder={placeholder}
                style={{
                    height: type === 'textarea' ? `${rows * 1.5}rem` : undefined,
                }}
            />

            {/* Toolbar */}
            <div className={`absolute right-2 top-1.5 flex items-center gap-1 transition-opacity duration-200 ${isFocused || value ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                <button
                    type="button"
                    onMouseDown={applyBold}
                    className="p-1 rounded bg-white/90 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 border border-slate-200 shadow-sm transition-all active:scale-90"
                    title="Gras (Sélection)"
                >
                    <Bold size={14} />
                </button>
                {showPolite && (
                    <button
                        type="button"
                        onMouseDown={applyPolite}
                        className="p-1 rounded bg-white/90 text-amber-500 hover:text-amber-700 hover:bg-amber-50 border border-amber-200 shadow-sm transition-all active:scale-90"
                        title="Style Poli"
                    >
                        <Sparkles size={14} />
                    </button>
                )}
            </div>
        </div>
    );
};

export default EnhancedInput;
