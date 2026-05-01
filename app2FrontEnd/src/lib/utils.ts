export const stripMarkdown = (text: string | null | undefined): string => {
    if (!text) return '';
    return String(text).replace(/\*\*(.*?)\*\*/g, '$1');
};

/**
 * Converts a number to its French word representation.
 * Optimized for Moroccan Dirhams (MAD).
 */
export const numberToFrenchWords = (n: number): string => {
    if (n === 0) return "zéro";

    const ones = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf"];
    const teens = ["dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
    const tens = ["", "dix", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante-dix", "quatre-vingt", "quatre-vingt-dix"];

    const convertChunk = (num: number): string => {
        let chunkStr = "";

        if (num >= 100) {
            const h = Math.floor(num / 100);
            if (h > 1) {
                chunkStr += ones[h] + " cent";
                if (num % 100 === 0) chunkStr += "s";
            } else {
                chunkStr += "cent";
            }
            num %= 100;
            if (num > 0) chunkStr += " ";
        }

        if (num >= 20) {
            const t = Math.floor(num / 10);
            const u = num % 10;

            if (t === 7 || t === 9) {
                chunkStr += tens[t - 1];
                if (u === 1 && t === 7) {
                    chunkStr += " et " + teens[u];
                } else {
                    chunkStr += "-" + teens[u];
                }
            } else {
                chunkStr += tens[t];
                if (u === 1 && t !== 8) {
                    chunkStr += " et " + ones[u];
                } else if (u > 0) {
                    chunkStr += "-" + ones[u];
                }
                if (t === 8 && u === 0 && chunkStr.endsWith("vingt")) {
                    chunkStr += "s";
                }
            }
        } else if (num >= 10) {
            chunkStr += teens[num - 10];
        } else if (num > 0) {
            chunkStr += ones[num];
        }

        return chunkStr;
    };

    const integerPart = Math.floor(n);
    const fractionalPart = Math.round((n - integerPart) * 100);

    let result = "";

    if (integerPart >= 1000000) {
        const millions = Math.floor(integerPart / 1000000);
        result += convertChunk(millions) + " million" + (millions > 1 ? "s" : "") + " ";
        result += numberToFrenchWords(integerPart % 1000000);
    } else if (integerPart >= 1000) {
        const thousands = Math.floor(integerPart / 1000);
        if (thousands > 1) {
            result += convertChunk(thousands) + " mille ";
        } else {
            result += "mille ";
        }
        const rest = integerPart % 1000;
        if (rest > 0) result += convertChunk(rest);
    } else {
        result += convertChunk(integerPart);
    }

    result = result.trim();

    if (fractionalPart > 0) {
        return `${result} Dirhams et ${convertChunk(fractionalPart)} Centimes`;
    }

    return `${result} Dirhams`;
};

export const formatNumber = (val: any): string => {
    if (val === undefined || val === null || val === '') return '';

    if (typeof val === 'number') {
        return new Intl.NumberFormat('fr-MA', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(val).replace(/\s/g, '.');
    }

    let str = String(val);

    // Removing existing formatting to analyze raw entry
    // We remove spaces and dots (which represent thousands in fr-MA)
    str = str.replace(/\s/g, '').replace(/\./g, '');

    if (str.includes(',')) {
        const parts = str.split(',');
        const intPart = parts[0];
        // Ensure decimal part is digits only, max 2 chars
        const decPart = parts.slice(1).join('').replace(/[^0-9]/g, '').slice(0, 2);

        let formattedInt = '0';
        if (intPart === '-') {
            formattedInt = '-';
        } else if (intPart !== '') {
            const numInt = parseInt(intPart, 10);
            if (!isNaN(numInt)) {
                formattedInt = new Intl.NumberFormat('fr-MA').format(numInt).replace(/\s/g, '.');
            }
        }

        return `${formattedInt},${decPart}`;
    }

    const num = parseNumber(val);
    if (isNaN(num)) return str;

    return new Intl.NumberFormat('fr-MA', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(num).replace(/\s/g, '.');
};

export const parseNumber = (val: any): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;

    const str = String(val);

    // If it's a backend/system float format with exactly one dot and 1 or 2 decimal digits.
    // We avoid matching 3 digits (e.g., \.\d{3}) because that indicates a thousands separator in our format (e.g. 15.000).
    if (/^-?\d+\.\d{1,2}$/.test(str)) {
        return parseFloat(str);
    }

    // In this application, we use dots (.) as thousands separators and commas (,) as decimals.
    // So we remove spaces and dots, then convert comma to dot for parsing.
    const clean = str.replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '.');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
};

/**
 * Parses a date string safely, supporting both ISO and French (d/m/Y) formats.
 */
export const parseDate = (dateStr: string | null | undefined): Date => {
    if (!dateStr) return new Date();

    // Check if it's in d/m/Y format (e.g., 29/04/2024)
    const frenchMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (frenchMatch) {
        const [_, d, m, y] = frenchMatch;
        return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    }

    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? new Date() : d;
};
