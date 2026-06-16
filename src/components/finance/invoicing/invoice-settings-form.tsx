"use client";

import { useEffect, useRef } from "react";
import { useForm, Controller, type UseFormRegisterReturn } from "react-hook-form";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { api } from "~/trpc/react";
import { authClient } from "~/lib/auth-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Switch } from "~/components/ui/switch";
import { PermissionButton } from "~/components/shared/permission-button";
import { CurrencyCombobox } from "./currency-combobox";
import { DEFAULT_EMAIL_TEMPLATES } from "~/lib/invoice/email-templates";

interface FormValues {
  businessName: string;
  businessEmail: string;
  businessPhone: string;
  businessAddress: string;
  businessWebsite: string;
  logoUrl: string;
  defaultCurrency: string;
  defaultTaxEnabled: boolean;
  defaultTaxLabel: string;
  defaultTaxRate: number;
  taxRegistrationId: string;
  defaultPaymentTerms: string;
  paymentInstructions: string;
  defaultNotes: string;
  defaultTermsAndConditions: string;
  invoicePrefix: string;
  invoiceNumberFormat: string;
  invoiceSequenceNext: number;
  invoiceSequencePadding: number;
  emailInvoiceSubject: string;
  emailInvoiceBody: string;
  emailReminderSubject: string;
  emailReminderBody: string;
  emailReceiptSubject: string;
  emailReceiptBody: string;
}

const FALLBACK: FormValues = {
  businessName: "",
  businessEmail: "",
  businessPhone: "",
  businessAddress: "",
  businessWebsite: "",
  logoUrl: "",
  defaultCurrency: "USD",
  defaultTaxEnabled: true,
  defaultTaxLabel: "Tax",
  defaultTaxRate: 0,
  taxRegistrationId: "",
  defaultPaymentTerms: "Net 30",
  paymentInstructions: "",
  defaultNotes: "",
  defaultTermsAndConditions: "",
  invoicePrefix: "INV",
  invoiceNumberFormat: "{prefix}-{YYYY}-{seq}",
  invoiceSequenceNext: 1,
  invoiceSequencePadding: 4,
  emailInvoiceSubject: "",
  emailInvoiceBody: "",
  emailReminderSubject: "",
  emailReminderBody: "",
  emailReceiptSubject: "",
  emailReceiptBody: "",
};

const nn = (v: string) => (v.trim() ? v.trim() : null);

