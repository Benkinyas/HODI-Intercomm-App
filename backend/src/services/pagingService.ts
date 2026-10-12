import * as admin from 'firebase-admin';
import { CloudTasksClient } from '@google-cloud/tasks';
import { PushAdapter, DeviceToken } from '../adapters/pushAdapter';

export interface SendPageRequest {
  orgId: string;
  toId: string;
  reason: string;
  kind: 'page' | 'sos' | 'test';
  requestId: string;
}

export class PagingService {
  static async sendPage(senderId: string, req: SendPageRequest) {
    const db = admin.firestore();

    // Idempotency check: pages/{requestId}
    const pageRef = db.doc(`orgs/${req.orgId}/pages/${req.requestId}`);
    const existingSnap = await pageRef.get();
    if (existingSnap.exists) {
      return existingSnap.data();
    }

    // Read recipient info & status
    const recipientRef = db.doc(`orgs/${req.orgId}/people/${req.toId}`);
    const recipientSnap = await recipientRef.get();
    if (!recipientSnap.exists) {
      throw new Error('Recipient not found on roster');
    }
    const recipientData = recipientSnap.data()!;

    // Read sender info
    const senderRef = db.doc(`orgs/${req.orgId}/people/${senderId}`);
    const senderSnap = await senderRef.get();
    const senderName = senderSnap.exists ? senderSnap.data()!.name : 'Colleague';

    // Server-side Status Expiry & Busy check (Decision 004 & FR-27)
    const now = new Date();
    let statusExpiresAt: Date | null = null;
    if (recipientData.statusExpiresAt) {
      statusExpiresAt = recipientData.statusExpiresAt.toDate();
    }

    const isBusyStatus = ['meeting', 'driving', 'focused'].includes(recipientData.status);
    const isStatusExpired = statusExpiresAt != null && now > statusExpiresAt;
    const isHeld = isBusyStatus && !isStatusExpired && req.kind !== 'sos';

    // Allocate sequential int notification id
    const counterRef = db.doc(`orgs/${req.orgId}/counters/pageSeq`);
    let seq = 100;
    await db.runTransaction(async (tx) => {
      const cSnap = await tx.get(counterRef);
      if (cSnap.exists) {
        seq = (cSnap.data()!.next || 100) + 1;
      }
      tx.set(counterRef, { next: seq }, { merge: true });
    });

    const initialState = isHeld ? 'held' : 'ringing';

    const pageData = {
      fromId: senderId,
      fromName: senderName,
      toId: req.toId,
      reason: req.reason,
      kind: req.kind,
      seq,
      state: initialState,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      heldUntil: isHeld ? recipientData.statusExpiresAt : null,
      layers: {
        ring: { at: isHeld ? null : admin.firestore.FieldValue.serverTimestamp() },
      },
    };

    await pageRef.set(pageData);

    if (isHeld) {
      // Schedule releaseHeld task at statusExpiresAt
      await PagingService.scheduleCloudTask(
        `orgs/${req.orgId}/pages/${req.requestId}`,
        'releaseHeld',
        statusExpiresAt || new Date(Date.now() + 1800000)
      );
      return { status: 'held', heldUntil: statusExpiresAt };
    }

    // Fetch recipient devices for Layer 1 Push
    const devicesSnap = await db.collection(`orgs/${req.orgId}/people/${req.toId}/devices`).get();
    const deviceTokens: DeviceToken[] = devicesSnap.docs.map((d) => ({
      token: d.data().pushToken,
      platform: d.data().platform || 'android',
      criticalAlertsGranted: d.data().criticalAlertsGranted || false,
    }));

    // Send Layer 1 Push
    await PushAdapter.sendPageNotification(
      deviceTokens,
      senderName,
      req.reason,
      req.kind,
      req.requestId,
      seq
    );

    // Schedule Layer 2 Fallback call: 10s iOS / 30s Android (Decision 002)
    const shortestWindowSeconds = req.kind === 'sos' ? 0 : 30; // 0 for SOS (immediate call)
    const fallbackTime = new Date(Date.now() + shortestWindowSeconds * 1000);

    await PagingService.scheduleCloudTask(
      `orgs/${req.orgId}/pages/${req.requestId}`,
      'handleFallbackCall',
      fallbackTime
    );

    return { status: 'ringing', pageId: req.requestId };
  }

  static async scheduleCloudTask(pagePath: string, taskType: string, scheduleTime: Date) {
    try {
      const client = new CloudTasksClient();
      const project = process.env.GCP_PROJECT || 'hodi-app';
      const location = 'us-central1';
      const queue = 'hodi-escalation-queue';

      const parent = client.queuePath(project, location, queue);
      const url = `https://${location}-${project}.cloudfunctions.net/${taskType}`;

      const task = {
        httpRequest: {
          httpMethod: 'POST' as const,
          url,
          headers: { 'Content-Type': 'application/json' },
          body: Buffer.from(JSON.stringify({ pagePath })).toString('base64'),
        },
        scheduleTime: {
          seconds: Math.floor(scheduleTime.getTime() / 1000),
        },
      };

      await client.createTask({ parent, task });
    } catch (e) {
      console.warn('Cloud Tasks scheduling fallback log (Emulator/Demo mode):', e);
    }
  }
}
