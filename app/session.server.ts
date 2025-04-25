// app/session.server.ts
import { SessionStorage } from "@shopify/shopify-app-remix/server";
import { PrismaClient } from "@prisma/client";
import { Session } from "@shopify/shopify-api";

const prisma = new PrismaClient();

interface SessionRecord {
  id: string;
  shop: string;
  state: string;
  isOnline: boolean;
  scope: string;
  accessToken: string;
  expires: Date | null;
  data: any;
}

export class PrismaSessionStorage implements SessionStorage {
  async storeSession(session: Session) {
    const data = session.toPropertyArray();
    await prisma.session.upsert({
      where: { id: session.id },
      update: {
        shop: session.shop,
        state: session.state,
        isOnline: session.isOnline,
        scope: session.scope,
        accessToken: session.accessToken,
        expires: session.expires,
        data,
      },
      create: {
        id: session.id,
        shop: session.shop,
        state: session.state,
        isOnline: session.isOnline,
        scope: session.scope,
        accessToken: session.accessToken,
        expires: session.expires,
        data,
      },
    });
    return true;
  }

  async loadSession(id: string) {
    const record = await prisma.session.findUnique({ where: { id } });
    if (!record) return undefined;

    try {
      // Create a new Session instance with all required properties
      const session = new Session({
        id: record.id,
        shop: record.shop,
        state: record.state,
        isOnline: record.isOnline,
        scope: record.scope,
        accessToken: record.accessToken,
        expires: record.expires || undefined,
      });

      // Add the isExpired method to the session
      Object.defineProperty(session, 'isExpired', {
        value: function() {
          if (!this.isOnline) return false;
          return this.expires ? this.expires.getTime() < Date.now() : false;
        },
        writable: true,
        configurable: true,
        enumerable: false
      });

      return session;
    } catch (err) {
      console.error("❌ Failed to parse session from DB:", err);
      return undefined;
    }
  }

  async deleteSession(id: string) {
    await prisma.session.delete({ where: { id } }).catch(() => {});
    return true;
  }

  async deleteSessions(ids: string[]) {
    await prisma.session.deleteMany({ where: { id: { in: ids } } });
    return true;
  }

  async findSessionsByShop(shop: string) {
    const sessions = await prisma.session.findMany({ where: { shop } });
    return sessions.map((record: SessionRecord) => {
      try {
        const session = new Session({
          id: record.id,
          shop: record.shop,
          state: record.state,
          isOnline: record.isOnline,
          scope: record.scope,
          accessToken: record.accessToken,
          expires: record.expires || undefined,
        });

        // Add the isExpired method to the session
        Object.defineProperty(session, 'isExpired', {
          value: function() {
            if (!this.isOnline) return false;
            return this.expires ? this.expires.getTime() < Date.now() : false;
          },
          writable: true,
          configurable: true,
          enumerable: false
        });

        return session;
      } catch {
        return undefined;
      }
    }).filter((s: Session | undefined): s is Session => s !== undefined);
  }
}