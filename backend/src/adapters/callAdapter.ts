import twilio from 'twilio';

export interface CallConfig {
  provider: 'twilio' | 'africastalking';
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioFromNumber?: string;
  africasTalkingApiKey?: string;
  africasTalkingUsername?: string;
  africasTalkingFromNumber?: string;
}

export class CallAdapter {
  private config: CallConfig;

  constructor(config: CallConfig) {
    this.config = config;
  }

  async ring(recipientPhone: string, fromName: string, reason: string): Promise<{ sid: string }> {
    const isKenya = recipientPhone.startsWith('+254');
    
    // Choose Africa's Talking for Kenya production, or Twilio for global / demo
    if (this.config.provider === 'africastalking' || (isKenya && this.config.africasTalkingApiKey)) {
      return this.placeAfricasTalkingCall(recipientPhone, fromName, reason);
    } else {
      return this.placeTwilioCall(recipientPhone, fromName, reason);
    }
  }

  private async placeTwilioCall(phone: string, fromName: string, reason: string): Promise<{ sid: string }> {
    const client = twilio(this.config.twilioAccountSid, this.config.twilioAuthToken);
    
    // Twiml TwiML response: Doorbell alertTTS speech
    const twiml = `<Response><Say voice="alice">HODI Urgent Page from ${fromName}. Reason: ${reason}. Please open the HODI application now.</Say><Hangup/></Response>`;

    const call = await client.calls.create({
      twiml: twiml,
      to: phone,
      from: this.config.twilioFromNumber || '+15005550006',
      timeout: 20, // 20s ring time
    });

    return { sid: call.sid };
  }

  private async placeAfricasTalkingCall(phone: string, fromName: string, reason: string): Promise<{ sid: string }> {
    // Africa's Talking Voice API
    const credentials = {
      apiKey: this.config.africasTalkingApiKey || 'dummy',
      username: this.config.africasTalkingUsername || 'sandbox',
    };
    const AfricasTalking = require('africastalking')(credentials);
    const voice = AfricasTalking.VOICE;

    const options = {
      callFrom: this.config.africasTalkingFromNumber || '+254711082000',
      callTo: [phone],
    };

    const response = await voice.call(options);
    const sid = response?.entries?.[0]?.sessionId || `at_${Date.now()}`;
    return { sid };
  }

  async hangUp(sid: string): Promise<void> {
    if (sid.startsWith('CA') && this.config.twilioAccountSid) {
      const client = twilio(this.config.twilioAccountSid, this.config.twilioAuthToken);
      await client.calls(sid).update({ status: 'completed' });
    }
  }
}
