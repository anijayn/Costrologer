"use client";

import { updateBudget } from "@/actions/budget";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import useFetch from "@/hooks/useFetch";
import { Check, Pencil, X } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const BudgetProgress = ({ initialBudget, currentExpenses }) => {
  const [newBudget, setNewBudget] = useState(
    initialBudget?.amount.toString() || ""
  );
  const [isEditing, setIsEditing] = useState(false);
  const percentageUsed =
    initialBudget && currentExpenses
      ? (currentExpenses / initialBudget.amount) * 100
      : 0;

  const {
    data: updatedBudget,
    error: updateBudgetError,
    loading: updateBudgetLoading,
    func: updateBudgetFunc,
  } = useFetch(updateBudget);

  const handleUpdateBudget = async () => {
    const amount = parseFloat(newBudget);
    if (amount <= 0 || isNaN(amount)) {
      toast.error("Please provide a valid amount");
      return;
    }
    await updateBudgetFunc(newBudget);
  };
  useEffect(() => {
    if (updatedBudget?.success) {
      setIsEditing(false);
      toast.success("Budget updated successfully!");
    }
  }, [updatedBudget]);
  useEffect(() => {
    if (updateBudgetError) {
      toast.error(updateBudgetError.message || "Budget updated failed!");
    }
  }, [updateBudgetError]);

  const handleCancel = () => {
    setNewBudget(initialBudget?.amount.toString() || "");
    setIsEditing(false);
  };
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex-1">
          <CardTitle className="text-sm font-medium">
            Monthly Budget (Default Account)
          </CardTitle>
          <div className="flex items-center gap-2 mt-1">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Enter amount..."
                  value={newBudget}
                  onChange={(e) => setNewBudget(e.target.value)}
                  className="w-32"
                  autoFocus
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleUpdateBudget}
                  className="h-4 w-4 text-green-500"
                  disabled={updateBudgetLoading}
                >
                  <Check />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCancel}
                  className="h-4 w-4 text-red-500"
                  disabled={updateBudgetLoading}
                >
                  <X />
                </Button>
              </div>
            ) : (
              <>
                <CardDescription>
                  {initialBudget
                    ? `${currentExpenses.toFixed(
                        2
                      )} of ${initialBudget.amount.toFixed(2)} spent`
                    : `No budget set`}
                  <Button
                    onClick={() => {
                      setIsEditing(true);
                    }}
                    className="h-6 w-6"
                    variant="ghost"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                </CardDescription>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {initialBudget && (
          <div className="space-y-2">
            <Progress
              value={percentageUsed}
              extraStyles={`${
                percentageUsed >= 90
                  ? "bg-red-500"
                  : percentageUsed >= 75
                  ? "bg-yellow-500"
                  : "bg-green-500"
              }`}
            />
            <p className="text-sm text-muted-foreground text-right">
              {percentageUsed.toFixed(1)} % used
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BudgetProgress;
