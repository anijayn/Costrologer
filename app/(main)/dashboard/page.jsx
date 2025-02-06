import { getCurrentBudget } from "@/actions/budget";
import { getDashboardData, getUserAccounts } from "@/actions/dashboard";
import AccountCard from "@/app/(main)/dashboard/_components/AccountCard";
import CreateAccountDrawer from "@/components/createAccountDrawer";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import BudgetProgress from "./_components/budgetProgress";
import DashboardOverview from "./_components/dashboardOverview";
import { Suspense } from "react";

const DashboardPage = async () => {
  const accounts = await getUserAccounts();
  const defaultAccount = accounts.find((account) => account.isDefault);
  let budgetData = null;
  if (defaultAccount) {
    budgetData = await getCurrentBudget(defaultAccount.id);
  }
  const transactions = await getDashboardData();
  return (
    <div className="space-y-8 ">
      {/* Budget Progress */}
      <BudgetProgress
        initialBudget={budgetData?.budget}
        currentExpenses={budgetData?.currentExpenses}
      />

      {/* Dashboard Overview */}
      <Suspense fallback={"Loading Overview..."}>
        <DashboardOverview
          accounts={accounts}
          transactions={transactions || []}
        />
      </Suspense>

      {/* Accounts Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grids-cols-3">
        <CreateAccountDrawer>
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-dashed">
            <CardContent className="flex flex-col items-center justify-center text-muted-foreground h-full pt-5">
              <Plus className="h-10 w-10 mb-2" />
              <p className="text-sm font-medium">Add New Account</p>
            </CardContent>
          </Card>
        </CreateAccountDrawer>
        {accounts.length > 0 &&
          accounts?.map((account) => (
            <AccountCard key={account.id} account={account} />
          ))}
      </div>
    </div>
  );
};

export default DashboardPage;
