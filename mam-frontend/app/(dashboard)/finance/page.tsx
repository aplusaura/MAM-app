"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, patch, del } from "@/lib/api";
import { TopBar } from "@/components/layout/TopBar";
import { DataTable, Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { StatCard } from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Plus, DollarSign, TrendingUp, Clock, Pencil, Trash2, Receipt, CheckCircle, XCircle, TrendingDown, Scale, FileText } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { FilterDropdown } from "@/components/shared/FilterDropdown";
import type { Invoice, Client, RevenueMonth, Expense } from "@/types";
import { format } from "date-fns";

const MONTH_NAMES: Record<number, string> = {
  1:"Jan",2:"Feb",3:"Mar",4:"Apr",5:"May",6:"Jun",
  7:"Jul",8:"Aug",9:"Sep",10:"Oct",11:"Nov",12:"Dec",
};
const PAYMENT_STATUSES = ["draft", "sent", "partial", "paid", "overdue", "cancelled"];

interface InvoiceForm {
  client_id: string;
  issue_date: string;
  due_date: string;
  subtotal: string;
  notes: string;
}

interface ExpenseForm {
  title: string;
  category: string;
  amount: string;
  expense_date: string;
  notes: string;
}

interface PaymentForm {
  amount: string;
  payment_date: string;
  payment_method: string;
}

