import * as admin from 'firebase-admin';
import { CallAdapter } from '../adapters/callAdapter';

export class EscalationService {
  static async handleFallbackCall(pagePath: string) {
    const db = admin.firestore();
    const pageRef = db.doc(pagePath);
    const pageSnap = await pageRef.get();

    if (!pageSnap.exists) return;
    const page = pageSnap.data()!;

    // Exit immediately if already acknowledged, cancelled or expired (Decision 001/Mermaid architecture)
    if (['acknowledged', 'cancelled', 'expired'].includes(page.state)) {
      console.log(`Page ${pagePath} is already ${page.state}. Fallback call skipped.`);
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const orgId = pagePath.split('/')[1];

    // Enforce Daily Telephony Call Cap (NFR-17 & Decision 001)
    const spendRef = db.doc(`orgs/${orgId}/spend/${todayStr}`);
    let canCall = true;

    await db.runTransaction(async (tx) => {
      const sSnap = await tx.get(spendRef);
      const currentCalls = sSnap.exists ? sSnap.data()!.calls || 0 : 0;
      if (currentCalls >= 200) {
        canCall = false;
        return;
      }
      tx.set(spendRef, { calls: currentCalls + 1 }, { merge: true });
    });

    if (!canCall) {
      console.warn('Daily fallback call cap reached (200 calls).');
      await pageRef.update({
        'layers.call.status': 'capped',
      });
      return;
    }

    // Retrieve recipient phone number from private subcollection (NFR-12)
    const contactSnap = await db.doc(`orgs/${orgId}/people/${page.toId}/private/contact`).get();
    if (!contactSnap.exists || !contactSnap.data()?.phone) {
      console.error('No private contact phone number found for recipient');
      return;
    }
    const phone = contactSnap.data()!.phone;

    // Instantiate Telephony CallAdapter (Twilio / Africa's Talking)
    const callAdapter = new CallAdapter({
      provider: process.env.TELEPHONY_PROVIDER === 'africastalking' ? 'africastalking' : 'twilio',
      twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
      twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
      twilioFromNumber: process.env.TWILIO_FROM_NUMBER || '+15005550006',
      africasTalkingApiKey: process.env.AFRICASTALKING_API_KEY,
      africasTalkingUsername: process.env.AFRICASTALKING_USERNAME,
      africasTalkingFromNumber: process.env.AFRICASTALKING_FROM_NUMBER,
    });

    try {
      const { sid } = await callAdapter.ring(phone, page.fromName || 'Colleague', page.reason);

      await pageRef.update({
        state: 'calling',
        'layers.call.at': admin.firestore.FieldValue.serverTimestamp(),
        'layers.call.sid': sid,
        'layers.call.status': 'initiated',
      });

      console.log(`Fallback voice call initiated for ${pagePath}, SID: ${sid}`);
    } catch (err) {
      console.error('Telephony API call failed:', err);
    }
  }
}
