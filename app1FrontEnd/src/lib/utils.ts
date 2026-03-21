/**
 * Formats a number or string as a currency/number with thousands separators.
 * Example: 1000000 -> 1.000.000
 */
export const formatNumber = (value: number | string | undefined | null): string => {
    if (value === undefined || value === null || value === '') return '';

    let numValue: number;

    if (typeof value === 'number') {
        numValue = value;
    } else {
        const str = value.trim();

        // API format is usually "121200.00" (dot followed by 2 digits)
        // User format is "121.200" (dot followed by 3 digits) or "121200"

        if (/^\d+\.\d{2}$/.test(str) || /^\d+$/.test(str)) {
            // Likely API float string or clean integer string
            numValue = parseFloat(str);
        } else if (/^\d+\.\d{1}$/.test(str)) {
            // Also possible API float "121.2"
            numValue = parseFloat(str);
        } else {
            // Likely a formatted string (from user input), e.g. "121.200"
            // Strip ALL dots and commas
            const clean = str.replace(/\./g, '').replace(/,/g, '');
            numValue = parseFloat(clean);
        }
    }

    if (isNaN(numValue)) return '';

    // Round to integer as per user requirement 
    // (They specifically asked for NO commas and dots every 3 numbers)
    const rounded = Math.round(numValue);

    return new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(rounded).replace(/\s/g, '.');
};

/**
 * Parses a formatted string back into a number.
 * Example: 1.000.000,50 -> 1000000.50
 */
export const parseNumber = (value: string | number | undefined | null): number => {
    if (value === undefined || value === null || value === '') return 0;
    if (typeof value === 'number') return value;

    // Remove all periods (thousands separators) and commas
    const cleanValue = value.toString().replace(/\./g, '').replace(/,/g, '');
    const num = parseFloat(cleanValue);
    return isNaN(num) ? 0 : num;
};

/**
 * Formats for display in specific Moroccan style if needed, 
 * but the user specifically asked for dots like 100.000.000
 */
export const formatMoroccan = (val: number | string): string => {
    if (val === undefined || val === null || val === '') return '';
    const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/\s/g, ''));
    if (isNaN(num)) return '';

    return new Intl.NumberFormat('fr-MA', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(num).replace(/\s/g, '.'); // Replace default space with dot if requested
};
