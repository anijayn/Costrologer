"use client";

import { bulkDeleteTransactions } from "@/actions/accounts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { categoryColors } from "@/data/categories";
import useFetch from "@/hooks/useFetch";
import { format } from "date-fns";
import {
  ChevronDown,
  ChevronUp,
  Clock,
  MoreHorizontal,
  RefreshCcw,
  Search,
  Trash,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BarLoader } from "react-spinners";
import { toast } from "sonner";

const {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} = require("@/components/ui/table");

const TransactionTable = ({ transactions }) => {
  const [selectedIds, setSelectedIds] = useState([]);
  const [sortConfig, setSortConfig] = useState({
    field: "date",
    direction: "desc",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [recurringFilter, setRecurringFilter] = useState("");
  const router = useRouter();
  const filteredAndSortedTransactions = useMemo(() => {
    let result = [...transactions];
    if (searchTerm) {
      result = result.filter(({ description }) =>
        description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (recurringFilter) {
      result = result.filter(({ isRecurring }) => {
        if (recurringFilter === "recurring") return isRecurring;
        return !isRecurring;
      });
      if (typeFilter) {
        result = result.filter(({ type }) => type === typeFilter);
      }
    }

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortConfig.field) {
        case "date":
          comparison = new Date(a.date) - new Date(b.date);
          break;
        case "amount":
          comparison = a.amount - b.amount;
          break;
        case "category":
          comparison = a.category.localeCompare(b.category);
          break;
        case "default":
          comparison = 0;
      }
      return sortConfig.direction === "asc" ? comparison : -comparison;
    });

    return result;
  }, [transactions, searchTerm, typeFilter, recurringFilter, sortConfig]);
  const handleSort = (field) => {
    setSortConfig((current) => {
      return {
        field,
        direction:
          current.field === field && current.direction === "asc"
            ? "desc"
            : "asc",
      };
    });
  };

  const handleSelect = (id) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedIds((current) =>
      current.length === filteredAndSortedTransactions.length
        ? []
        : filteredAndSortedTransactions.map((item) => item.id)
    );
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setTypeFilter("");
    setRecurringFilter("");
    setSelectedIds([]);
  };

  const {
    data: bulkDeletedTransactions,
    loading: bulkDeleteTransactionsLoading,
    func: bulkDeleteTransactionsFunc,
  } = useFetch(bulkDeleteTransactions);
  const handleBulkDelete = async () => {
    if (
      !window.confirm(
        `Are you sure you want to delete ${selectedIds.length} transactions?`
      )
    ) {
      return;
    }
    await bulkDeleteTransactionsFunc(selectedIds);
  };
  useEffect(() => {
    if (bulkDeletedTransactions && !bulkDeleteTransactionsLoading) {
      toast.success("Transactions Deleted Successfully!");
    }
  }, [bulkDeletedTransactions, bulkDeleteTransactionsLoading]);

  return (
    <div className="space-y-4">
      {bulkDeleteTransactionsLoading && (
        <BarLoader className="mt-4" width="100%" color="#9333ea" />
      )}
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search transactions..."
          />
        </div>
        <div className="flex gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EXPENSE">Expense</SelectItem>
              <SelectItem value="INCOME">Income</SelectItem>
            </SelectContent>
          </Select>
          <Select value={recurringFilter} onValueChange={setRecurringFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Transactions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recurring">Recurring only</SelectItem>
              <SelectItem value="non-recurring">Non-recurring only</SelectItem>
            </SelectContent>
          </Select>
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                onClick={handleBulkDelete}
                variant="destructive"
                size="sm"
              >
                <Trash className="h-4 w-4 mr-2" />
                Delete Selected ({selectedIds.length})
              </Button>
            </div>
          )}
          {(searchTerm || typeFilter || recurringFilter) && (
            <Button
              variant="outline"
              size="icon"
              onClick={handleClearFilters}
              title="Clear Filters"
            >
              <X className="h-4 w-5" />
            </Button>
          )}
        </div>
      </div>
      {/* Transactions */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  onCheckedChange={handleSelectAll}
                  checked={
                    selectedIds.length ===
                      filteredAndSortedTransactions.length &&
                    filteredAndSortedTransactions.length > 0
                  }
                />
              </TableHead>
              <TableHead
                className="cursor-pointer"
                onClick={() => handleSort("date")}
              >
                <div className="flex items-center">
                  Date
                  {sortConfig.field === "date" &&
                  sortConfig.direction === "asc" ? (
                    <ChevronUp className="ml-1 h-4 w-4" />
                  ) : (
                    <ChevronDown className="ml-1 h-4 w-4" />
                  )}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer"
                onClick={() => handleSort("description")}
              >
                <div className="flex items-center">Description</div>
              </TableHead>
              <TableHead
                className="cursor-pointer"
                onClick={() => handleSort("category")}
              >
                <div className="flex items-center">
                  Category
                  {sortConfig.field === "category" &&
                  sortConfig.direction === "asc" ? (
                    <ChevronUp className="ml-1 h-4 w-4" />
                  ) : (
                    <ChevronDown className="ml-1 h-4 w-4" />
                  )}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer"
                onClick={() => handleSort("amount")}
              >
                <div className="flex items-center justify-end">
                  Amount
                  {sortConfig.field === "amount" &&
                  sortConfig.direction === "asc" ? (
                    <ChevronUp className="ml-1 h-4 w-4" />
                  ) : (
                    <ChevronDown className="ml-1 h-4 w-4" />
                  )}
                </div>
              </TableHead>
              <TableHead>Recurring</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedTransactions.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground"
                >
                  No Transactions Found
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedTransactions.map((transaction) => {
                const {
                  date,
                  description,
                  category,
                  amount,
                  type,
                  isRecurring,
                  id,
                  recurringInterval,
                  nextRecurringDate,
                } = transaction;
                return (
                  <TableRow key={id}>
                    <TableCell>
                      <Checkbox
                        onCheckedChange={() => handleSelect(id)}
                        checked={selectedIds.includes(id)}
                      />
                    </TableCell>
                    <TableCell>{format(new Date(date), "PP")}</TableCell>
                    <TableCell>{description}</TableCell>
                    <TableCell className="capitalize">
                      <span
                        style={{
                          background: categoryColors[category],
                        }}
                        className="px-2 py-1 rounded text-white text-sm"
                      >
                        {category}
                      </span>
                    </TableCell>
                    <TableCell
                      className="text-right"
                      style={{ color: type === "EXPENSE" ? "red" : "green" }}
                    >
                      {type === "EXPENSE" ? "-" : "+"} ₹{amount}
                    </TableCell>
                    <TableCell>
                      {isRecurring ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge
                                variant="outline"
                                className="gap-1 bg-purple-100 text-purple-700 hover:bg-purple-200"
                              >
                                <RefreshCcw className="h-3 w-3" />
                                {recurringInterval.charAt(0) +
                                  recurringInterval.slice(1).toLowerCase()}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-sm">
                                <div className="font-medium">Next Date:</div>
                                <div>
                                  {format(new Date(nextRecurringDate), "PP")}
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <Badge variant="outline" className="gap-1">
                          <Clock className="h-3 w-3" />
                          One-time
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(`/transaction/create?edit=${id}`)
                            }
                          >
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              bulkDeleteTransactionsFunc([id]);
                            }}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
export default TransactionTable;
