import { LedgerPage } from '../components/ledger/LedgerParts'

/** The provider's Account Ledger: invoices sent, platform charges, payouts and GST (owner's ledger spec, Part 2). */
export default function ProviderLedger() {
  return <LedgerPage role="provider" />
}
