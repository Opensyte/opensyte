/**
 * SMS Service - Handles SMS sending via Twilio
 */

import { Twilio } from "twilio";
import type { MessageListInstanceCreateOptions } from "twilio/lib/rest/api/v2010/account/message";
import { env } from "~/env";

export interface SmsOptions {
  to: string;
  message: string;
  fromNumber?: string;
  mediaUrl?: string;
}

export interface SmsResult {
  success: boolean;
  messageSid?: string;
  status?: string;
  error?: string;
  skipped?: boolean;
}

export class SmsService {
  private twilio: Twilio | null;

  constructor() {
    const hasTwilioAuth = Boolean(
      env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN
    );
    this.twilio = hasTwilioAuth
      ? new Twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN)
      : null;
  }

  /**
   * Send SMS via Twilio
   */
  async sendSms(options: SmsOptions): Promise<SmsResult> {
    try {
      // If Twilio is not configured, return early (no-op)
      if (!this.twilio) {
        return {
          success: true,
          status: "skipped",
          skipped: true,
        };
      }

      const fromNumber = options.fromNumber ?? env.TWILIO_PHONE_NUMBER;
      if (!fromNumber) {
        return {
          success: true,
          status: "skipped",
          skipped: true,
        };
      }

      // Validate phone number format
      const toNumber = this.formatPhoneNumber(options.to);
      if (!toNumber) {
        return {
          success: false,
          error: "Invalid phone number format",
        };
      }

      // Build Twilio message payload

      const messageData: MessageListInstanceCreateOptions = {
        body: options.message,
        from: fromNumber,
        to: toNumber,
        ...(options.mediaUrl ? { mediaUrl: [options.mediaUrl] } : {}),
      };

      const message = await this.twilio.messages.create(messageData);

      return {
        success: true,
        messageSid: message.sid,
        status: message.status,
      };
    } catch (error) {
      console.error("SMS service error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown SMS error",
      };
    }
  }

  /**
   * Send bulk SMS messages
   */
  async sendBulkSms(messages: SmsOptions[]): Promise<SmsResult[]> {
    const results: SmsResult[] = [];

    // Send SMS in batches to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      const batchPromises = batch.map(sms => this.sendSms(sms));
      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach((result, index) => {
        if (result.status === "fulfilled") {
          results.push(result.value);
        } else {
          results.push({
            success: false,
            error: `Batch SMS ${i + index} failed: ${result.reason}`,
          });
        }
      });

      // Delay between batches to respect rate limits
      if (i + batchSize < messages.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    return results;
  }

  /**
   * Get message status
   */
  async getMessageStatus(messageSid: string): Promise<{
    status?: string;
    dateDelivered?: Date;
    errorCode?: number;
    errorMessage?: string;
  }> {
    try {
      if (!this.twilio) return {};
      const message = await this.twilio.messages(messageSid).fetch();

      return {
        status: message.status,
        dateDelivered: message.dateSent ?? undefined,
        errorCode: message.errorCode ?? undefined,
        errorMessage: message.errorMessage ?? undefined,
      };
    } catch (error) {
      console.error("Error fetching message status:", error);
      return {};
    }
  }

  /**
   * Format phone number to E.164 format
   */
  private formatPhoneNumber(phoneNumber: string): string | null {
    // Remove all non-digit characters
    const digitsOnly = phoneNumber.replace(/\D/g, "");

    // If number doesn't start with +, add country code
    if (phoneNumber.startsWith("+")) {
      return phoneNumber;
    }

    // US numbers (10 digits) - add +1
    if (digitsOnly.length === 10) {
      return `+1${digitsOnly}`;
    }

    // International numbers (11+ digits) - add +
    if (digitsOnly.length >= 11) {
      return `+${digitsOnly}`;
    }

    // Invalid format
    return null;
  }

  /**
   * Validate SMS configuration
   */
  async validateConfiguration(): Promise<{ valid: boolean; error?: string }> {
    try {
      if (!this.twilio || !env.TWILIO_ACCOUNT_SID) {
        return { valid: false, error: "Twilio SMS is not configured" };
      }
      // Test by fetching account info
      const account = await this.twilio.api
        .accounts(env.TWILIO_ACCOUNT_SID)
        .fetch();

      if (account.status !== "active") {
        return {
          valid: false,
          error: `Twilio account status is ${account.status}`,
        };
      }

      // Validate phone number
      if (env.TWILIO_PHONE_NUMBER) {
        try {
          const phoneNumber = await this.twilio.incomingPhoneNumbers.list({
            phoneNumber: env.TWILIO_PHONE_NUMBER,
            limit: 1,
          });

          if (phoneNumber.length === 0) {
            return {
              valid: false,
              error: "Configured Twilio phone number not found in account",
            };
          }
        } catch (phoneError) {
          console.warn("Could not validate phone number:", phoneError);
          // Continue - phone number validation might fail for some account types
        }
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error:
          error instanceof Error ? error.message : "Configuration test failed",
      };
    }
  }

  /**
   * Get account balance
   */
  async getAccountBalance(): Promise<{ balance?: string; currency?: string }> {
    try {
      if (!this.twilio || !env.TWILIO_ACCOUNT_SID) return {};
      const balance = await this.twilio.api
        .accounts(env.TWILIO_ACCOUNT_SID)
        .balance.fetch();
      return {
        balance: balance.balance,
        currency: balance.currency,
      };
    } catch (error) {
      console.error("Error fetching account balance:", error);
      return {};
    }
  }
}
