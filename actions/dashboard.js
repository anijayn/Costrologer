"use server";

import db from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

const serializeTransaction = (data) => {
  const serializedData = { ...data };
  if (serializedData.balance) {
    serializedData.balance = serializedData.balance.toNumber();
  }
  if (serializedData.amount) {
    serializedData.amount = serializedData.amount.toNumber();
  }
  return serializedData;
};

export async function createAccount(data) {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized!");
    }
    const user = await db.user.findUnique({
      where: {
        clerkUserId: userId,
      },
    });
    if (!user) {
      throw new Error("User not found!");
    }

    const balanceFloat = parseFloat(data.balance);
    if (isNaN(balanceFloat)) {
      throw new Error("Invalid balance amount");
    }

    const existingAccounts = await db.account.findMany({
      where: {
        userId: user.id,
      },
    });

    const shouldBeDefault =
      existingAccounts.length === 0 ? true : data.isDefault;

    // To set the new account as the default, we unset every other default account
    if (shouldBeDefault) {
      await db.account.updateMany({
        where: {
          userId: user.id,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }

    const account = await db.account.create({
      data: {
        ...data,
        userId: user.id,
        balance: balanceFloat,
        isDefault: shouldBeDefault,
      },
    });

    const serializedAccount = serializeTransaction(account);
    revalidatePath("/dashboard");
    return { success: true, data: serializedAccount };
  } catch (err) {
    throw new Error(err.message);
  }
}

export async function getUserAccounts() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized!");
  }
  const user = await db.user.findUnique({
    where: {
      clerkUserId: userId,
    },
  });
  if (!user) {
    throw new Error("User not found!");
  }
  const accounts = await db.account.findMany({
    where: {
      userId: user.Id,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      _count: {
        select: {
          transactions: true,
        },
      },
    },
  });
  const serializedAccounts = accounts.map(serializeTransaction);
  return serializedAccounts;
}

export const getDashboardData = async () => {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Get all user transactions
  const transactions = await db.transaction.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
  });

  return transactions.map(serializeTransaction);
};
