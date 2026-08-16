import { Prisma } from "@prisma/client";

import type { AppSumoActiveCodeCount } from "@/config/appsumo";
import { clampAppSumoActiveCount } from "@/lib/access/capabilities";
import { prisma } from "@/lib/db";

export type AppSumoEntitlementDatabase = {
  appSumoRedemption: {
    count(args: {
      where: {
        userId: string;
        status: "active";
      };
    }): Promise<number>;
  };
};

export async function countActiveAppSumoRedemptions(
  userId: string,
  database: AppSumoEntitlementDatabase = prisma,
): Promise<AppSumoActiveCodeCount> {
  if (!userId.trim()) return 0;

  try {
    const count = await database.appSumoRedemption.count({
      where: {
        userId,
        status: "active",
      },
    });
    return clampAppSumoActiveCount(count);
  } catch (error) {
    // Migration not applied yet: treat as no AppSumo entitlement.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2021" || error.code === "P2010")
    ) {
      return 0;
    }
    throw error;
  }
}
