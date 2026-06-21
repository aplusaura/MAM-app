"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/lib/api";
import { format } from "date-fns";
import type { Invoice, Client } from "@/types";
import { FileText } from "lucide-react";

const fmt = (n: number | null | undefined) =>
  `$${Number(n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

export default function InvoicePrintPage() {
  const { id } = useParams<{ id: string }>();

  const { data: invoice, isLoading: invLoading } = useQuery<Invoice>({
    queryKey: ["invoice", id],
    queryFn: () => get(`/invoices/${id}`),
    enabled: !!id,
  });

  const { data: client, isLoading: clientLoading } = useQuery<Client>({
    queryKey: ["client", invoice?.client_id],
    queryFn: () => get(`/clients/${invoice!.client_id}`),
    enabled: !!invoice?.client_id,
  });

  const isLoading = invLoading || clientLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 text-sm">Loading invoice...</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-red-500 text-sm">Invoice not found.</p>
      </div>
    );
  }

  const balance = Number(invoice.total_amount ?? 0) - Number(invoice.amount_paid ?? 0);

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
        }
      `}</style>

      {/* Print / PDF button */}
      <div className="no-print fixed top-4 right-4 z-50">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-md transition-colors"
        >
          <FileText className="h-4 w-4" />
          Print / Save as PDF
        </button>
      </div>

      {/* Invoice document */}
      <div className="min-h-screen bg-gray-100 flex items-start justify-center py-10 px-4 print:bg-white print:p-0 print:block">
        <div className="w-full max-w-2xl bg-white shadow-lg rounded-xl overflow-hidden print:shadow-none print:rounded-none">

          {/* Header */}
          <div className="px-10 pt-10 pb-6 border-b border-gray-100">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Your Agency</h1>
                <p className="text-sm text-gray-500 mt-1">agency@example.com</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-extrabold text-gray-800 tracking-wide uppercase">Invoice</p>
                <p className="text-sm text-gray-500 mt-2">
                  <span className="font-medium text-gray-700">Invoice #:</span>{" "}
                  {invoice.invoice_number}
                </p>
                <p className="text-sm text-gray-500">
                  <span className="font-medium text-gray-700">Date:</span>{" "}
                  {format(new Date(invoice.issue_date), "MMM d, yyyy")}
                </p>
                {invoice.due_date && (
                  <p className="text-sm text-gray-500">
                    <span className="font-medium text-gray-700">Due:</span>{" "}
                    {format(new Date(invoice.due_date), "MMM d, yyyy")}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Bill To */}
          <div className="px-10 py-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Bill To</p>
            {client ? (
              <>
                <p className="text-base font-semibold text-gray-900">{client.company_name}</p>
                {client.contact_person && (
                  <p className="text-sm text-gray-600">{client.contact_person}</p>
                )}
                {client.email && (
                  <p className="text-sm text-gray-500">{client.email}</p>
                )}
                {client.phone && (
                  <p className="text-sm text-gray-500">{client.phone}</p>
                )}
                {client.address && (
                  <p className="text-sm text-gray-500">{client.address}</p>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-500">—</p>
            )}
          </div>

          {/* Line items table */}
          <div className="px-10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t border-b border-gray-200">
                  <th className="text-left py-3 font-semibold text-gray-500 uppercase tracking-wide text-xs">
                    Description
                  </th>
                  <th className="text-right py-3 font-semibold text-gray-500 uppercase tracking-wide text-xs">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-4 text-gray-800">
                    {invoice.notes ? invoice.notes : "Professional Services"}
                  </td>
                  <td className="py-4 text-right font-medium text-gray-900">
                    {fmt(invoice.subtotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="px-10 pt-4 pb-10">
            <div className="ml-auto w-64 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{fmt(invoice.subtotal)}</span>
              </div>
              {Number(invoice.tax_amount ?? 0) > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Tax</span>
                  <span>{fmt(invoice.tax_amount)}</span>
                </div>
              )}
              {Number(invoice.discount_amount ?? 0) > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Discount</span>
                  <span>- {fmt(invoice.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>Total</span>
                <span className="font-semibold text-gray-900">{fmt(invoice.total_amount)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Amount Paid</span>
                <span className="text-emerald-600 font-medium">{fmt(invoice.amount_paid)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2 font-semibold text-gray-900">
                <span>Balance Due</span>
                <span className={balance > 0 ? "text-red-600" : "text-emerald-600"}>
                  {fmt(balance)}
                </span>
              </div>
            </div>

            {/* Status badge */}
            <div className="mt-8 flex justify-end">
              <span
                className={`inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest ${
                  invoice.payment_status === "paid"
                    ? "bg-emerald-100 text-emerald-700"
                    : invoice.payment_status === "overdue"
                    ? "bg-red-100 text-red-700"
                    : invoice.payment_status === "partial"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {invoice.payment_status}
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="px-10 py-4 bg-gray-50 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400">
              Thank you for your business. Please contact us at agency@example.com for any questions.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
