"use client";

import { updateDefaultAccount } from "@/actions/accounts";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import useFetch from "@/hooks/useFetch";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { toast } from "sonner";

const AccountCard = ({ account }) => {
  const { name, type, balance, id, isDefault } = account;
  const {
    data: updatedDefaultAccount,
    loading: updateDefaultAccountLoading,
    error,
    func: updateDefaultAccountFunc,
  } = useFetch(updateDefaultAccount);

  const handleDefaultChange = async (event) => {
    event.preventDefault();
    if (isDefault) {
      toast.warning("You need atleast 1 default account!");
      return; // Prevents toggling the single default account OFF
    }
    await updateDefaultAccountFunc(id);
  };

  useEffect(() => {
    if (updatedDefaultAccount?.success) {
      toast.success("Default account updated successfully!");
    }
  }, [updatedDefaultAccount, updateDefaultAccountLoading]);

  useEffect(() => {
    if (error) {
      toast.error(error.message || "Failed to update default account");
    }
  }, [error]);

  return (
    <Link href={`/account/${id}`}>
      <Card className="hover:shadow-md transition-shadow group relative">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium capitalize">
            {name}
          </CardTitle>
          <Switch
            checked={isDefault}
            onClick={handleDefaultChange}
            disabled={updateDefaultAccountLoading}
          />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ₹ {parseFloat(balance).toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground">
            {type.charAt(0) + type.slice(1).toLowerCase()} Account
          </p>
        </CardContent>
        <CardFooter className="flex justify-between text-sm text-muted-foreground">
          <div className="flex items-center">
            <ArrowUpRight className="mr-1 h-4 w-4 text-green-500" />
            Income
          </div>
          <div className="flex items-center">
            <ArrowDownRight className="mr-1 h-4 w-4 text-red-500" />
            Expense
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
};

export default AccountCard;
