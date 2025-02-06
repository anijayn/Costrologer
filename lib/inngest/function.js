import { sendEmail } from "@/actions/sendEmail";
import db from "../prisma";
import { inngest } from "./client";
import EmailTemplate from "@/emails/template";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const triggerRecurringTransactions = inngest.createFunction(
  {
    id: "trigger-recurring-transactions",
    name: "Trigger Recurring Transactions",
  },
  { cron: "0 0 * * *" }, //Runs every midnight
  async ({ step }) => {
    // 1. Fetch all the due recurring transactions
    const recurringTransactions = await step.run(
      "fetch-recurring transactions",
      async () => {
        return await db.transaction.findMany({
          where: {
            isRecurring: true,
            status: "COMPLETED",
            OR: [
              {
                lastProcessed: null, //Never processed
                nextRecurringDate: { lte: new Date() }, //Past due date
              },
            ],
          },
        });
      }
    );

    if (recurringTransactions.length > 0) {
      //2. Create events for each transaction
      const events = recurringTransactions.map((transaction) => ({
        name: "transaction.recurring.process",
        data: { transactionId: transaction.id, userId: transaction.userId },
      }));

      //3. Send events to be processed
      await inngest.send(events);
      return { triggered: recurringTransactions.length };
    }
  }
);

export const processRecurringTransaction = inngest.createFunction(
  {
    id: "process-recurring-transaction",
    name: "Process Recurring Transaction",
    throttle: {
      limit: 10, // Only process 10 transactions
      period: "1m", // per minute
      key: "event.data.userId", // per user
    },
  },
  { event: "transaction.recurring.process" },
  async ({ event, step }) => {
    if (!event?.data?.transactionId || !event?.data?.userId) {
      console.error("Invalid event data: ", event);
      return { error: "Missing required event data" };
    }

    await step.run("process-transaction", async () => {
      const transaction = await db.transaction.findUnique({
        where: {
          id: event.data.transactionId,
          userId: event.data.userId,
        },
        include: {
          account: true,
        },
      });

      if (!transaction || !isTransactionDue(transaction)) return;

      await db.$transaction(async (tx) => {
        //Create the new transaction
        await tx.transaction.create({
          data: {
            type: transaction.type,
            amount: transaction.amount,
            description: `${transaction.description} (Recurring)`,
            date: new Date(),
            category: transaction.category,
            userId: transaction.userId,
            accountId: transaction.accountId,
            isRecurring: false, // To not create exponential recurring transactions
          },
        });
        // Updating the account balance
        const balanceChange =
          transaction.type === "EXPENSE"
            ? -transaction.amount.toNumber()
            : transaction.amount.toNumber();
        await tx.account.update({
          where: { id: transaction.accountId },
          data: { balance: { increment: balanceChange } },
        });

        // Updating last processed and next recurring dates
        await tx.transaction.update({
          where: { id: transaction.id },
          data: {
            lastProcessed: new Date(),
            nextRecurringDate: calculateNextDate(transaction.recurringInterval),
          },
        });
      });
    });
  }
);

export const checkBudgetAlert = inngest.createFunction(
  { name: "Check Budget Alerts" },
  { cron: "0 */6 * * *" },
  async ({ step }) => {
    // Get default budget data for every user
    const budgets = await step.run("fetch-budgets", async () => {
      return await db.budget.findMany({
        include: {
          user: {
            include: {
              accounts: {
                where: {
                  isDefault: true,
                },
              },
            },
          },
        },
      });
    });
    // For every account, check where the expense stands w.r.t the budget
    for (const budget of budgets) {
      const defaultAccount = budget.user.accounts[0]; // This would be the default account
      if (!defaultAccount) continue; // Skip if no default account is configured
      // Aggregate the expense transactions to get the total expense amount
      await step.run(`check-budget-${budget.id}`, async () => {
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
            userId: budget.user.id,
            type: "EXPENSE",
            date: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
            accountId: defaultAccount.id,
          },
          _sum: {
            amount: true,
          },
        });
        const totalExpenses = expenses._sum.amount?.toNumber() || 0;
        const budgetAmount = budget.amount;
        const percentageUsed = (totalExpenses / budgetAmount) * 100;
        // Check if the percentage is above 80 and if the alert was not sent recently
        if (
          percentageUsed >= 80 &&
          (!budget.lastAlertSent ||
            isNewMonth(new Date(), new Date(budget.lastAlertSent)))
        ) {
          //Send out email
          await sendEmail({
            to: budget.user.email,
            subject: `Budget Alert for ${defaultAccount.name}`,
            react: EmailTemplate({
              userName: budget.user.name,
              type: "budget-alert",
              data: {
                percentageUsed,
                budgetAmount: parseInt(budgetAmount).toFixed(1),
                totalExpenses: parseInt(totalExpenses).toFixed(1),
                accountName: defaultAccount.name,
              },
            }),
          });
          //Update the last sent alert details
          await db.budget.update({
            where: {
              id: budget.id,
            },
            data: {
              lastAlertSent: new Date(),
            },
          });
        }
      });
    }
  }
);

