// lazyDocs.ts — the PDF generator (jsPDF) is heavy: load it only when a
// document is actually requested, not at app startup.
import type { SaleDocKind, Statement } from './documents';

const docs = () => import('./documents');

export const downloadReceipt = (clientId: number, paymentId: number) => docs().then(m => m.downloadReceipt(clientId, paymentId));
export const downloadStatement = (clientId: number) => docs().then(m => m.downloadStatement(clientId));
export const downloadSaleDocument = (kind: SaleDocKind, clientId: number) => docs().then(m => m.downloadSaleDocument(kind, clientId));
export const downloadMonthlyReport = (month: string) => docs().then(m => m.downloadMonthlyReport(month));
export const fetchStatement = (clientId: number): Promise<Statement> => docs().then(m => m.fetchStatement(clientId));
export type { SaleDocKind, Statement };
