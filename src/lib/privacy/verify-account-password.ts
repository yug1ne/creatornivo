import bcrypt from "bcryptjs";

import { prisma } from "@/lib/db";

export class AccountPasswordVerificationError extends Error {
  constructor(
    public readonly code:
      | "missing_password"
      | "password_not_supported"
      | "invalid_password",
  ) {
    super(code);
    this.name = "AccountPasswordVerificationError";
  }
}

interface PasswordVerificationStore {
  findUserPassword(userId: string): Promise<string | null | undefined>;
}

const prismaPasswordVerificationStore: PasswordVerificationStore = {
  async findUserPassword(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });
    return user?.password;
  },
};

export async function verifyAccountPassword(
  userId: string,
  password: string | undefined,
  dependencies: {
    comparePassword?: (password: string, hash: string) => Promise<boolean>;
    store?: PasswordVerificationStore;
  } = {},
): Promise<void> {
  if (!password) {
    throw new AccountPasswordVerificationError("missing_password");
  }

  const store = dependencies.store ?? prismaPasswordVerificationStore;
  const passwordHash = await store.findUserPassword(userId);

  if (!passwordHash) {
    throw new AccountPasswordVerificationError("password_not_supported");
  }

  const comparePassword = dependencies.comparePassword ?? bcrypt.compare;
  const isValid = await comparePassword(password, passwordHash);

  if (!isValid) {
    throw new AccountPasswordVerificationError("invalid_password");
  }
}