const isNewMonth = (currentDate, lastAlertDate) => {
  return (
    currentDate.getMonth() !== lastAlertDate.getMonth() ||
    currentDate.getFullYear() !== lastAlertDate.getFullYear()
  );
};

export const isTransactionDue = (transaction) => {
  //If no lastProcessed date is available, transaction is due
  if (!transaction.lastProcessed) return true;

  //If due date is today or less than today transaction is due
  const today = new Date();
  const nextDue = new Date(transaction.nextRecurringDate);
  return nextDue <= today;
};

const calculateNextDate = (interval) => {
  const date = new Date();
  switch (interval) {
    case "DAILY":
      date.setDate(date.getDate() + 1);
      break;
    case "WEEKLY":
      date.setDate(date.getDate() + 7);
      break;
    case "MONTHLY":
      date.setMonth(date.getMonth() + 1);
      break;
    case "YEARLY":
      date.setFullYear(date.getFullYear() + 1);
      break;
  }
  return date;
};

export const generateMonthlyReports = inngest.createFunction(
  {
    id: "generate-monthly-reports",
    name: "Generate Monthly Reports",
  },
  { cron: "0 0 1 * *" }, // First day of each month
  async ({ step }) => {
    const users = await step.run("fetch-users", async () => {
      return await db.user.findMany({
        include: { accounts: true },
      });
    });
    for (const user of users) {
      await step.run(`generate-report-${user.id}`, async () => {
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        const stats = await getMonthlyStats(user.id, lastMonth);
        const monthName = lastMonth.toLocaleString("default", {
          month: "long",
        });
        //Generate AI insights
        const insights = await generateFinancialInsights(stats, monthName);
        await sendEmail({
          to: user.email,
          subject: `Your Monthly Financial Report - ${monthName}`,
          react: EmailTemplate({
            userName: user.name,
            type: "monthly-report",
            data: {
              stats,
              month: monthName,
              insights,
            },
          }),
        });
      });
    }
    return { processed: users.length };
  }
);

const getMonthlyStats = async (userId, month) => {
  const startDate = new Date(month.getFullYear(), month.getMonth(), 1);
  const endDate = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const transactions = await db.transaction.findMany({
    where: {
      userId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
  });
  // Summing up the transactions also on a category basis
  return transactions.reduce(
    (stats, t) => {
      const amount = t.amount.toNumber();
      if (t.type === "EXPENSE") {
        stats.totalExpenses += amount;
        stats.byCategory[t.category] =
          (stats.byCategory[t.category] || 0) + amount;
      } else {
        stats.totalIncome += amount;
      }
      return stats;
    },
    {
      totalExpenses: 0,
      totalIncome: 0,
      byCategory: {},
      transactionCount: transactions.length,
    }
  );
};

const generateFinancialInsights = async (stats, month) => {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const prompt = `
  Analyze this financial data and provide 3 concise, actionable insights.
  Focus on spending patterns and practical advice.
  Keep it friendly and conversational.

  Financial Data for ${month}:
  - Total Income: $${stats.totalIncome}
  - Total Expenses: $${stats.totalExpenses}
  - Net Income: $${stats.totalIncome - stats.totalExpenses}
  - Expense Categories: ${Object.entries(stats.byCategory)
    .map(([category, amount]) => `${category}: $${amount}`)
    .join(", ")}

  Format the response as a JSON array of strings, like this:
  ["insight 1", "insight 2", "insight 3"]
`;
  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();
    return JSON.parse(cleanedText);
  } catch (err) {
    console.error("Error generating insights:", error);
    return [
      "Your highest expense category this month might need attention.",
      "Consider setting up a budget for better financial management.",
      "Track your recurring expenses to identify potential savings.",
    ];
  }
};
