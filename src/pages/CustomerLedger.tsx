import { LedgerPage } from '../components/ledger/LedgerParts'

/** The customer's Account Ledger: invoices and payments (owner's ledger spec, Part 2). */
export default function CustomerLedger() {
  return <LedgerPage role="customer" />
}
