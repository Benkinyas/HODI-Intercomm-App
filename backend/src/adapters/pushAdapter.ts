import * as admin from 'firebase-admin';

export interface DeviceToken {
  token: string;
  platform: 'android' | 'ios';
  criticalAlertsGranted?: boolean;
}

export class PushAdapter {
  static async sendPageNotification(
    deviceTokens: DeviceToken[],
    fromName: String,
    reason: string,
    kind: 'page' | 'sos' | 'test',
    pageId: string,
    seq: number
  ) {
    const androidChannelId = kind === 'sos' ? 'hodi_sos_v1' : 'hodi_page_v1';
    
    const messages: admin.messaging.Message[] = deviceTokens.map((d) => {
      const isIos = d.platform === 'ios';
      
      if (isIos) {
        return {
          token: d.token,
          notification: {
            title: kind === 'sos' ? `🚨 EMERGENCY SOS from ${fromName}` : `Page from ${fromName}`,
            body: reason,
          },
          data: {
            pageId,
            seq: seq.toString(),
            kind,
          },
          apns: {
            headers: {
              'apns-priority': '10',
              'apns-push-type': 'alert',
            },
            payload: {
              aps: {
                sound: d.criticalAlertsGranted
                  ? { critical: true, name: 'hodi_page.caf', volume: 1.0 }
                  : 'hodi_page.caf',
                'interruption-level': d.criticalAlertsGranted ? 'critical' : 'time-sensitive',
                'mutable-content': 1,
              },
            },
          },
        };
      } else {
        // Android: High priority Notification block triggering Alarm Channel
        return {
          token: d.token,
          notification: {
            title: kind === 'sos' ? `🚨 EMERGENCY SOS from ${fromName}` : `Page from ${fromName}`,
            body: reason,
          },
          data: {
            pageId,
            seq: seq.toString(),
            kind,
          },
          android: {
            priority: 'high',
            ttl: 60 * 1000, // 60 seconds TTL per NFR-7
            notification: {
              channelId: androidChannelId,
              notificationPriority: 'max',
              visibility: 'public',
              sound: 'hodi_page',
            },
          },
        };
      }
    });

    if (messages.length > 0) {
      await admin.messaging().sendEach(messages);
    }
  }

  static async sendCancelMessage(deviceTokens: DeviceToken[], seq: number) {
    // Data-only cancel message (silent)
    const messages: admin.messaging.Message[] = deviceTokens.map((d) => ({
      token: d.token,
      data: {
        type: 'cancel',
        seq: seq.toString(),
      },
    }));

    if (messages.length > 0) {
      await admin.messaging().sendEach(messages);
    }
  }
}
