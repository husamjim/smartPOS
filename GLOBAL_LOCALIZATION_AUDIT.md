# Global Localization Audit Report
## smartPOS Global ERP/POS Migration

This report outlines the complete removal of Saudi/KSA-specific assumptions and details the newly integrated localization architecture enabling smartPOS to operate as a fully global, country-agnostic POS and ERP solution.

---

### 1. Hardcoded Saudi Assumptions Removed
The following hardcoded values and assumptions have been purged from the codebase:

*   **Hardcoded Currencies**: Removed all static references to `SAR` (Saudi Riyal) across the cashier interface, wholesale pricing calculations, CRM customer logs, ERP production modules, shipment tariff records, and financial P&L/balance sheet/VAT reports. The system now dynamically renders values using the company's active `currency` state.
*   **KSA-Centric Seed Data**: Replaced الرياض (Riyadh) and جدة (Jeddah) branch initializations in Dexie seeds (`localDb.ts`) with generic counterparts (`br_main`, `br_secondary`). Purged specific warehouse designations (`wh_riyadh_1`, `wh_riyadh_2`) and replaced them with generic keys (`wh_main_1`, `wh_main_2`).
*   **Saudi VAT Limits**: Removed the hardcoded flat `15%` VAT assumption and "ZATCA QR" representation from receipts, report disclaimers, and cart calculations.
*   **Input Placeholders**: Removed Saudi-specific phone number prefixes (`+966`), Riyadh address placeholders, and Al Rajhi Bank labels in the template sheets and setup screens.

---

### 2. Globalized Localization Architecture Added
A comprehensive dynamic localization engine has been integrated into the system:

1.  **ISO-3166 Mappings (`countries.ts`)**:
    *   Added a database of global countries mapped to their ISO codes, local currencies, native dialing codes, timezones, and major cities.
2.  **Adaptive Setup Wizard (`SetupWizard.tsx`) & Store Config (`Settings.tsx`)**:
    *   Selecting a country dynamically configures the dialing prefix, pre-selects the native currency, loads matching timezones, and filters city options using HTML datalists.
    *   Exposed all company profile attributes (Country, City, Postal Code, CR Number, Tax ID, Phone, Address, Logo) in the dashboard settings panel.
3.  **Flexible Tax Registry**:
    *   Enabled merchant-defined **Tax Name** (e.g., VAT, GST, Sales Tax, Zero Tax) and **Tax Rate (%)** rather than hardcoded schemas.
4.  **Number and Date Locale Formats**:
    *   Integrated **Locale Number Formatting** (e.g., `1,234.50` vs. `1.234,50`) using `Intl.NumberFormat`.
    *   Enabled selection between **Gregorian** and **Hijri** calendar systems, along with customizable date display patterns.
5.  **Globalized Receipts**:
    *   Refactored receipt templates to dynamically inject company logos, addresses, phone details, custom tax labels/rates, and a secure compliance-ready QR structure.

---

### 3. Readiness Status
*   **Single Codebase Integrity**: Maintained perfect boundary separation between Offline/Desktop (Electron) and Online/Web environments.
*   **TypeScript Standard**: Fully compliant with strict typing rules.
*   **Deployment Status**: Production-ready for worldwide distribution.
