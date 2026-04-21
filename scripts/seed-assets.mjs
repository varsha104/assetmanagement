/**
 * Seed Script — Adds sample tangible & intangible assets to the backend.
 * 
 * Run with:  node scripts/seed-assets.mjs
 * 
 * Make sure the backend is running at http://127.0.0.1:5002
 */

const BASE = 'http://127.0.0.1:5002';

// ─── Tangible Assets ────────────────────────────────────────────────────────

const tangibleAssets = [
    { product_name: 'MacBook Pro 16"', serial_number: 'MBP-2024-001', company: 'Apple', purchase_date: '2024-01-15', status: 'In stock', condition: 'New' },
    { product_name: 'MacBook Air M3', serial_number: 'MBA-2024-002', company: 'Apple', purchase_date: '2024-02-10', status: 'In stock', condition: 'New' },
    { product_name: 'Dell XPS 15', serial_number: 'DXP-2024-003', company: 'Dell', purchase_date: '2024-03-05', status: 'In stock', condition: 'New' },
    { product_name: 'Dell Monitor 27" 4K', serial_number: 'DM4-2024-004', company: 'Dell', purchase_date: '2024-01-20', status: 'In stock', condition: 'New' },
    { product_name: 'Dell Monitor 24" FHD', serial_number: 'DM2-2024-005', company: 'Dell', purchase_date: '2024-04-12', status: 'In stock', condition: 'New' },
    { product_name: 'iPhone 15 Pro', serial_number: 'IP5-2024-006', company: 'Apple', purchase_date: '2024-02-25', status: 'In stock', condition: 'New' },
    { product_name: 'Samsung Galaxy S24', serial_number: 'SGS-2024-007', company: 'Samsung', purchase_date: '2024-03-18', status: 'In stock', condition: 'New' },
    { product_name: 'Logitech MX Keys', serial_number: 'LMK-2024-008', company: 'Logitech', purchase_date: '2024-01-08', status: 'In stock', condition: 'New' },
    { product_name: 'Logitech MX Master 3S', serial_number: 'LMM-2024-009', company: 'Logitech', purchase_date: '2024-01-08', status: 'In stock', condition: 'New' },
    { product_name: 'Logitech C920 Webcam', serial_number: 'LCW-2024-010', company: 'Logitech', purchase_date: '2024-05-01', status: 'In stock', condition: 'New' },
    { product_name: 'ThinkPad X1 Carbon', serial_number: 'TPX-2024-011', company: 'Lenovo', purchase_date: '2024-04-20', status: 'In stock', condition: 'New' },
    { product_name: 'HP EliteBook 840', serial_number: 'HPE-2024-012', company: 'HP', purchase_date: '2024-06-01', status: 'In stock', condition: 'New' },
    { product_name: 'HP LaserJet Pro M404', serial_number: 'HLP-2024-013', company: 'HP', purchase_date: '2023-11-15', status: 'In stock', condition: 'Good' },
    { product_name: 'Epson EcoTank L3250', serial_number: 'EEL-2024-014', company: 'Epson', purchase_date: '2024-07-10', status: 'In stock', condition: 'New' },
    { product_name: 'Samsung 49" Curved', serial_number: 'SCM-2024-015', company: 'Samsung', purchase_date: '2024-05-22', status: 'In stock', condition: 'New' },
    { product_name: 'iPad Pro 12.9"', serial_number: 'IPD-2024-016', company: 'Apple', purchase_date: '2024-08-01', status: 'In stock', condition: 'New' },
    { product_name: 'Microsoft Surface Pro', serial_number: 'MSP-2024-017', company: 'Microsoft', purchase_date: '2024-09-05', status: 'In stock', condition: 'New' },
    { product_name: 'APC UPS 1500VA', serial_number: 'APC-2024-018', company: 'APC', purchase_date: '2024-03-30', status: 'In stock', condition: 'New' },
    { product_name: 'Cisco Router RV345', serial_number: 'CRR-2024-019', company: 'Cisco', purchase_date: '2024-02-14', status: 'In stock', condition: 'New' },
    { product_name: 'Jabra Evolve2 75', serial_number: 'JEH-2024-020', company: 'Jabra', purchase_date: '2024-06-18', status: 'In stock', condition: 'New' },
];

// ─── Intangible Assets ──────────────────────────────────────────────────────

