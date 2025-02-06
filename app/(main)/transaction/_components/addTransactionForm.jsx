"use client";

import { createTransaction, updateTransaction } from "@/actions/transaction";
import { transactionSchema } from "@/app/lib/schema";
import CreateAccountDrawer from "@/components/createAccountDrawer";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import useFetch from "@/hooks/useFetch";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import ReceiptScanner from "./receiptScanner";

const AddTransactionForm = ({
  accounts,
  categories,
  editMode = false,
  initialData = null,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const {
    register,
    setValue,
    handleSubmit,
    formState: { errors },
    watch,
    getValues,
    reset,
  } = useForm({
    resolver: zodResolver(transactionSchema),
    defaultValues:
      editMode && initialData
        ? {
            type: initialData.type,
            amount: initialData.amount.toString(),
            description: initialData.description,
            accountId: initialData.accountId,
            category: initialData.category,
            date: new Date(initialData.date),
            isRecurring: initialData.isRecurring,
            ...(initialData.recurringInterval && {
              recurringInterval: initialData.recurringInterval,
            }),
          }
        : {
            type: "EXPENSE",
            amount: "",
            description: "",
            accountId: accounts.find((account) => account.isDefault)?.id,
            date: new Date(),
            isRecurring: false,
          },
  });
  const {
    data: createdTransaction,
    loading: createTransactionLoading,
    error: createTransactionError,
    func: createTransactionFunc,
  } = useFetch(editMode ? updateTransaction : createTransaction);

  const type = watch("type");
  const isRecurring = watch("isRecurring");
  const date = watch("date");
  const filteredCategories = categories.filter(
    (category) => category.type === type
  );

  const onSubmit = async (data) => {
    const formData = {
      ...data,
      amount: parseFloat(data.amount),
    };
    if (editMode) {
      await createTransactionFunc(editId, formData);
    } else {
      await createTransactionFunc(formData);
    }
  };

  useEffect(() => {
    if (createdTransaction?.success && !createTransactionLoading) {
      toast.success(
        editMode
          ? "Transaction updated successfully"
          : "Transaction created successfully"
      );
      reset();
      router.push(`/account/${createdTransaction.data.accountId}`);
    }
  }, [createdTransaction, createTransactionLoading, editMode]);

  const handleScanComplete = (scannedData) => {
    console.log(scannedData);
    if (scannedData) {
      setValue("amount", scannedData.amount.toString());
      setValue("date", new Date(scannedData.date));
      if (scannedData.description) {
        setValue("description", scannedData.description);
      }
      if (scannedData.category) {
        setValue("category", scannedData.category);
      }
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
      {/* AI RECEIPT SCANNER */}
      {!editMode && <ReceiptScanner onScanComplete={handleScanComplete} />}

      {/* Type */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Type</label>
        <Select
          defaultValue={type}
          onValueChange={(value) => setValue("type", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="EXPENSE">Expense</SelectItem>
            <SelectItem value="INCOME">Income</SelectItem>
          </SelectContent>
        </Select>
        {errors.type && (
          <p className="text-sm text-red-500">{errors.type.message}</p>
        )}
      </div>

      {/* Amount and Account */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Amount</label>
          <Input
            type="number"
            step="0.01"
            placeholder="0.00"
            {...register("amount")}
          />
          {errors.amount && (
            <p className="text-sm text-red-500">{errors.amount.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Account</label>
          <Select
            onValueChange={(value) => setValue("accountId", value)}
            defaultValue={getValues("accountId")}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name} (${parseFloat(account.balance).toFixed(2)})
                </SelectItem>
              ))}
              <CreateAccountDrawer>
                <Button
                  variant="ghost"
                  className="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                >
                  Create Account
                </Button>
              </CreateAccountDrawer>
            </SelectContent>
          </Select>
          {errors.accountId && (
            <p className="text-sm text-red-500">{errors.accountId.message}</p>
          )}
        </div>
      </div>

      {/* Category */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Category</label>
        <Select
          onValueChange={(value) => setValue("category", value)}
          defaultValue={getValues("category")}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {filteredCategories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.category && (
          <p className="text-sm text-red-500">{errors.category.message}</p>
        )}
      </div>

      {/* Date */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Date</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full text-left font-normal">
              {date ? format(date, "PPP") : <span>Pick a date</span>}
              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-0">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(date) => setValue("date", date)}
              disabled={(date) =>
                date > new Date() || date < new Date("1900-01-01")
              }
              initialFocus
            />
          </PopoverContent>
        </Popover>
        {errors.date && (
          <p className="text-sm text-red-500">{errors.date.message}</p>
        )}
      </div>
      {/* Description */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Description</label>
        <Input placeholder="Enter description" {...register("description")} />
        {errors.description && (
          <p className="text-sm text-red-500">{errors.description.message}</p>
        )}
      </div>
      {/* Recurring Tx selector */}
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div className="space-y-0.5">
          <label
            htmlFor="isDefault"
            className="text-sm font-medium cursor-pointer"
          >
            Recurring Transaction
          </label>
          <p className="text-sm text-muted-foreground">
            Set up a recurring schedule for this transaction
          </p>
        </div>
        <Switch
          id="isDefault"
          onCheckedChange={(checked) => setValue("isRecurring", checked)}
        />
      </div>
      {/* Recurring Interval selector */}
      {isRecurring && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Recurring Interval</label>
          <Select
            defaultValue={getValues("recurringInterval")}
            onValueChange={(value) => setValue("recurringInterval", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Recurring Interval" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DAILY">DAILY</SelectItem>
              <SelectItem value="WEEKLY">WEEKLY</SelectItem>
              <SelectItem value="MONTHLY">MONTHLY</SelectItem>
              <SelectItem value="YEARLY">YEARLY</SelectItem>
            </SelectContent>
          </Select>
          {errors.recurringInterval && (
            <p className="text-sm text-red-500">
              {errors.recurringInterval.message}
            </p>
          )}
        </div>
      )}
      <div className="flex gap-4">
        <Button
          onClick={() => router.back()}
          type="button"
          variant="outline"
          className="w-full"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="w-full"
          disabled={createTransactionLoading}
        >
          {createTransactionLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {editMode ? "Updating..." : "Creating..."}
            </>
          ) : editMode ? (
            "Update Transaction"
          ) : (
            "Create Transaction"
          )}
        </Button>
      </div>
    </form>
  );
};

export default AddTransactionForm;
