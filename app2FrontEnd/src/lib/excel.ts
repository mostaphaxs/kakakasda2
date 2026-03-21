import * as XLSX from 'xlsx';

/**
 * Calculates optimal column widths for a worksheet
 */
const autoFitColumns = (data: any[], worksheet: XLSX.WorkSheet) => {
    if (data.length === 0) return;
    const keys = Object.keys(data[0]);
    const colWidths = keys.map(key => {
        let maxLen = key.toString().length;
        data.forEach(row => {
            const val = row[key];
            if (val !== null && val !== undefined) {
                const len = val.toString().length;
                if (len > maxLen) maxLen = len;
            }
        });
        // Minimum width of 10, max of 50
        return { wch: Math.min(Math.max(maxLen + 4, 10), 50) };
    });
    worksheet['!cols'] = colWidths;
};

/**
 * Adds a summary row to the data if provided
 */
const addSummaryRow = (data: any[]) => {
    if (data.length === 0) return data;

    const summaryRow: any = {};
    const keys = Object.keys(data[0]);
    const rowCount = data.length;

    keys.forEach((key, index) => {
        if (index === 0) {
            summaryRow[key] = `TOTAL (${rowCount} Lignes)`;
        } else {
            // Check if column is numeric
            // We ignore keys that look like IDs, TF (Title Numbers), or Phone numbers
            const isExcluded = key.toLowerCase().includes('id') ||
                key.toLowerCase().includes('phone') ||
                key.toLowerCase().includes('téléphone') ||
                key.toLowerCase().includes('tf') ||
                key.toLowerCase().includes('ice') ||
                key.toLowerCase().includes('rc') ||
                key.toLowerCase().includes('cin');

            // Find first numeric-like value
            const firstVal = data.find(r => r[key] !== null && r[key] !== undefined && r[key] !== '')?.[key];

            if (!isExcluded && (typeof firstVal === 'number' || (!isNaN(Number(firstVal)) && firstVal !== ''))) {
                const total = data.reduce((sum, row) => sum + (parseFloat(String(row[key])) || 0), 0);
                summaryRow[key] = Math.round(total * 100) / 100; // Round to 2 decimals
            } else {
                summaryRow[key] = "";
            }
        }
    });

    return [...data, summaryRow];
};

/**
 * Exports data to an Excel file (.xlsx) with a single sheet
 * @param data Array of objects to export
 * @param fileName Name of the file (without extension)
 * @param includeSummary Whether to add a total row
 */
export const exportToExcel = (data: any[], fileName: string, includeSummary = false) => {
    if (!data || data.length === 0) {
        console.warn("No data to export");
        return;
    }

    const processedData = includeSummary ? addSummaryRow(data) : data;
    const worksheet = XLSX.utils.json_to_sheet(processedData);
    autoFitColumns(processedData, worksheet);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

/**
 * Exports multiple datasets to a single Excel file with multiple sheets
 * @param sheets Array of { sheetName, data, includeSummary } objects
 * @param fileName Name of the file (without extension)
 */
export const exportMultiSheetToExcel = (sheets: { sheetName: string, data: any[], includeSummary?: boolean }[], fileName: string) => {
    if (!sheets || sheets.length === 0) {
        console.warn("No sheets to export");
        return;
    }

    const workbook = XLSX.utils.book_new();

    sheets.forEach(sheet => {
        if (sheet.data && sheet.data.length > 0) {
            const processedData = sheet.includeSummary ? addSummaryRow(sheet.data) : sheet.data;
            const worksheet = XLSX.utils.json_to_sheet(processedData);
            autoFitColumns(processedData, worksheet);
            XLSX.utils.book_append_sheet(workbook, worksheet, sheet.sheetName);
        }
    });

    if (workbook.SheetNames.length === 0) {
        console.warn("No data found in any sheet");
        return;
    }

    XLSX.writeFile(workbook, `${fileName}.xlsx`);
};
