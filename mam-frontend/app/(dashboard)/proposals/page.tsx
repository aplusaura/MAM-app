"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { post, getErrorMessage } from "@/lib/api";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { FileText, Sparkles, ChevronRight, ChevronLeft, Printer } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

interface ProposalForm {
  client_name: string;
  contact_name: string;
  service_type: string;
  scope_description: string;
  timeline_weeks: string;
  budget_range: string;
  extra_notes: string;
}

const STEPS = ["Client Info", "Services & Scope", "Timeline & Budget", "Generate & Preview"];

export default function ProposalsPage() {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<ProposalForm>({
    client_name: "", contact_name: "", service_type: "", scope_description: "",
    timeline_weeks: "", budget_range: "", extra_notes: "",
  });
  const [proposal, setProposal] = useState<string | null>(null);

  const f = (key: keyof ProposalForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const generateMutation = useMutation<{ proposal?: string }, Error>({
    mutationFn: () => post("/ai/generate-proposal", {
      client_name: form.client_name,
      service: form.service_type,
      scope: form.scope_description,
      timeline: `${form.timeline_weeks} weeks`,
      budget: form.budget_range || undefined,
      notes: [form.contact_name ? `Contact: ${form.contact_name}` : "", form.extra_notes].filter(Boolean).join(". ") || undefined,
    }) as Promise<{ proposal?: string }>,
    onSuccess: (data) => {
      setProposal(data.proposal ?? "");
      toast.success("Proposal generated");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const canNext = [
    form.client_name.trim().length > 0,
    form.service_type.trim().length > 0 && form.scope_description.trim().length > 0,
    form.timeline_weeks.trim().length > 0,
    true,
  ][step];

  return (
    <>
      <TopBar title={t("proposals")} />
      <main className="flex-1 p-3 sm:p-6 bg-gray-50 dark:bg-gray-950 min-h-full">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Step indicators */}
          <div className="flex items-center gap-2">
            {STEPS.map((label, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  i === step ? "bg-blue-600 text-white" : i < step ? "bg-green-100 text-green-700" : "bg-gray-100 dark:bg-gray-800 text-gray-400"
                }`}>
                  <span>{i + 1}</span>
                  <span className="hidden sm:inline">{label}</span>
                </div>
                {i < STEPS.length - 1 && <ChevronRight className="h-3.5 w-3.5 text-gray-300 shrink-0" />}
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
            {/* Step 0: Client Info */}
            {step === 0 && (
              <div className="space-y-4">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2"><FileText className="h-4 w-4 text-blue-500" />Client Information</h2>
                <div><Label>Client / Company Name *</Label><Input value={form.client_name} onChange={f("client_name")} placeholder="Acme Corp" className="mt-1" /></div>
                <div><Label>Contact Name</Label><Input value={form.contact_name} onChange={f("contact_name")} placeholder="Jane Smith" className="mt-1" /></div>
              </div>
            )}

            {/* Step 1: Services & Scope */}
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2"><FileText className="h-4 w-4 text-blue-500" />Services & Scope</h2>
                <div>
                  <Label>Service Type *</Label>
                  <select
                    value={form.service_type}
                    onChange={f("service_type")}
                    className="mt-1 w-full h-9 border border-gray-200 dark:border-gray-600 rounded-lg px-3 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select service…</option>
                    <option value="Social Media Management">Social Media Management</option>
                    <option value="Video Production">Video Production</option>
                    <option value="Photography">Photography</option>
                    <option value="Content Creation">Content Creation</option>
                    <option value="Brand Strategy">Brand Strategy</option>
                    <option value="Full Agency Retainer">Full Agency Retainer</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div><Label>Scope Description *</Label><Textarea value={form.scope_description} onChange={f("scope_description")} placeholder="Describe what will be delivered…" rows={4} className="mt-1" /></div>
              </div>
            )}

            {/* Step 2: Timeline & Budget */}
            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2"><FileText className="h-4 w-4 text-blue-500" />Timeline & Budget</h2>
                <div><Label>Timeline (weeks) *</Label><Input type="number" min="1" value={form.timeline_weeks} onChange={f("timeline_weeks")} placeholder="4" className="mt-1" /></div>
                <div><Label>Budget Range</Label><Input value={form.budget_range} onChange={f("budget_range")} placeholder="e.g. $3,000 – $5,000 / month" className="mt-1" /></div>
                <div><Label>Additional Notes</Label><Textarea value={form.extra_notes} onChange={f("extra_notes")} placeholder="Any special requirements, deliverables, or context…" rows={3} className="mt-1" /></div>
              </div>
            )}

            {/* Step 3: Generate & Preview */}
            {step === 3 && (
              <div className="space-y-4">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2"><Sparkles className="h-4 w-4 text-blue-500" />Generate & Preview</h2>
                {!proposal ? (
                  <div className="text-center py-10 space-y-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Review your inputs, then generate the proposal using AI.</p>
                    <div className="text-left bg-gray-50 dark:bg-gray-900 rounded-lg p-4 text-xs text-gray-600 dark:text-gray-400 space-y-1">
                      <p><span className="font-medium">Client:</span> {form.client_name}{form.contact_name ? ` · ${form.contact_name}` : ""}</p>
                      <p><span className="font-medium">Service:</span> {form.service_type}</p>
                      <p><span className="font-medium">Timeline:</span> {form.timeline_weeks} weeks{form.budget_range ? ` · ${form.budget_range}` : ""}</p>
                    </div>
                    <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending} className="gap-2">
                      <Sparkles className="h-4 w-4" />
                      {generateMutation.isPending ? "Generating…" : "Generate Proposal"}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/40 px-3 py-1 rounded-full">Proposal generated</p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setProposal(null)}>Regenerate</Button>
                        <Button size="sm" onClick={() => window.print()} className="gap-1.5">
                          <Printer className="h-3.5 w-3.5" />Export / Print
                        </Button>
                      </div>
                    </div>
                    <div
                      id="proposal-content"
                      className="prose dark:prose-invert max-w-none text-sm bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-700 p-6 whitespace-pre-wrap"
                    >
                      {proposal}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
              <Button variant="outline" onClick={() => setStep((s) => s - 1)} disabled={step === 0}>
                <ChevronLeft className="h-4 w-4 mr-1" />{t("back")}
              </Button>
              {step < STEPS.length - 1 ? (
                <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
                  Next<ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </main>

      <style jsx global>{`
        @media print {
          body > *:not(#proposal-content) { display: none !important; }
          #proposal-content { display: block !important; margin: 0; padding: 2rem; }
        }
      `}</style>
    </>
  );
}
