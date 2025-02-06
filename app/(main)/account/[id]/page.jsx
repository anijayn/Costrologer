import { getAccountWithTransactions } from "@/actions/accounts";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import TransactionTable from "../_components/transactionTable";
import { BarLoader } from "react-spinners";
import AccountChart from "../_components/accountChart";

const AccountPage = async ({ params }) => {
  const accountData = await getAccountWithTransactions(params.id);
  if (!accountData) {
    notFound();
  }
  const { transactions, ...account } = accountData;
  const { name, type, balance, _count } = account;
  return (
    <div className="space-y-8 px-5">
      <div className="flex gap-4 items-end justify-between">
        <div>
          <h1 className="text-5xl sm:text-6xl font-bold gradient-title capitalize">
            {name}
          </h1>
          <p className="text-muted-foreground">
            {type.charAt(0) + type.slice(1).toLowerCase()} Account
          </p>
        </div>
        <div className="text-right pb-2">
          <div className="text-xl sm:text-2xl font-bold">
            ₹ {parseFloat(balance).toFixed(2)}
          </div>
          <p className="text-sm text-muted-foreground">
            {_count.transactions} Transactions
          </p>
        </div>
      </div>
      <Suspense
        fallback={<BarLoader className="mt-4" width={"100%"} color="#9333ea" />}
      >
        <AccountChart transactions={transactions} />
      </Suspense>

      <Suspense
        fallback={<BarLoader className="mt-4" width={"100%"} color="#9333ea" />}
      >
        <TransactionTable transactions={transactions} />
      </Suspense>
    </div>
  );
};

export default AccountPage;