export function InvoiceSettingsForm({ organizationId }: { organizationId: string }) {
  const { data: session } = authClient.useSession();
  const utils = api.useUtils();
  const { data: settings, isLoading } = api.invoiceSettings.get.useQuery({
    organizationId,
  });

  const form = useForm<FormValues>({ defaultValues: FALLBACK });
  const { register, control, handleSubmit, reset } = form;

  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current || isLoading) return;
    if (settings) {
      reset({
        businessName: settings.businessName ?? "",
        businessEmail: settings.businessEmail ?? "",
        businessPhone: settings.businessPhone ?? "",
        businessAddress: settings.businessAddress ?? "",
        businessWebsite: settings.businessWebsite ?? "",
        logoUrl: settings.logoUrl ?? "",
        defaultCurrency: settings.defaultCurrency,
        defaultTaxEnabled: settings.defaultTaxEnabled,
        defaultTaxLabel: settings.defaultTaxLabel,
        defaultTaxRate: Number(settings.defaultTaxRate),
        taxRegistrationId: settings.taxRegistrationId ?? "",
        defaultPaymentTerms: settings.defaultPaymentTerms,
        paymentInstructions: settings.paymentInstructions ?? "",
        defaultNotes: settings.defaultNotes ?? "",
        defaultTermsAndConditions: settings.defaultTermsAndConditions ?? "",
        invoicePrefix: settings.invoicePrefix,
        invoiceNumberFormat: settings.invoiceNumberFormat,
        invoiceSequenceNext: settings.invoiceSequenceNext,
        invoiceSequencePadding: settings.invoiceSequencePadding,
        emailInvoiceSubject: settings.emailInvoiceSubject ?? "",
        emailInvoiceBody: settings.emailInvoiceBody ?? "",
        emailReminderSubject: settings.emailReminderSubject ?? "",
        emailReminderBody: settings.emailReminderBody ?? "",
        emailReceiptSubject: settings.emailReceiptSubject ?? "",
        emailReceiptBody: settings.emailReceiptBody ?? "",
      });
    }
    seeded.current = true;
  }, [settings, isLoading, reset]);

  const mutation = api.invoiceSettings.upsert.useMutation({
    onSuccess: () => {
      toast.success("Invoicing settings saved");
      void utils.invoiceSettings.get.invalidate({ organizationId });
    },
    onError: e => toast.error(e.message ?? "Failed to save settings"),
  });

  const onSubmit = (v: FormValues) => {
    mutation.mutate({
      organizationId,
      businessName: nn(v.businessName),
      businessEmail: nn(v.businessEmail),
      businessPhone: nn(v.businessPhone),
      businessAddress: nn(v.businessAddress),
      businessWebsite: nn(v.businessWebsite),
      logoUrl: nn(v.logoUrl),
      defaultCurrency: v.defaultCurrency,
      defaultTaxEnabled: v.defaultTaxEnabled,
      defaultTaxLabel: v.defaultTaxLabel || "Tax",
      defaultTaxRate: Number(v.defaultTaxRate) || 0,
      taxRegistrationId: nn(v.taxRegistrationId),
      defaultPaymentTerms: v.defaultPaymentTerms || "Net 30",
      paymentInstructions: nn(v.paymentInstructions),
      defaultNotes: nn(v.defaultNotes),
      defaultTermsAndConditions: nn(v.defaultTermsAndConditions),
      invoicePrefix: v.invoicePrefix || "INV",
      invoiceNumberFormat: v.invoiceNumberFormat || "{prefix}-{YYYY}-{seq}",
      invoiceSequenceNext: Math.max(1, Math.floor(Number(v.invoiceSequenceNext) || 1)),
      invoiceSequencePadding: Math.min(
        12,
        Math.max(1, Math.floor(Number(v.invoiceSequencePadding) || 4))
      ),
      emailInvoiceSubject: nn(v.emailInvoiceSubject),
      emailInvoiceBody: nn(v.emailInvoiceBody),
      emailReminderSubject: nn(v.emailReminderSubject),
      emailReminderBody: nn(v.emailReminderBody),
      emailReceiptSubject: nn(v.emailReceiptSubject),
      emailReceiptBody: nn(v.emailReceiptBody),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Business identity */}
      <Card>
        <CardHeader>
          <CardTitle>Business Identity</CardTitle>
          <CardDescription>Shown as the &quot;from&quot; on every invoice.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Business name">
            <Input {...register("businessName")} placeholder="Your Business" />
          </Field>
          <Field label="Logo URL">
            <Input {...register("logoUrl")} placeholder="https://…/logo.png" />
          </Field>
          <Field label="Email">
            <Input {...register("businessEmail")} type="email" />
          </Field>
          <Field label="Phone">
            <Input {...register("businessPhone")} />
          </Field>
          <Field label="Website">
            <Input {...register("businessWebsite")} />
          </Field>
          <Field label="Address" className="sm:col-span-2">
            <Textarea rows={2} {...register("businessAddress")} />
          </Field>
        </CardContent>
      </Card>

      {/* Defaults */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice Defaults</CardTitle>
          <CardDescription>Applied to new invoices; overridable per invoice.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Default currency">
              <Controller
                control={control}
                name="defaultCurrency"
                render={({ field }) => (
                  <CurrencyCombobox value={field.value} onChange={field.onChange} />
                )}
              />
            </Field>
            <Field label="Default payment terms">
              <Input {...register("defaultPaymentTerms")} placeholder="Net 30" />
            </Field>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label className="text-sm">Apply tax by default</Label>
              <p className="text-xs text-muted-foreground">
                Turn off for regions with no applicable tax
              </p>
            </div>
            <Controller
              control={control}
              name="defaultTaxEnabled"
              render={({ field }) => (
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Tax label">
              <Input {...register("defaultTaxLabel")} placeholder="VAT, GST…" />
            </Field>
            <Field label="Tax rate (%)">
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                {...register("defaultTaxRate", { valueAsNumber: true })}
              />
            </Field>
            <Field label="Tax / Reg. ID">
              <Input {...register("taxRegistrationId")} />
            </Field>
          </div>

          <Field label="Payment instructions">
            <Textarea
              rows={3}
              placeholder="Bank / IBAN / SWIFT, PayPal, Wise, etc."
              {...register("paymentInstructions")}
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Default notes">
              <Textarea rows={2} {...register("defaultNotes")} />
            </Field>
            <Field label="Default terms & conditions">
              <Textarea rows={2} {...register("defaultTermsAndConditions")} />
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* Numbering */}
      <Card>
        <CardHeader>
          <CardTitle>Numbering</CardTitle>
          <CardDescription>
            Tokens: <code className="text-xs">{"{prefix} {YYYY} {MM} {seq}"}</code>
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Prefix">
            <Input {...register("invoicePrefix")} />
          </Field>
          <Field label="Format">
            <Input {...register("invoiceNumberFormat")} />
          </Field>
          <Field label="Next number">
            <Input
              type="number"
              min="1"
              {...register("invoiceSequenceNext", { valueAsNumber: true })}
            />
          </Field>
          <Field label="Zero padding">
            <Input
              type="number"
              min="1"
              max="12"
              {...register("invoiceSequencePadding", { valueAsNumber: true })}
            />
          </Field>
        </CardContent>
      </Card>

      {/* Email templates */}
      <Card>
        <CardHeader>
          <CardTitle>Email Templates</CardTitle>
          <CardDescription>
            Variables:{" "}
            <code className="text-xs">
              {"{clientName} {invoiceNumber} {amountDue} {dueDate} {companyName}"}
            </code>
            . Leave blank to use the built-in default.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <EmailTemplateFields
            title="Invoice"
            subjectProps={register("emailInvoiceSubject")}
            bodyProps={register("emailInvoiceBody")}
            placeholderSubject={DEFAULT_EMAIL_TEMPLATES.invoice.subject}
            placeholderBody={DEFAULT_EMAIL_TEMPLATES.invoice.body}
          />
          <EmailTemplateFields
            title="Reminder"
            subjectProps={register("emailReminderSubject")}
            bodyProps={register("emailReminderBody")}
            placeholderSubject={DEFAULT_EMAIL_TEMPLATES.reminder.subject}
            placeholderBody={DEFAULT_EMAIL_TEMPLATES.reminder.body}
          />
          <EmailTemplateFields
            title="Payment receipt"
            subjectProps={register("emailReceiptSubject")}
            bodyProps={register("emailReceiptBody")}
            placeholderSubject={DEFAULT_EMAIL_TEMPLATES.receipt.subject}
            placeholderBody={DEFAULT_EMAIL_TEMPLATES.receipt.body}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <PermissionButton
          userId={session?.user.id ?? ""}
          organizationId={organizationId}
          requiredPermission="admin"
          module="finance"
          onClick={handleSubmit(onSubmit)}
          disabled={mutation.isPending}
        >
          {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Settings
        </PermissionButton>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  );
}

function EmailTemplateFields({
  title,
  subjectProps,
  bodyProps,
  placeholderSubject,
  placeholderBody,
}: {
  title: string;
  subjectProps: UseFormRegisterReturn;
  bodyProps: UseFormRegisterReturn;
  placeholderSubject: string;
  placeholderBody: string;
}) {
  return (
    <div className="space-y-2 rounded-lg border p-3">
      <p className="text-sm font-medium">{title}</p>
      <Field label="Subject">
        <Input placeholder={placeholderSubject} {...subjectProps} />
      </Field>
      <Field label="Body">
        <Textarea rows={3} placeholder={placeholderBody} {...bodyProps} />
      </Field>
    </div>
  );
}
