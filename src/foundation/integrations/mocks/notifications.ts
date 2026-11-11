import { db } from "../../db";
import type { NotificationInput, NotificationsAdapter } from "../types";

/** Mock Slack: logs to the console and records the message in the notifications table. */
export class MockNotificationsAdapter implements NotificationsAdapter {
  constructor(private defaultChannel: string) {}

  async send(input: NotificationInput) {
    const channel = input.channel ?? this.defaultChannel;
    console.log(`[mock slack] ${channel}: ${input.message}`);
    await db.notification.create({
      data: { channel, message: input.message, app: input.app, entityId: input.entityId ?? null },
    });
  }
}
