import * as admin from 'firebase-admin';
import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { PagingService } from './services/pagingService';
import { EscalationService } from './services/escalationService';
import { AcknowledgeService } from './services/acknowledgeService';

admin.initializeApp();

/**
 * 2nd-Gen Callable Cloud Function: sendPage
 */
export const sendPage = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be signed in');
  }
  const senderId = request.auth.uid;
  const { orgId, toId, reason, kind, requestId } = request.data;

  if (!orgId || !toId || !reason || !requestId) {
    throw new HttpsError('invalid-argument', 'Missing required fields');
  }

  try {
    return await PagingService.sendPage(senderId, {
      orgId,
      toId,
      reason,
      kind: kind || 'page',
      requestId,
    });
  } catch (err: any) {
    throw new HttpsError('internal', err.message || 'Failed to send page');
  }
});

/**
 * 2nd-Gen HTTP Cloud Task Handler: handleFallbackCall
 */
export const handleFallbackCall = onRequest(async (req, res) => {
  const { pagePath } = req.body;
  if (!pagePath) {
    res.status(400).send('Missing pagePath');
    return;
  }

  try {
    await EscalationService.handleFallbackCall(pagePath);
    res.status(200).send({ status: 'completed' });
  } catch (err: any) {
    console.error('Fallback task error:', err);
    res.status(500).send(err.message);
  }
});

/**
 * 2nd-Gen Callable Cloud Function: acknowledgePage
 */
export const acknowledgePage = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be signed in');
  }
  const recipientId = request.auth.uid;
  const { orgId, pageId, responseKey } = request.data;

  if (!orgId || !pageId || !responseKey) {
    throw new HttpsError('invalid-argument', 'Missing required fields');
  }

  try {
    return await AcknowledgeService.acknowledgePage(orgId, recipientId, pageId, responseKey);
  } catch (err: any) {
    throw new HttpsError('internal', err.message);
  }
});

/**
 * Twilio Voice Status Webhook
 */
export const twilioWebhook = onRequest((req, res) => {
  res.set('Content-Type', 'text/xml');
  res.send('<Response><Say>Hodi page alert delivered.</Say></Response>');
});