const intangibleAssets = [
    { name: 'Microsoft 365 Business', licenseKey: 'MS365-BIZ-001', validity_start_date: '2024-01-01', Subscription_type: 'Anually', Subscription_renewal_date: '2025-01-01', vendor: 'Microsoft', status: 'Active' },
    { name: 'Adobe Creative Cloud', licenseKey: 'ACC-TEAM-002', validity_start_date: '2024-02-01', Subscription_type: 'Anually', Subscription_renewal_date: '2025-02-01', vendor: 'Adobe', status: 'Active' },
    { name: 'Slack Business+', licenseKey: 'SLK-BIZ-003', validity_start_date: '2024-03-15', Subscription_type: 'Monthly', Subscription_renewal_date: '2024-04-15', vendor: 'Salesforce', status: 'Active' },
    { name: 'Zoom Business License', licenseKey: 'ZBL-PRO-004', validity_start_date: '2024-01-10', Subscription_type: 'Anually', Subscription_renewal_date: '2025-01-10', vendor: 'Zoom', status: 'Active' },
    { name: 'AWS Cloud Subscription', licenseKey: 'AWS-ENT-005', validity_start_date: '2024-04-01', Subscription_type: 'Monthly', Subscription_renewal_date: '2024-05-01', vendor: 'Amazon', status: 'Active' },
    { name: 'Google Workspace Business', licenseKey: 'GWB-STD-006', validity_start_date: '2024-01-01', Subscription_type: 'Anually', Subscription_renewal_date: '2025-01-01', vendor: 'Google', status: 'Active' },
    { name: 'GitHub Enterprise', licenseKey: 'GHE-ORG-007', validity_start_date: '2024-05-01', Subscription_type: 'Anually', Subscription_renewal_date: '2025-05-01', vendor: 'GitHub', status: 'Active' },
    { name: 'Jira Software Premium', licenseKey: 'JSP-PRE-008', validity_start_date: '2024-06-01', Subscription_type: 'Anually', Subscription_renewal_date: '2025-06-01', vendor: 'Atlassian', status: 'Active' },
    { name: 'Confluence Standard', licenseKey: 'CFN-STD-009', validity_start_date: '2024-06-01', Subscription_type: 'Anually', Subscription_renewal_date: '2025-06-01', vendor: 'Atlassian', status: 'Active' },
    { name: 'NordVPN Business', licenseKey: 'NVP-BIZ-010', validity_start_date: '2024-02-15', Subscription_type: 'Anually', Subscription_renewal_date: '2025-02-15', vendor: 'NordVPN', status: 'Active' },
    { name: 'Figma Professional', licenseKey: 'FIG-PRO-011', validity_start_date: '2024-03-01', Subscription_type: 'Anually', Subscription_renewal_date: '2025-03-01', vendor: 'Figma', status: 'Active' },
    { name: 'Notion Team Plan', licenseKey: 'NOT-TMP-012', validity_start_date: '2024-07-01', Subscription_type: 'Monthly', Subscription_renewal_date: '2024-08-01', vendor: 'Notion', status: 'Active' },
    { name: 'SSL Wildcard Certificate', licenseKey: 'SSL-WLD-013', validity_start_date: '2024-01-20', Subscription_type: 'Anually', Subscription_renewal_date: '2025-01-20', vendor: 'DigiCert', status: 'Active' },
    { name: 'Salesforce CRM Enterprise', licenseKey: 'SFC-ENT-014', validity_start_date: '2024-04-15', Subscription_type: 'Anually', Subscription_renewal_date: '2025-04-15', vendor: 'Salesforce', status: 'Active' },
    { name: 'Datadog Pro Monitoring', licenseKey: 'DDG-PRO-015', validity_start_date: '2024-08-01', Subscription_type: 'Monthly', Subscription_renewal_date: '2024-09-01', vendor: 'Datadog', status: 'Active' },
];

// ─── Seed Runner ────────────────────────────────────────────────────────────

async function postItem(endpoint, item) {
    const res = await fetch(`${BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
    });
    return { status: res.status, data: await res.json().catch(() => ({})) };
}

async function seed() {
    console.log('🌱 Starting seed...\n');

    // Tangible
    console.log(`📦 Adding ${tangibleAssets.length} tangible assets...`);
    let successT = 0, failT = 0;
    for (const item of tangibleAssets) {
        try {
            const result = await postItem('/add_product', item);
            if (result.status === 200 || result.status === 201) {
                successT++;
                console.log(`   ✅ ${item.product_name}`);
            } else {
                failT++;
                console.log(`   ❌ ${item.product_name} — ${JSON.stringify(result.data)}`);
            }
        } catch (err) {
            failT++;
            console.log(`   ❌ ${item.product_name} — ${err.message}`);
        }
    }
    console.log(`   Done: ${successT} added, ${failT} failed\n`);

    // Intangible
    console.log(`☁️  Adding ${intangibleAssets.length} intangible assets...`);
    let successI = 0, failI = 0;
    for (const item of intangibleAssets) {
        try {
            const result = await postItem('/add_intangible_asset', item);
            if (result.status === 200 || result.status === 201) {
                successI++;
                console.log(`   ✅ ${item.name}`);
            } else {
                failI++;
                console.log(`   ❌ ${item.name} — ${JSON.stringify(result.data)}`);
            }
        } catch (err) {
            failI++;
            console.log(`   ❌ ${item.name} — ${err.message}`);
        }
    }
    console.log(`   Done: ${successI} added, ${failI} failed\n`);

    console.log('─────────────────────────────────');
    console.log(`✨ Seed complete!`);
    console.log(`   Tangible:   ${successT}/${tangibleAssets.length}`);
    console.log(`   Intangible: ${successI}/${intangibleAssets.length}`);
    console.log('─────────────────────────────────');
}

seed();
