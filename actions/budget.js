"use server";
import db from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export const getCurrentBudget = async (accountId) => {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorised!");
    const user = await db.user.findUnique({
      where: {
        clerkUserId: userId,
      },
    });

    if (!user) throw new Error("User not found!");

    const budget = await db.budget.findFirst({
      where: {
        userId: user.id,
      },
    });

    const currentDate = new Date();
    const startOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth()
    );
    const endOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1
    );
    const expenses = await db.transaction.aggregate({
      where: {
        userId: user.id,
        type: "EXPENSE",
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
        accountId,
      },
      _sum: {
        amount: true,
      },
    });

    return {
      budget: budget
        ? {
            ...budget,
            amount: budget.amount.toNumber(),
          }
        : null,
      currentExpenses: expenses._sum.amount
        ? expenses._sum.amount.toNumber()
        : 0,
    };
  } catch (err) {
    console.error("Error fetching budget: ", err);
    throw err;
  }
};

export async function updateBudget(amount) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorised!");
    const user = await db.user.findUnique({
      where: {
        clerkUserId: userId,
      },
    });
    if (!user) throw new Error("User not found!");

    // Updates an existing budget if exist and if not creates one
    const budget = await db.budget.upsert({
      where: {
        userId: user.id,
      },
      update: {
        amount,
      },
      create: {
        userId: user.id,
        amount,
      },
    });
    revalidatePath("/dashboard");
    return {
      success: true,
      data: { ...budget, amount: budget.amount.toNumber() },
    };
  } catch (err) {
    console.error("Error updating budget:", err);
    return { success: false, error: err.message };
  }
}
