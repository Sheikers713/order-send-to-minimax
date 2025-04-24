import { SessionStorage } from "@shopify/shopify-app-remix/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class PrismaSessionStorage implements SessionStorage {
  async storeSession(session) {
    await prisma.session.upsert({
      where: { id: session.id },
      update: {
        shop: session.shop,
        state: session.state,
        isOnline: session.isOnline,
        scope: session.scope,
        expires: session.expires,
        accessToken: session.accessToken,
        updatedAt: new Date(),
      },
      create: {
        id: session.id,
        shop: session.shop,
        state: session.state,
        isOnline: session.isOnline,
        scope: session.scope,
        expires: session.expires,
        accessToken: session.accessToken,
      },
    });
    return true;
  }

  async loadSession(id) {
    const session = await prisma.session.findUnique({
      where: { id },
    });

    if (!session) {
      return undefined;
    }

    return {
      id: session.id,
      shop: session.shop,
      state: session.state,
      isOnline: session.isOnline,
      scope: session.scope,
      expires: session.expires,
      accessToken: session.accessToken,
    };
  }

  async deleteSession(id) {
    await prisma.session.delete({
      where: { id },
    });
    return true;
  }

  async deleteSessions(ids) {
    await prisma.session.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    });
    return true;
  }

  async findSessionsByShop(shop) {
    const sessions = await prisma.session.findMany({
      where: { shop },
    });

    return sessions.map((session) => ({
      id: session.id,
      shop: session.shop,
      state: session.state,
      isOnline: session.isOnline,
      scope: session.scope,
      expires: session.expires,
      accessToken: session.accessToken,
    }));
  }
} 