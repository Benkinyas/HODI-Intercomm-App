import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export interface EmployeeCsvRecord {
  id?: string;
  name: string;
  role: string;
  phone: string;
  photoUrl?: string;
}

/**
 * Format phone numbers to E.164 format (e.g., +254712345678 or +15551234567)
 */
function formatE164(phone: string, defaultCountryCode = '+254'): string {
  let cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = defaultCountryCode + cleaned.substring(1);
  } else if (!cleaned.startsWith('+')) {
    cleaned = defaultCountryCode + cleaned;
  }
  return cleaned;
}

/**
 * Import employees into Firestore orgs/{orgId}/people
 */
export async function importEmployeeRoster(orgId: string, employees: EmployeeCsvRecord[]) {
  console.log(`Importing ${employees.length} employees into organization: ${orgId}...`);

  for (const emp of employees) {
    const personId = emp.id || db.collection(`orgs/${orgId}/people`).doc().id;
    const formattedPhone = formatE164(emp.phone);

    // 1. Write public profile to orgs/{orgId}/people/{personId}
    const publicData = {
      name: emp.name.trim(),
      role: emp.role.trim(),
      photoUrl: emp.photoUrl?.trim() || null,
      active: true,
      status: 'available',
      statusExpiresAt: null,
      lastVerifiedAt: admin.firestore.FieldValue.serverTimestamp(),
      prefersVisualAlert: false,
    };

    await db.doc(`orgs/${orgId}/people/${personId}`).set(publicData, { merge: true });

    // 2. Write private phone contact to orgs/{orgId}/people/{personId}/private/contact (NFR-12 Security Isolation)
    await db.doc(`orgs/${orgId}/people/${personId}/private/contact`).set({
      phone: formattedPhone,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`✓ Imported: ${emp.name} (${emp.role}) -> Phone: ${formattedPhone} [ID: ${personId}]`);
  }

  console.log(`\n🎉 Successfully imported ${employees.length} employees into org '${orgId}'!`);
}

// CLI Execution helper
if (require.main === module) {
  const args = process.argv.slice(2);
  const csvFilePath = args[0] || path.join(__dirname, 'employees_sample.csv');
  const orgId = args[1] || 'default-org';

  if (!fs.existsSync(csvFilePath)) {
    console.error(`Error: File not found at ${csvFilePath}`);
    console.log(`Usage: npx ts-node importRoster.ts <path-to-csv> <orgId>`);
    process.exit(1);
  }

  const raw = fs.readFileSync(csvFilePath, 'utf-8');
  const lines = raw.split('\n').filter(l => l.trim().length > 0);
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

  const employees: EmployeeCsvRecord[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',').map(p => p.trim());
    if (parts.length >= 3) {
      employees.push({
        name: parts[0],
        role: parts[1],
        phone: parts[2],
        photoUrl: parts[3] || undefined,
      });
    }
  }

  importEmployeeRoster(orgId, employees).catch(console.error);
}