export default function FinancePage() {
  const { t } = useTranslation();
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Invoice | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<Invoice | null>(null);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [confirmExpenseOpen, setConfirmExpenseOpen] = useState(false);
  const [confirmExpenseTarget, setConfirmExpenseTarget] = useState<Expense | null>(null);
  const [timePeriod, setTimePeriod] = useState<"this_month" | "last_month" | "last_3" | "last_6" | "last_year" | "custom">("this_month");

  // Date range state — default to first day of current month → today
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const firstOfMonthStr = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "yyyy-MM-dd");
  const [dateFrom, setDateFrom] = useState<string>(firstOfMonthStr);
  const [dateTo, setDateTo] = useState<string>(todayStr);

  const qc = useQueryClient();

  const { data: invoicesData, isLoading } = useQuery<Invoice[]>({
    queryKey: ["invoices"],
    queryFn: () => get("/finance/invoices"),
  });

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["clients"],
    queryFn: () => get("/clients/"),
  });

  const { data: revenueData } = useQuery<RevenueMonth[]>({
    queryKey: ["revenue", "monthly"],
    queryFn: () => get(`/reports/revenue/monthly?year=${new Date().getFullYear()}`),
  });

  const { data: expensesData } = useQuery<Expense[]>({
    queryKey: ["expenses"],
    queryFn: () => get("/finance/expenses"),
  });

  const createExpenseMutation = useMutation({
    mutationFn: (body: object) => post("/finance/expenses", body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["expenses"] }); setExpenseOpen(false); resetExp(); toast.success("Expense added"); },
    onError: () => toast.error("Failed to add expense"),
  });

  const updateExpenseMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: object }) => patch(`/finance/expenses/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["expenses"] }); setExpenseOpen(false); setEditExpense(null); toast.success("Expense updated"); },
    onError: () => toast.error("Failed to update expense"),
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: (id: number) => del(`/finance/expenses/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["expenses"] }); toast.success("Expense deleted"); },
    onError: () => toast.error("Failed to delete expense"),
  });

  const createInvoiceMutation = useMutation({
    mutationFn: (body: object) => post("/finance/invoices", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      setInvoiceOpen(false);
      resetInv({});
      toast.success("Invoice created");
    },
    onError: () => toast.error("Failed to create invoice"),
  });

  const updateInvoiceMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: object }) => patch(`/finance/invoices/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      setEditOpen(false);
      toast.success("Invoice updated");
    },
    onError: () => toast.error("Failed to update invoice"),
  });

  const deleteInvoiceMutation = useMutation({
    mutationFn: (id: number) => del(`/finance/invoices/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice deleted");
    },
    onError: () => toast.error("Failed to delete invoice"),
  });

  const recordPaymentMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: object }) =>
      post(`/finance/payments`, { invoice_id: id, ...body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      setPaymentOpen(false);
      toast.success("Payment recorded");
    },
    onError: () => toast.error("Failed to record payment"),
  });

  const { register: regInv, handleSubmit: handleInv, reset: resetInv } = useForm<InvoiceForm>();
  const { register: regEdit, handleSubmit: handleEditInv, reset: resetEditInv } = useForm<InvoiceForm>();
  const { register: regExp, handleSubmit: handleExp, reset: resetExp } = useForm<ExpenseForm>({ defaultValues: { expense_date: format(new Date(), "yyyy-MM-dd") } });

  const { register: regPay, handleSubmit: handlePay, reset: resetPay } = useForm<PaymentForm>();

  const invoices = invoicesData ?? [];
  const statusOptions = ["all", ...PAYMENT_STATUSES];
  const filteredInvoices = invoices.filter((i) => statusFilter === "all" || i.payment_status === statusFilter);

  // Apply a preset — sets the dateFrom/dateTo inputs and tracks which preset is active
  const applyPreset = (preset: "this_month" | "last_month" | "last_3" | "last_6" | "last_year") => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    let from: Date;
    let to: Date;
    if (preset === "this_month") { from = new Date(y, m, 1); to = new Date(y, m + 1, 0); }
    else if (preset === "last_month") { from = new Date(y, m - 1, 1); to = new Date(y, m, 0); }
    else if (preset === "last_3") { from = new Date(y, m - 2, 1); to = new Date(y, m + 1, 0); }
    else if (preset === "last_6") { from = new Date(y, m - 5, 1); to = new Date(y, m + 1, 0); }
    else { from = new Date(y, 0, 1); to = new Date(y, 11, 31); }
    setDateFrom(format(from, "yyyy-MM-dd"));
    setDateTo(format(to, "yyyy-MM-dd"));
    setTimePeriod(preset);
  };

  const inPeriod = (dateStr: string | null | undefined) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const from = dateFrom ? new Date(dateFrom) : new Date(0);
    const to = dateTo ? new Date(dateTo + "T23:59:59") : new Date(8640000000000000);
    return d >= from && d <= to;
  };

  // Stats filtered by selected date range (issue_date used as anchor)
  const periodInvoices = invoices.filter((i) => inPeriod(i.issue_date));

  const totalCollected = periodInvoices
    .reduce((s, i) => s + Number(i.amount_paid ?? 0), 0);

  const overdueCount = invoices.filter((i) => i.payment_status === "overdue").length;
  const pendingTotal = periodInvoices
    .filter((i) => ["sent", "partial"].includes(i.payment_status))
    .reduce((s, i) => s + ((i.total_amount ?? 0) - (i.amount_paid ?? 0)), 0);

  const expenses = expensesData ?? [];
  const periodExpenses = expenses.filter((e) => inPeriod(e.expense_date));
  const totalExpenses = periodExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const totalBalance = totalCollected - totalExpenses;

  const clientMap = Object.fromEntries((clients ?? []).map((c) => [c.id, c.company_name]));
  const revenueMonths = (revenueData ?? []).slice(-6);

  const allExpensesForTab = expenses; // alias to avoid confusion with periodExpenses
  const allExpensesTotal = allExpensesForTab.reduce((s, e) => s + Number(e.amount || 0), 0);

  const openEditInvoice = (inv: Invoice) => {
    setEditTarget(inv);
    resetEditInv({
      client_id: inv.client_id ? String(inv.client_id) : "",
      issue_date: inv.issue_date.slice(0, 10),
      due_date: inv.due_date ? inv.due_date.slice(0, 10) : "",
      subtotal: String(inv.subtotal),
      notes: inv.notes ?? "",
    });
    setEditOpen(true);
  };

  const expenseColumns: Column<Expense>[] = [
    { key: "title", label: "Title", sortable: true, render: (row) => <span className="font-medium">{row.title}</span> },
    { key: "category", label: "Category", sortable: true, render: (row) => row.category ? <span className="capitalize">{row.category}</span> : "—" },
    { key: "amount", label: "Amount", sortable: true, render: (row) => <span className="font-medium text-red-600 dark:text-red-400">${Number(row.amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span> },
    { key: "expense_date", label: "Date", sortable: true, render: (row) => row.expense_date ? format(new Date(row.expense_date), "MMM d, yyyy") : "—" },
    { key: "notes", label: "Notes", render: (row) => <span className="text-gray-400 text-xs truncate max-w-32 block">{row.notes || "—"}</span> },
    {
      key: "actions", label: "",
      render: (row) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setEditExpense(row); resetExp({ title: row.title, category: row.category || "", amount: String(row.amount), expense_date: row.expense_date ? row.expense_date.slice(0,10) : "", notes: row.notes || "" }); setExpenseOpen(true); }}>
            <Pencil className="h-4 w-4 text-gray-400" />
          </Button>
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setConfirmExpenseTarget(row); setConfirmExpenseOpen(true); }}>
            <Trash2 className="h-4 w-4 text-red-400" />
          </Button>
        </div>
      ),
    },
  ];

  const columns: Column<Invoice>[] = [
    {
      key: "#", label: "#",
      render: (_row, index) => <span className="text-xs text-muted-foreground">{(index ?? 0) + 1}</span>,
    },
    { key: "invoice_number", label: "Invoice #", sortable: true },
    {
      key: "client_id", label: "Client",
      sortable: true,
      render: (row) => row.client_id ? (clientMap[row.client_id] ?? String(row.client_id)) : "—",
    },
    {
      key: "payment_status", label: "Status",
      sortable: true,
      render: (row) => <StatusBadge value={row.payment_status} />,
    },
    { key: "issue_date", label: "Issued", sortable: true, render: (row) => format(new Date(row.issue_date), "MMM d, yyyy") },
    { key: "due_date", label: "Due", sortable: true, render: (row) => row.due_date ? format(new Date(row.due_date), "MMM d, yyyy") : "—" },
    { key: "total_amount", label: "Total", sortable: true, render: (row) => <span className="font-medium text-gray-900 dark:text-gray-100">${Number(row.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span> },
    { key: "amount_paid", label: "Paid", sortable: true, render: (row) => <span className="font-medium text-emerald-600 dark:text-emerald-400">${Number(row.amount_paid || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span> },
    {
      key: "actions", label: "",
      render: (row) => (
        <div className="flex items-center gap-1">
          {row.payment_status !== "paid" && row.payment_status !== "cancelled" && (
            <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 text-xs px-2 h-7" onClick={(e) => { e.stopPropagation(); updateInvoiceMutation.mutate({ id: row.id, body: { payment_status: "paid" } }); }}>
              <CheckCircle className="h-3 w-3 mr-1" />Paid
            </Button>
          )}
          {row.payment_status === "paid" && (
            <Button size="sm" variant="outline" className="text-gray-500 border-gray-200 hover:bg-gray-50 text-xs px-2 h-7" onClick={(e) => { e.stopPropagation(); updateInvoiceMutation.mutate({ id: row.id, body: { payment_status: "sent" } }); }}>
              <XCircle className="h-3 w-3 mr-1" />Revert
            </Button>
          )}
          {["sent", "partial", "overdue"].includes(row.payment_status) && (
            <Button size="sm" variant="outline" onClick={(e) => {
              e.stopPropagation();
              setSelectedInvoice(row);
              resetPay({ payment_date: format(new Date(), "yyyy-MM-dd"), payment_method: "bank_transfer" });
              setPaymentOpen(true);
            }}>Pay</Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            title="Download PDF"
            onClick={(e) => {
              e.stopPropagation();
              window.open(`/print/invoice/${row.id}`, "_blank");
            }}
          >
            <FileText className="h-4 w-4 text-blue-400" />
          </Button>
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openEditInvoice(row); }}>
            <Pencil className="h-4 w-4 text-gray-400" />
          </Button>
          <Button variant="ghost" size="icon" onClick={(e) => {
            e.stopPropagation();
            setConfirmTarget(row);
            setConfirmOpen(true);
          }}>
            <Trash2 className="h-4 w-4 text-red-400" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <TopBar title={t("finance")} />
      <main className="flex-1 p-3 sm:p-6 space-y-4 sm:space-y-6 bg-gray-50 min-h-full">
        {/* Date range picker + preset buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Preset buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            {([
              { value: "this_month", label: "This Month" },
              { value: "last_month", label: "Last Month" },
              { value: "last_3", label: "Last 3 Months" },
              { value: "last_6", label: "Last 6 Months" },
              { value: "last_year", label: "This Year" },
            ] as const).map(({ value, label }) => (
              <button
                key={value}
                onClick={() => applyPreset(value)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${timePeriod === value ? "bg-blue-600 text-white border-blue-600" : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-blue-400"}`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Custom date inputs */}
          <div className="flex items-center gap-2 ml-auto">
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setTimePeriod("custom"); }}
                className="h-8 text-xs px-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setTimePeriod("custom"); }}
                className="h-8 text-xs px-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard title={t("totalRevenue")} value={`$${totalCollected.toLocaleString()}`} icon={DollarSign} color="green" />
          <StatCard title={t("outstandingInvoices")} value={`$${pendingTotal.toLocaleString()}`} icon={TrendingUp} color="yellow" />
          <StatCard title={t("overdue")} value={overdueCount} icon={Clock} color="red" />
          <StatCard title={t("totalExpenses")} value={`$${totalExpenses.toLocaleString()}`} icon={TrendingDown} color="orange" />
          <StatCard
            title="Net Balance"
            value={`${totalBalance >= 0 ? "" : "-"}$${Math.abs(totalBalance).toLocaleString()}`}
            icon={Scale}
            color={totalBalance >= 0 ? "blue" : "red"}
          />
        </div>

        <Tabs defaultValue="invoices">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <TabsList>
              <TabsTrigger value="invoices">{t("invoices")}</TabsTrigger>
              <TabsTrigger value="expenses">{t("expenses")}</TabsTrigger>
              <TabsTrigger value="revenue">Revenue</TabsTrigger>
            </TabsList>
            <div className="flex flex-wrap items-center gap-3">
              <FilterDropdown
                value={statusFilter}
                onChange={setStatusFilter}
                options={statusOptions.map((s) => ({ value: s, label: s === "all" ? t("all") : s.charAt(0).toUpperCase() + s.slice(1) }))}
                placeholder={t("paymentStatus")}
                accentColor="text-blue-600"
              />
              <Button onClick={() => { resetInv(); setInvoiceOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" /> {t("createInvoice")}
              </Button>
            </div>
          </div>

          <TabsContent value="invoices" className="mt-4">
            <DataTable columns={columns} data={filteredInvoices} isLoading={isLoading} emptyMessage="No invoices found." exportable paginated defaultPageSize={10} />
          </TabsContent>

          <TabsContent value="expenses" className="mt-4">
            <div className="flex justify-between items-center mb-3">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total: <span className="font-semibold text-red-600 dark:text-red-400">${allExpensesTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span></p>
              <Button size="sm" onClick={() => { setEditExpense(null); resetExp({ expense_date: format(new Date(), "yyyy-MM-dd") }); setExpenseOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />{t("addExpense")}
              </Button>
            </div>
            <DataTable columns={expenseColumns} data={allExpensesForTab} emptyMessage="No expenses yet." exportable paginated defaultPageSize={10} />
          </TabsContent>

          <TabsContent value="revenue" className="mt-4">
            <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Month</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Revenue Collected</th>
                  </tr>
                </thead>
                <tbody>
                  {revenueMonths.length === 0 ? (
                    <tr><td colSpan={2} className="text-center py-10 text-gray-400 text-sm">No revenue data</td></tr>
                  ) : revenueMonths.map((r) => (
                    <tr key={r.month} className="border-b border-gray-50 dark:border-gray-700/50 last:border-0 hover:bg-gray-50/60 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{MONTH_NAMES[r.month] ?? r.month}</td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">${Number(r.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>

        {/* New Invoice Dialog */}
        <Dialog open={invoiceOpen} onOpenChange={setInvoiceOpen}>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-lg">
            <div className="bg-amber-500 -mx-4 -mt-4 mb-4 px-4 pt-5 pb-4 rounded-t-xl">
              <div className="flex flex-wrap items-center gap-2">
                <div className="p-1.5 bg-white/20 rounded-lg"><Receipt className="h-4 w-4 text-white" /></div>
                <div>
                  <h2 className="text-base font-semibold text-white">{t("createInvoice")}</h2>
                  <p className="text-xs text-amber-100">Create a new invoice for a client</p>
                </div>
              </div>
            </div>
            <form
              onSubmit={handleInv((d) => {
                const subtotal = parseFloat(d.subtotal);
                createInvoiceMutation.mutate({
                  client_id: d.client_id ? parseInt(d.client_id) : undefined,
                  issue_date: d.issue_date,
                  due_date: d.due_date || undefined,
                  items: [{ description: "Services", quantity: 1, unit_price: subtotal }],
                  tax_amount: 0,
                  discount_amount: 0,
                  payment_status: "draft",
                  notes: d.notes || undefined,
                });
              })}
              className="space-y-3"
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label>Client *</Label>
                  <NativeSelect {...regInv("client_id", { required: true })} className="mt-1">
                    <option value="">Select client</option>
                    {(clients ?? []).map((c) => <option key={c.id} value={String(c.id)}>{c.company_name}</option>)}
                  </NativeSelect>
                </div>
                <div><Label>{t("issueDate")} *</Label><Input type="date" {...regInv("issue_date", { required: true })} className="mt-1" /></div>
                <div><Label>Due Date *</Label><Input type="date" {...regInv("due_date", { required: true })} className="mt-1" /></div>
                <div className="col-span-2"><Label>{t("subtotal")} ($) *</Label><Input type="number" step="0.01" {...regInv("subtotal", { required: true })} className="mt-1" /></div>
                <div className="col-span-2"><Label>{t("notes")}</Label><Input {...regInv("notes")} className="mt-1" /></div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setInvoiceOpen(false)}>{t("cancel")}</Button>
                <Button type="submit" disabled={createInvoiceMutation.isPending} className="bg-amber-500 hover:bg-amber-600 text-white">{createInvoiceMutation.isPending ? t("loading") : t("create")}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Invoice Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-lg">
            <DialogHeader><DialogTitle>{t("editInvoice")}</DialogTitle></DialogHeader>
            {editTarget && (
              <form
                onSubmit={handleEditInv((d) => updateInvoiceMutation.mutate({
                  id: editTarget.id,
                  body: {
                    client_id: d.client_id ? parseInt(d.client_id) : null,
                    issue_date: d.issue_date || null,
                    due_date: d.due_date || null,
                    notes: d.notes || null,
                  },
                }))}
                className="space-y-3"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label>Client</Label>
                    <NativeSelect {...regEdit("client_id")} className="mt-1">
                      <option value="">Select client</option>
                      {(clients ?? []).map((c) => <option key={c.id} value={String(c.id)}>{c.company_name}</option>)}
                    </NativeSelect>
                  </div>
                  <div><Label>{t("issueDate")}</Label><Input type="date" {...regEdit("issue_date")} className="mt-1" /></div>
                  <div><Label>Due Date</Label><Input type="date" {...regEdit("due_date")} className="mt-1" /></div>
                  <div>
                    <Label>{t("paymentStatus")}</Label>
                    <NativeSelect className="mt-1" defaultValue={editTarget.payment_status} onChange={(e) => updateInvoiceMutation.mutate({ id: editTarget.id, body: { payment_status: e.target.value } })}>
                      {PAYMENT_STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </NativeSelect>
                  </div>
                  <div className="col-span-2"><Label>{t("notes")}</Label><Input {...regEdit("notes")} className="mt-1" /></div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>{t("cancel")}</Button>
                  <Button type="submit" disabled={updateInvoiceMutation.isPending}>{updateInvoiceMutation.isPending ? t("loading") : t("save")}</Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Record Payment Dialog */}
        <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Record Payment — {selectedInvoice?.invoice_number}</DialogTitle></DialogHeader>
            <form
              onSubmit={handlePay((d) => {
                if (!selectedInvoice) return;
                recordPaymentMutation.mutate({ id: selectedInvoice.id, body: { amount: parseFloat(d.amount), payment_date: d.payment_date, method: d.payment_method } });
              })}
              className="space-y-3"
            >
              <div><Label>{t("amount")} ($)</Label><Input type="number" step="0.01" {...regPay("amount", { required: true })} className="mt-1" /></div>
              <div><Label>{t("paymentDate")}</Label><Input type="date" {...regPay("payment_date")} className="mt-1" /></div>
              <div><Label>{t("paymentMethod")}</Label><Input {...regPay("payment_method")} placeholder="bank_transfer, cash, cheque..." className="mt-1" /></div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setPaymentOpen(false)}>{t("cancel")}</Button>
                <Button type="submit" disabled={recordPaymentMutation.isPending}>{recordPaymentMutation.isPending ? t("loading") : t("addPayment")}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </main>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete Invoice"
        description={`Are you sure you want to delete invoice ${confirmTarget?.invoice_number}? This action cannot be undone.`}
        onConfirm={() => { if (confirmTarget) { deleteInvoiceMutation.mutate(confirmTarget.id); setConfirmOpen(false); } }}
        loading={deleteInvoiceMutation.isPending}
      />

      {/* Expense Dialog */}
      <Dialog open={expenseOpen} onOpenChange={(v) => { setExpenseOpen(v); if (!v) setEditExpense(null); }}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md">
          <DialogHeader><DialogTitle>{editExpense ? t("edit") : t("addExpense")}</DialogTitle></DialogHeader>
          <form
            onSubmit={handleExp((d) => {
              const body = { title: d.title, category: d.category || undefined, amount: parseFloat(d.amount), expense_date: d.expense_date, notes: d.notes || undefined };
              if (editExpense) updateExpenseMutation.mutate({ id: editExpense.id, body });
              else createExpenseMutation.mutate(body);
            })}
            className="space-y-3"
          >
            <div><Label>{t("title")} *</Label><Input {...regExp("title", { required: true })} className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("category")}</Label>
                <NativeSelect {...regExp("category")} className="mt-1">
                  <option value="">Select category</option>
                  {["salary", "rent", "software", "marketing", "travel", "equipment", "utilities", "other"].map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
                </NativeSelect>
              </div>
              <div><Label>Amount ($) *</Label><Input type="number" step="0.01" {...regExp("amount", { required: true })} className="mt-1" /></div>
            </div>
            <div><Label>Date *</Label><Input type="date" {...regExp("expense_date", { required: true })} className="mt-1" /></div>
            <div><Label>Notes</Label><Input {...regExp("notes")} className="mt-1" /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setExpenseOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createExpenseMutation.isPending || updateExpenseMutation.isPending}>{editExpense ? "Save" : "Add"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmExpenseOpen}
        onOpenChange={setConfirmExpenseOpen}
        title="Delete Expense"
        description={`Delete "${confirmExpenseTarget?.title}"? This cannot be undone.`}
        onConfirm={() => { if (confirmExpenseTarget) { deleteExpenseMutation.mutate(confirmExpenseTarget.id); setConfirmExpenseOpen(false); } }}
        loading={deleteExpenseMutation.isPending}
      />
    </>
  );
}
