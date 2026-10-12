import * as admin from 'firebase-admin';
import { PushAdapter, DeviceToken } from '../adapters/pushAdapter';
import { CallAdapter } from '../adapters/callAdapter';

export class AcknowledgeService {
  static async acknowledgePage(
    orgId: string,
    recipientId: string,
    pageId: string,
    responseKey: 'on_my_way' | 'five_minutes' | 'busy'
  ) {
    const db = admin.firestore();
    const pageRef = db.doc(`orgs/${orgId}/pages/${pageId}`);

    let activeCallSid: string | null = null;
    let seq = 0;

    await db.runTransaction(async (tx) => {
      const pSnap = await tx.get(pageRef);
      if (!pSnap.exists) throw new Error('Page not found');

      const data = pSnap.data()!;
      if (data.toId !== recipientId) {
        throw new Error('Unauthorized recipient');
      }

      if (data.state === 'acknowledged') {
        return; // Already acknowledged
      }

      seq = data.seq || 0;
      if (data.layers?.call?.sid) {
        activeCallSid = data.layers.call.sid;
      }

      tx.update(pageRef, {
        state: 'acknowledged',
        response: responseKey,
        respondedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    // If an active call is currently ringing, hang it up immediately (FR-18)
    if (activeCallSid) {
      const callAdapter = new CallAdapter({
        provider: 'twilio',
        twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
        twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
      });
      await callAdapter.hangUp(activeCallSid);
    }

    // Send silent FCM cancel payload to recipient's other devices (FR-3 & Decision 003)
    const devicesSnap = await db.collection(`orgs/${orgId}/people/${recipientId}/devices`).get();
    const deviceTokens: DeviceToken[] = devicesSnap.docs.map((d) => ({
      token: d.data().pushToken,
      platform: d.data().platform || 'android',
    }));

    await PushAdapter.sendCancelMessage(deviceTokens, seq);

    return { status: 'acknowledged', pageId };
  }
}
