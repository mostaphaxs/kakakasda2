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
    const clean = String(val).replace(/\s/g, '').replace(/,/g, '.');
    const num = parseFloat(clean);
    if (isNaN(num)) return String(val);

    return new Intl.NumberFormat('fr-MA', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(num);
};

export const parseNumber = (val: any): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const clean = String(val).replace(/\s/g, '').replace(/,/g, '.');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
};
