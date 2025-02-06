"use server";

const { default: db } = require("@/lib/prisma");
const { auth } = require("@clerk/nextjs/server");
const { revalidatePath } = require("next/cache");

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

export const updateDefaultAccount = async (accountId) => {
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

    // Unsetting every default account first
    await db.account.updateMany({
      where: {
        userId: user.id,
        isDefault: true,
      },
      data: { isDefault: false },
    });

    // Setting the new default account
    const account = await db.account.update({
      where: {
        id: accountId,
        userId: user.id,
      },
      data: {
        isDefault: true,
      },
    });
    revalidatePath("/dashboard");
    return { success: true, data: serializeTransaction(account) };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

export const getAccountWithTransactions = async (accountId) => {
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

  const account = await db.account.findUnique({
    where: {
      id: accountId,
      userId: user.id,
    },
    include: {
      transactions: {
        orderBy: { date: "desc" },
      },
      _count: {
        select: { transactions: true },
      },
    },
  });

  if (!account) {
    return null;
  }

  return {
    ...serializeTransaction(account),
    transactions: account.transactions.map(serializeTransaction),
  };
};

export const bulkDeleteTransactions = async (transactionIds) => {
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
    // Find the matching transactions
    const transactions = await db.transaction.findMany({
      where: {
        userId: user.id,
        id: { in: transactionIds },
      },
    });
    // Since the above transactions will be removed, find the new account balance
    const accountBalanceChanges = transactions.reduce((acc, transaction) => {
      const amount = Number(transaction.amount);
      const change = transaction.type === "EXPENSE" ? amount : -amount;
      acc[transaction.accountId] = (acc[transaction.accountId] || 0) + change;
      return acc;
    }, {});

    // Delete the transactions
    await db.$transaction(async (tx) => {
      await tx.transaction.deleteMany({
        where: {
          id: { in: transactionIds },
          userId: user.id,
        },
      });
      // Update the account balance to reflect the changes
      for (const [accountId, balanceChanges] of Object.entries(
        accountBalanceChanges
      )) {
        await tx.account.updateMany({
          where: {
            userId: user.id,
            id: accountId,
          },
          data: {
            balance: {
              increment: balanceChanges,
            },
          },
        });
      }
    });

    revalidatePath("/dashboard");
    revalidatePath("/account/[id]");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err.message,
    };
  }
};
