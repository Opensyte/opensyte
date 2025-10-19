import { z } from 'zod';
import { Prisma } from '@prisma/client';
import Decimal from 'decimal.js';

/////////////////////////////////////////
// HELPER FUNCTIONS
/////////////////////////////////////////

// JSON
//------------------------------------------------------

export type NullableJsonInput = Prisma.JsonValue | null | 'JsonNull' | 'DbNull' | Prisma.NullTypes.DbNull | Prisma.NullTypes.JsonNull;

export const transformJsonNull = (v?: NullableJsonInput) => {
  if (!v || v === 'DbNull') return Prisma.DbNull;
  if (v === 'JsonNull') return Prisma.JsonNull;
  return v;
};

export const JsonValueSchema: z.ZodType<Prisma.JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.literal(null),
    z.record(z.lazy(() => JsonValueSchema.optional())),
    z.array(z.lazy(() => JsonValueSchema)),
  ])
);

export type JsonValueType = z.infer<typeof JsonValueSchema>;

export const NullableJsonValue = z
  .union([JsonValueSchema, z.literal('DbNull'), z.literal('JsonNull')])
  .nullable()
  .transform((v) => transformJsonNull(v));

export type NullableJsonValueType = z.infer<typeof NullableJsonValue>;

export const InputJsonValueSchema: z.ZodType<Prisma.InputJsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.object({ toJSON: z.function(z.tuple([]), z.any()) }),
    z.record(z.lazy(() => z.union([InputJsonValueSchema, z.literal(null)]))),
    z.array(z.lazy(() => z.union([InputJsonValueSchema, z.literal(null)]))),
  ])
);

export type InputJsonValueType = z.infer<typeof InputJsonValueSchema>;

// DECIMAL
//------------------------------------------------------

export const DecimalJsLikeSchema: z.ZodType<Prisma.DecimalJsLike> = z.object({
  d: z.array(z.number()),
  e: z.number(),
  s: z.number(),
  toFixed: z.function(z.tuple([]), z.string()),
})

export const DECIMAL_STRING_REGEX = /^(?:-?Infinity|NaN|-?(?:0[bB][01]+(?:\.[01]+)?(?:[pP][-+]?\d+)?|0[oO][0-7]+(?:\.[0-7]+)?(?:[pP][-+]?\d+)?|0[xX][\da-fA-F]+(?:\.[\da-fA-F]+)?(?:[pP][-+]?\d+)?|(?:\d+|\d*\.\d+)(?:[eE][-+]?\d+)?))$/;

export const isValidDecimalInput =
  (v?: null | string | number | Prisma.DecimalJsLike): v is string | number | Prisma.DecimalJsLike => {
    if (v === undefined || v === null) return false;
    return (
      (typeof v === 'object' && 'd' in v && 'e' in v && 's' in v && 'toFixed' in v) ||
      (typeof v === 'string' && DECIMAL_STRING_REGEX.test(v)) ||
      typeof v === 'number'
    )
  };

/////////////////////////////////////////
// ENUMS
/////////////////////////////////////////

export const TransactionIsolationLevelSchema = z.enum(['ReadUncommitted','ReadCommitted','RepeatableRead','Serializable']);

export const PermissionScalarFieldEnumSchema = z.enum(['id','name','description','module','action','createdAt','updatedAt']);

export const RolePermissionScalarFieldEnumSchema = z.enum(['id','role','permissionId','createdAt']);

export const CustomRoleScalarFieldEnumSchema = z.enum(['id','organizationId','name','description','color','isActive','createdById','createdAt','updatedAt']);

export const CustomRolePermissionScalarFieldEnumSchema = z.enum(['id','customRoleId','permissionId','createdAt']);

export const OrganizationScalarFieldEnumSchema = z.enum(['id','name','logo','website','industry','description','createdAt','updatedAt']);

export const ImportSessionScalarFieldEnumSchema = z.enum(['id','organizationId','createdByUserId','fileName','fileSize','fileType','module','entityType','status','dedupeMode','mappingConfig','summary','rowCount','processedCount','successCount','failureCount','skippedCount','createdAt','updatedAt','startedAt','completedAt','appliedTemplateId']);

export const ImportTemplateScalarFieldEnumSchema = z.enum(['id','organizationId','createdByUserId','name','module','entityType','mappingConfig','columnSignature','usageCount','lastUsedAt','createdAt','updatedAt']);

export const ImportRowScalarFieldEnumSchema = z.enum(['id','sessionId','rowNumber','rawData','mappedData','status','dedupeHint','score','createdAt','updatedAt']);

export const ImportRowIssueScalarFieldEnumSchema = z.enum(['id','sessionId','rowId','field','severity','message','hint','value','createdAt']);

export const UserOrganizationScalarFieldEnumSchema = z.enum(['userId','organizationId','role','customRoleId','joinedAt']);

export const CustomerScalarFieldEnumSchema = z.enum(['id','organizationId','type','status','firstName','lastName','email','phone','company','position','address','city','state','country','postalCode','source','notes','createdAt','updatedAt']);

export const CustomerInteractionScalarFieldEnumSchema = z.enum(['id','customerId','type','medium','subject','content','scheduledAt','completedAt','createdById','createdAt','updatedAt']);

export const DealScalarFieldEnumSchema = z.enum(['id','customerId','title','value','currency','status','stage','probability','expectedCloseDate','actualCloseDate','description','createdById','createdAt','updatedAt']);

export const ProjectScalarFieldEnumSchema = z.enum(['id','organizationId','name','description','startDate','endDate','status','budget','currency','createdById','customerId','createdAt','updatedAt']);

export const TaskScalarFieldEnumSchema = z.enum(['id','organizationId','projectId','parentTaskId','title','description','status','priority','startDate','dueDate','completedAt','assignedToId','createdById','estimatedHours','actualHours','order','createdAt','updatedAt','customerInteractionId']);

export const ProjectResourceScalarFieldEnumSchema = z.enum(['projectId','assigneeId','role','allocation','startDate','endDate','hourlyRate','currency','createdAt','updatedAt']);

export const TimeEntryScalarFieldEnumSchema = z.enum(['id','projectId','taskId','userId','description','startTime','endTime','duration','billable','invoiced','invoiceId','createdAt','updatedAt']);

export const InvoiceScalarFieldEnumSchema = z.enum(['id','organizationId','customerId','customerEmail','customerName','customerAddress','customerPhone','invoiceNumber','status','issueDate','dueDate','paymentTerms','poNumber','subtotal','taxAmount','discountAmount','shippingAmount','totalAmount','paidAmount','currency','notes','internalNotes','termsAndConditions','footer','logoUrl','sentAt','viewedAt','lastReminder','createdById','createdAt','updatedAt']);

export const InvoiceItemScalarFieldEnumSchema = z.enum(['id','invoiceId','productId','description','quantity','unitPrice','taxRate','discountRate','subtotal','sortOrder','createdAt','updatedAt']);

export const PaymentScalarFieldEnumSchema = z.enum(['id','invoiceId','amount','currency','method','reference','paymentDate','notes','feeAmount','status','gatewayId','refundedAmount','createdById','createdAt','updatedAt']);

export const ExpenseScalarFieldEnumSchema = z.enum(['id','organizationId','categoryId','customCategory','amount','currency','date','description','receipt','vendor','paymentMethod','projectId','status','reimbursable','reimbursed','reimbursedAt','submittedAt','createdById','approvedById','approvedAt','rejectedAt','rejectionReason','notes','createdAt','updatedAt']);

export const ExpenseCategoryScalarFieldEnumSchema = z.enum(['id','organizationId','name','description','color','isActive','createdAt','updatedAt']);

export const ExpenseTagScalarFieldEnumSchema = z.enum(['id','organizationId','name','color','createdAt']);

export const ExpenseToTagScalarFieldEnumSchema = z.enum(['expenseId','tagId']);

export const CommentScalarFieldEnumSchema = z.enum(['id','taskId','content','authorId','createdAt','updatedAt']);

export const AttachmentScalarFieldEnumSchema = z.enum(['id','taskId','name','fileUrl','fileType','fileSize','uploadedById','createdAt','updatedAt']);

export const CalendarEventScalarFieldEnumSchema = z.enum(['id','title','description','startTime','endTime','allDay','location','organizerId','createdAt','updatedAt']);

export const CalendarEventAttendeeScalarFieldEnumSchema = z.enum(['eventId','userId','status','createdAt','updatedAt']);

export const NotificationScalarFieldEnumSchema = z.enum(['id','userId','title','content','type','read','actionUrl','createdAt']);

export const InvitationScalarFieldEnumSchema = z.enum(['id','organizationId','email','role','inviterId','token','status','expiresAt','acceptedAt','createdAt','updatedAt']);

export const EmployeeScalarFieldEnumSchema = z.enum(['id','organizationId','firstName','lastName','email','phone','position','department','hireDate','terminationDate','status','managerId','address','city','state','country','postalCode','birthDate','taxId','emergencyContactName','emergencyContactPhone','createdAt','updatedAt']);

export const PayrollScalarFieldEnumSchema = z.enum(['id','employeeId','payPeriodStart','payPeriodEnd','payDate','basicSalary','overtime','bonus','tax','deductions','netAmount','currency','status','notes','createdById','createdAt','updatedAt']);

export const TimeOffScalarFieldEnumSchema = z.enum(['id','employeeId','type','startDate','endDate','duration','reason','status','approvedById','approvedAt','createdAt','updatedAt']);

export const PerformanceReviewScalarFieldEnumSchema = z.enum(['id','employeeId','reviewerId','reviewPeriod','performanceScore','strengths','improvements','goals','comments','reviewDate','status','createdAt','updatedAt']);

export const MarketingCampaignScalarFieldEnumSchema = z.enum(['id','organizationId','name','description','type','status','startDate','endDate','budget','currency','targetAudience','createdById','createdAt','updatedAt']);

export const EmailCampaignScalarFieldEnumSchema = z.enum(['id','campaignId','subject','content','sender','scheduledAt','sentAt','opens','clicks','bounces','createdAt','updatedAt']);

export const SocialMediaPostScalarFieldEnumSchema = z.enum(['id','campaignId','platform','content','mediaUrl','scheduledAt','publishedAt','likes','shares','comments','createdAt','updatedAt']);

export const UserScalarFieldEnumSchema = z.enum(['id','name','email','emailVerified','image','createdAt','updatedAt']);

export const SessionScalarFieldEnumSchema = z.enum(['id','expiresAt','token','createdAt','updatedAt','ipAddress','userAgent','userId']);

export const AccountScalarFieldEnumSchema = z.enum(['id','accountId','providerId','userId','accessToken','refreshToken','idToken','accessTokenExpiresAt','refreshTokenExpiresAt','scope','password','createdAt','updatedAt']);

export const VerificationScalarFieldEnumSchema = z.enum(['id','identifier','value','expiresAt','createdAt','updatedAt']);

export const FinancialReportScalarFieldEnumSchema = z.enum(['id','organizationId','name','description','type','template','filters','dateRange','status','generatedAt','generatedBy','isTemplate','isScheduled','scheduleConfig','createdById','createdAt','updatedAt']);

export const FinancialReportDataScalarFieldEnumSchema = z.enum(['id','reportId','data','metadata','createdAt']);

export const FinancialReportExportScalarFieldEnumSchema = z.enum(['id','reportId','format','fileName','fileUrl','fileSize','status','error','createdById','createdAt','updatedAt']);

export const FinancialReportScheduleScalarFieldEnumSchema = z.enum(['id','reportId','frequency','dayOfWeek','dayOfMonth','time','timezone','isActive','lastRunAt','nextRunAt','recipients','emailSubject','emailBody','createdById','createdAt','updatedAt']);

export const TemplatePackageScalarFieldEnumSchema = z.enum(['id','organizationId','name','description','category','version','visibility','status','iconUrl','tags','manifest','assetsCount','sizeBytes','createdById','createdAt','updatedAt']);

export const TemplateVersionScalarFieldEnumSchema = z.enum(['id','templatePackageId','version','manifest','changelog','isActive','createdById','createdAt']);

export const TemplateInstallationScalarFieldEnumSchema = z.enum(['id','organizationId','templatePackageId','templateVersionId','status','strategy','namePrefix','preflight','logs','error','createdById','createdAt','completedAt']);

export const TemplateInstallItemScalarFieldEnumSchema = z.enum(['id','installationId','assetType','sourceKey','createdModel','createdId','status','details','createdAt']);

export const WorkflowScalarFieldEnumSchema = z.enum(['id','organizationId','name','description','version','status','isTemplate','category','canvasData','retryConfig','timeoutConfig','totalExecutions','successfulExecutions','failedExecutions','lastExecutedAt','createdById','updatedById','publishedAt','publishedById','archivedAt','createdAt','updatedAt']);

export const PrebuiltWorkflowConfigScalarFieldEnumSchema = z.enum(['id','organizationId','workflowKey','enabled','emailSubject','emailBody','templateVersion','updatedByUserId','messageTemplateId','createdAt','updatedAt']);

export const PrebuiltWorkflowRunScalarFieldEnumSchema = z.enum(['id','organizationId','workflowKey','status','triggerModule','triggerEntity','triggerEvent','triggeredAt','startedAt','completedAt','durationMs','emailRecipient','emailSubject','context','result','error','createdAt','updatedAt']);

export const OrganizationUiConfigScalarFieldEnumSchema = z.enum(['id','organizationId','key','config','createdAt','updatedAt']);

export const WorkflowTriggerScalarFieldEnumSchema = z.enum(['id','workflowId','nodeId','name','description','type','module','entityType','eventType','conditions','delay','isActive','lastTriggered','triggerCount','createdAt','updatedAt']);

export const WorkflowNodeScalarFieldEnumSchema = z.enum(['id','workflowId','nodeId','type','name','description','position','config','template','executionOrder','isOptional','retryLimit','timeout','conditions','createdAt','updatedAt']);

export const WorkflowConnectionScalarFieldEnumSchema = z.enum(['id','workflowId','sourceNodeId','targetNodeId','executionOrder','label','conditions','edgeId','sourceHandle','targetHandle','style','animated','createdAt','updatedAt']);

export const NodeDependencyScalarFieldEnumSchema = z.enum(['id','dependentNodeId','prerequisiteNodeId','dependencyType','createdAt']);

export const ActionTemplateScalarFieldEnumSchema = z.enum(['id','organizationId','name','description','category','type','template','defaultConfig','schema','version','isPublic','isActive','usageCount','isLocked','requiredVariables','optionalVariables','createdById','createdAt','updatedAt']);

export const ActionTemplateVersionScalarFieldEnumSchema = z.enum(['id','templateId','version','template','changes','isActive','createdById','createdAt']);

export const VariableDefinitionScalarFieldEnumSchema = z.enum(['id','organizationId','name','displayName','description','category','dataType','defaultValue','validation','formatting','isRequired','isCustom','scope','moduleScope','createdById','createdAt','updatedAt']);

export const TriggerVariableScalarFieldEnumSchema = z.enum(['id','triggerId','variableId','mapping','isRequired','defaultValue','createdAt','updatedAt']);

export const WorkflowExecutionScalarFieldEnumSchema = z.enum(['id','workflowId','triggerId','executionId','status','priority','triggerData','triggerContext','currentNodeId','progress','startedAt','completedAt','failedAt','duration','result','error','errorDetails','retryCount','maxRetries','retryDelay','createdAt','updatedAt']);

export const NodeExecutionScalarFieldEnumSchema = z.enum(['id','workflowExecutionId','nodeId','executionOrder','status','startedAt','completedAt','duration','input','output','transformedData','error','errorDetails','retryCount','maxRetries','createdAt','updatedAt']);

export const ExecutionVariableScalarFieldEnumSchema = z.enum(['id','workflowExecutionId','variableDefinitionId','name','value','resolvedValue','dataType','source','nodeId','createdAt','updatedAt']);

export const ExecutionLogScalarFieldEnumSchema = z.enum(['id','workflowExecutionId','nodeId','level','message','details','timestamp','source','category','createdAt']);

export const IntegrationConfigScalarFieldEnumSchema = z.enum(['id','organizationId','name','type','config','credentials','endpoints','isActive','isHealthy','lastHealthCheck','healthDetails','requestCount','errorCount','lastUsedAt','createdById','createdAt','updatedAt']);

export const EmailActionScalarFieldEnumSchema = z.enum(['id','actionId','integrationId','fromName','fromEmail','replyTo','ccEmails','bccEmails','subject','htmlBody','textBody','templateId','attachments','trackOpens','trackClicks','variables','createdAt','updatedAt']);

export const SmsActionScalarFieldEnumSchema = z.enum(['id','actionId','integrationId','fromNumber','message','templateId','maxLength','unicode','variables','createdAt','updatedAt']);

export const WhatsAppActionScalarFieldEnumSchema = z.enum(['id','actionId','integrationId','businessAccountId','toNumbers','messageType','textMessage','templateName','templateLanguage','mediaUrl','mediaType','caption','templateParams','variables','createdAt','updatedAt']);

export const SlackActionScalarFieldEnumSchema = z.enum(['id','actionId','integrationId','workspaceId','channel','userId','message','blocks','attachments','asUser','username','iconEmoji','iconUrl','threadTs','replyBroadcast','variables','createdAt','updatedAt']);

export const CalendarActionScalarFieldEnumSchema = z.enum(['id','actionId','integrationId','calendarId','title','description','location','startTime','endTime','isAllDay','timezone','attendees','organizer','reminders','recurrence','variables','createdAt','updatedAt']);

export const WorkflowAnalyticsScalarFieldEnumSchema = z.enum(['id','workflowId','periodStart','periodEnd','granularity','totalExecutions','successfulExecutions','failedExecutions','averageDuration','minDuration','maxDuration','p95Duration','commonErrors','errorRate','avgCpuUsage','avgMemoryUsage','createdAt','updatedAt']);

export const TemplateShareScalarFieldEnumSchema = z.enum(['id','templatePackageId','organizationId','name','shareMode','tokenHash','expiresAt','maxUses','allowExternal','notes','status','usageCount','lastAccessedAt','revokedAt','revokedById','snapshotData','snapshotVersion','createdById','createdAt','updatedAt']);

export const TemplateShareRecipientScalarFieldEnumSchema = z.enum(['id','shareId','email','status','invitedAt','viewedAt','importedAt']);

export const TemplateShareAccessLogScalarFieldEnumSchema = z.enum(['id','shareId','action','status','recipientEmail','userAgent','ipAddress','errorMessage','metadata','createdAt']);

export const TemplateShareImportScalarFieldEnumSchema = z.enum(['id','shareId','organizationId','templatePackageId','importedById','importedAt','originalPackageId','originalOrgId','snapshotVersion']);

export const EarlyAccessCodeScalarFieldEnumSchema = z.enum(['id','email','code','isUsed','usedById','usedAt','createdAt','updatedAt']);

export const SortOrderSchema = z.enum(['asc','desc']);

export const NullableJsonNullValueInputSchema = z.enum(['DbNull','JsonNull',]).transform((value) => value === 'JsonNull' ? Prisma.JsonNull : value === 'DbNull' ? Prisma.DbNull : value);

export const JsonNullValueInputSchema = z.enum(['JsonNull',]).transform((value) => (value === 'JsonNull' ? Prisma.JsonNull : value));

export const QueryModeSchema = z.enum(['default','insensitive']);

export const NullsOrderSchema = z.enum(['first','last']);

export const JsonNullValueFilterSchema = z.enum(['DbNull','JsonNull','AnyNull',]).transform((value) => value === 'JsonNull' ? Prisma.JsonNull : value === 'DbNull' ? Prisma.JsonNull : value === 'AnyNull' ? Prisma.AnyNull : value);

export const ImportModuleSchema = z.enum(['CRM','HR','FINANCE','PROJECTS']);

export type ImportModuleType = `${z.infer<typeof ImportModuleSchema>}`

export const ImportEntityTypeSchema = z.enum(['CONTACT','ORGANIZATION','DEAL']);

export type ImportEntityTypeType = `${z.infer<typeof ImportEntityTypeSchema>}`

export const ImportStatusSchema = z.enum(['DRAFT','UPLOADING','DETECTING','MAPPING_REVIEW','VALIDATING','VALIDATION_FAILED','READY_TO_IMPORT','IMPORTING','COMPLETED','IMPORT_FAILED','CANCELLED','RETRY_QUEUED']);

export type ImportStatusType = `${z.infer<typeof ImportStatusSchema>}`

export const DedupeModeSchema = z.enum(['SKIP','UPDATE','CREATE']);

export type DedupeModeType = `${z.infer<typeof DedupeModeSchema>}`

export const RowStatusSchema = z.enum(['PENDING','VALIDATED','IMPORTED','FAILED','SKIPPED']);

export type RowStatusType = `${z.infer<typeof RowStatusSchema>}`

export const IssueSeveritySchema = z.enum(['ERROR','WARNING']);

export type IssueSeverityType = `${z.infer<typeof IssueSeveritySchema>}`

export const UserRoleSchema = z.enum(['ORGANIZATION_OWNER','SUPER_ADMIN','DEPARTMENT_MANAGER','HR_MANAGER','SALES_MANAGER','FINANCE_MANAGER','PROJECT_MANAGER','EMPLOYEE','CONTRACTOR','VIEWER']);

export type UserRoleType = `${z.infer<typeof UserRoleSchema>}`

export const CustomerTypeSchema = z.enum(['LEAD','PROSPECT','CUSTOMER','FORMER']);

export type CustomerTypeType = `${z.infer<typeof CustomerTypeSchema>}`

export const LeadStatusSchema = z.enum(['NEW','CONTACTED','QUALIFIED','PROPOSAL','NEGOTIATION','CLOSED_WON','CLOSED_LOST']);

export type LeadStatusType = `${z.infer<typeof LeadStatusSchema>}`

export const LeadSourceSchema = z.enum(['WEBSITE','REFERRAL','SOCIAL_MEDIA','EMAIL_CAMPAIGN','EVENT','COLD_CALL','OTHER']);

export type LeadSourceType = `${z.infer<typeof LeadSourceSchema>}`

export const InteractionTypeSchema = z.enum(['CALL','EMAIL','MEETING','NOTE','TASK']);

export type InteractionTypeType = `${z.infer<typeof InteractionTypeSchema>}`

export const InteractionMediumSchema = z.enum(['IN_PERSON','PHONE','VIDEO','EMAIL','CHAT','OTHER']);

export type InteractionMediumType = `${z.infer<typeof InteractionMediumSchema>}`

export const ProjectStatusSchema = z.enum(['PLANNED','IN_PROGRESS','ON_HOLD','COMPLETED','CANCELLED']);

export type ProjectStatusType = `${z.infer<typeof ProjectStatusSchema>}`

export const TaskStatusSchema = z.enum(['BACKLOG','TODO','IN_PROGRESS','REVIEW','DONE','ARCHIVED']);

export type TaskStatusType = `${z.infer<typeof TaskStatusSchema>}`

export const PrioritySchema = z.enum(['LOW','MEDIUM','HIGH','URGENT']);

export type PriorityType = `${z.infer<typeof PrioritySchema>}`

export const InvoiceStatusSchema = z.enum(['DRAFT','SENT','VIEWED','PAID','PARTIALLY_PAID','OVERDUE','CANCELLED']);

export type InvoiceStatusType = `${z.infer<typeof InvoiceStatusSchema>}`

export const PaymentMethodSchema = z.enum(['CREDIT_CARD','BANK_TRANSFER','CASH','CHECK','PAYPAL','STRIPE','OTHER']);

export type PaymentMethodType = `${z.infer<typeof PaymentMethodSchema>}`

export const PaymentStatusSchema = z.enum(['PENDING','COMPLETED','FAILED','REFUNDED','PARTIALLY_REFUNDED','CANCELLED']);

export type PaymentStatusType = `${z.infer<typeof PaymentStatusSchema>}`

export const ExpenseStatusSchema = z.enum(['DRAFT','SUBMITTED','APPROVED','REJECTED','PAID','REIMBURSED']);

export type ExpenseStatusType = `${z.infer<typeof ExpenseStatusSchema>}`

export const AttendeeStatusSchema = z.enum(['PENDING','ACCEPTED','DECLINED','TENTATIVE']);

export type AttendeeStatusType = `${z.infer<typeof AttendeeStatusSchema>}`

export const NotificationTypeSchema = z.enum(['TASK','COMMENT','MENTION','REMINDER','SYSTEM']);

export type NotificationTypeType = `${z.infer<typeof NotificationTypeSchema>}`

export const InvitationStatusSchema = z.enum(['PENDING','ACCEPTED','EXPIRED','REVOKED']);

export type InvitationStatusType = `${z.infer<typeof InvitationStatusSchema>}`

export const EmployeeStatusSchema = z.enum(['ACTIVE','ON_LEAVE','TERMINATED','PROBATION']);

export type EmployeeStatusType = `${z.infer<typeof EmployeeStatusSchema>}`

export const PayrollStatusSchema = z.enum(['DRAFT','APPROVED','PAID','CANCELLED']);

export type PayrollStatusType = `${z.infer<typeof PayrollStatusSchema>}`

export const TimeOffTypeSchema = z.enum(['VACATION','SICK','PERSONAL','BEREAVEMENT','MATERNITY','PATERNITY','UNPAID']);

export type TimeOffTypeType = `${z.infer<typeof TimeOffTypeSchema>}`

export const TimeOffStatusSchema = z.enum(['PENDING','APPROVED','DENIED','CANCELLED']);

export type TimeOffStatusType = `${z.infer<typeof TimeOffStatusSchema>}`

export const ReviewStatusSchema = z.enum(['DRAFT','SUBMITTED','ACKNOWLEDGED','COMPLETED']);

export type ReviewStatusType = `${z.infer<typeof ReviewStatusSchema>}`

export const CampaignTypeSchema = z.enum(['EMAIL','SOCIAL_MEDIA','PPC','CONTENT','EVENT','OTHER']);

export type CampaignTypeType = `${z.infer<typeof CampaignTypeSchema>}`

export const CampaignStatusSchema = z.enum(['DRAFT','SCHEDULED','ACTIVE','PAUSED','COMPLETED','CANCELLED']);

export type CampaignStatusType = `${z.infer<typeof CampaignStatusSchema>}`

export const SocialPlatformSchema = z.enum(['FACEBOOK','TWITTER','LINKEDIN','INSTAGRAM','YOUTUBE','TIKTOK','PINTEREST']);

export type SocialPlatformType = `${z.infer<typeof SocialPlatformSchema>}`

export const FinancialReportTypeSchema = z.enum(['INCOME_STATEMENT','BALANCE_SHEET','CASH_FLOW','EXPENSE_REPORT','PROFIT_LOSS','CUSTOM']);

export type FinancialReportTypeType = `${z.infer<typeof FinancialReportTypeSchema>}`

export const FinancialReportStatusSchema = z.enum(['DRAFT','GENERATING','COMPLETED','FAILED','ARCHIVED']);

export type FinancialReportStatusType = `${z.infer<typeof FinancialReportStatusSchema>}`

export const FinancialReportExportFormatSchema = z.enum(['PDF','EXCEL','CSV','JSON']);

export type FinancialReportExportFormatType = `${z.infer<typeof FinancialReportExportFormatSchema>}`

export const FinancialReportExportStatusSchema = z.enum(['PENDING','PROCESSING','COMPLETED','FAILED']);

export type FinancialReportExportStatusType = `${z.infer<typeof FinancialReportExportStatusSchema>}`

export const FinancialReportScheduleFrequencySchema = z.enum(['DAILY','WEEKLY','MONTHLY','QUARTERLY','YEARLY']);

export type FinancialReportScheduleFrequencyType = `${z.infer<typeof FinancialReportScheduleFrequencySchema>}`

export const TemplateVisibilitySchema = z.enum(['PRIVATE','UNLISTED','PUBLIC']);

export type TemplateVisibilityType = `${z.infer<typeof TemplateVisibilitySchema>}`

export const TemplateStatusSchema = z.enum(['DRAFT','PUBLISHED','ARCHIVED']);

export type TemplateStatusType = `${z.infer<typeof TemplateStatusSchema>}`

export const TemplateInstallStatusSchema = z.enum(['PENDING','RUNNING','COMPLETED','FAILED']);

export type TemplateInstallStatusType = `${z.infer<typeof TemplateInstallStatusSchema>}`

export const TemplateInstallStrategySchema = z.enum(['MERGE','OVERWRITE','PREFIX']);

export type TemplateInstallStrategyType = `${z.infer<typeof TemplateInstallStrategySchema>}`

export const TemplateAssetTypeSchema = z.enum(['WORKFLOW','REPORT','UILAYOUT','ROLE','VARIABLE','ACTION_TEMPLATE','DATA_SEED','PROJECT','INVOICE']);

export type TemplateAssetTypeType = `${z.infer<typeof TemplateAssetTypeSchema>}`

export const TemplateItemStatusSchema = z.enum(['CREATED','SKIPPED','UPDATED','FAILED']);

export type TemplateItemStatusType = `${z.infer<typeof TemplateItemStatusSchema>}`

export const WorkflowStatusSchema = z.enum(['DRAFT','INACTIVE','ACTIVE','PAUSED','ARCHIVED','ERROR']);

export type WorkflowStatusType = `${z.infer<typeof WorkflowStatusSchema>}`

export const WorkflowTriggerTypeSchema = z.enum(['CONTACT_CREATED','CONTACT_UPDATED','DEAL_CREATED','DEAL_STATUS_CHANGED','EMPLOYEE_CREATED','EMPLOYEE_UPDATED','EMPLOYEE_STATUS_CHANGED','TIME_OFF_REQUESTED','INVOICE_CREATED','INVOICE_STATUS_CHANGED','EXPENSE_CREATED','PAYMENT_STATUS_CHANGED','PROJECT_CREATED','PROJECT_UPDATED','TASK_CREATED','TASK_STATUS_CHANGED','RECORD_CREATED','RECORD_UPDATED','RECORD_DELETED','STATUS_CHANGED','FORM_SUBMITTED']);

export type WorkflowTriggerTypeType = `${z.infer<typeof WorkflowTriggerTypeSchema>}`

export const WorkflowNodeTypeSchema = z.enum(['TRIGGER','ACTION','CONDITION','DELAY','PARALLEL','LOOP','SWITCH','APPROVAL','EMAIL','SMS','WHATSAPP','SLACK','CALENDAR','DATA_TRANSFORM','NOTIFICATION','CUSTOM']);

export type WorkflowNodeTypeType = `${z.infer<typeof WorkflowNodeTypeSchema>}`

export const DependencyTypeSchema = z.enum(['SUCCESS','FAILURE','COMPLETION']);

export type DependencyTypeType = `${z.infer<typeof DependencyTypeSchema>}`

export const ActionTemplateCategorySchema = z.enum(['COMMUNICATION','NOTIFICATION','DATA_PROCESSING','INTEGRATION','APPROVAL','REPORTING','AUTOMATION','CUSTOM']);

export type ActionTemplateCategoryType = `${z.infer<typeof ActionTemplateCategorySchema>}`

export const VariableDataTypeSchema = z.enum(['STRING','NUMBER','BOOLEAN','DATE','DATETIME','EMAIL','PHONE','URL','JSON','ARRAY']);

export type VariableDataTypeType = `${z.infer<typeof VariableDataTypeSchema>}`

export const VariableScopeSchema = z.enum(['GLOBAL','ORGANIZATION','MODULE','WORKFLOW','TRIGGER']);

export type VariableScopeType = `${z.infer<typeof VariableScopeSchema>}`

export const WorkflowExecutionStatusSchema = z.enum(['PENDING','RUNNING','PAUSED','COMPLETED','FAILED','CANCELLED','TIMEOUT']);

export type WorkflowExecutionStatusType = `${z.infer<typeof WorkflowExecutionStatusSchema>}`

export const ExecutionPrioritySchema = z.enum(['LOW','NORMAL','HIGH','URGENT']);

export type ExecutionPriorityType = `${z.infer<typeof ExecutionPrioritySchema>}`

export const NodeExecutionStatusSchema = z.enum(['PENDING','RUNNING','COMPLETED','FAILED','SKIPPED','CANCELLED','TIMEOUT']);

export type NodeExecutionStatusType = `${z.infer<typeof NodeExecutionStatusSchema>}`

export const LogLevelSchema = z.enum(['DEBUG','INFO','WARN','ERROR','FATAL']);

export type LogLevelType = `${z.infer<typeof LogLevelSchema>}`

export const WhatsAppMessageTypeSchema = z.enum(['TEXT','TEMPLATE','IMAGE','VIDEO','AUDIO','DOCUMENT','LOCATION','CONTACT']);

export type WhatsAppMessageTypeType = `${z.infer<typeof WhatsAppMessageTypeSchema>}`

export const IntegrationTypeSchema = z.enum(['EMAIL_SMTP','EMAIL_SENDGRID','EMAIL_MAILGUN','EMAIL_RESEND','EMAIL_POSTMARK','SMS_TWILIO','SMS_AWS_SNS','SMS_NEXMO','SMS_MESSAGEBIRD','WHATSAPP_BUSINESS','WHATSAPP_TWILIO','SLACK','GOOGLE_CALENDAR','OUTLOOK_CALENDAR','APPLE_CALENDAR']);

export type IntegrationTypeType = `${z.infer<typeof IntegrationTypeSchema>}`

export const TemplateShareModeSchema = z.enum(['LINK','EMAIL','MIXED']);

export type TemplateShareModeType = `${z.infer<typeof TemplateShareModeSchema>}`

export const TemplateShareStatusSchema = z.enum(['ACTIVE','EXPIRED','REVOKED','EXHAUSTED']);

export type TemplateShareStatusType = `${z.infer<typeof TemplateShareStatusSchema>}`

export const TemplateShareRecipientStatusSchema = z.enum(['PENDING','VIEWED','IMPORTED','DECLINED']);

export type TemplateShareRecipientStatusType = `${z.infer<typeof TemplateShareRecipientStatusSchema>}`

export const TemplateShareAccessActionSchema = z.enum(['PREVIEW','IMPORT','DOWNLOAD']);

export type TemplateShareAccessActionType = `${z.infer<typeof TemplateShareAccessActionSchema>}`

export const TemplateShareAccessStatusSchema = z.enum(['SUCCESS','BLOCKED','EXPIRED','REVOKED','EXHAUSTED','INVALID','ERROR']);

export type TemplateShareAccessStatusType = `${z.infer<typeof TemplateShareAccessStatusSchema>}`

/////////////////////////////////////////
// MODELS
/////////////////////////////////////////

/////////////////////////////////////////
// PERMISSION SCHEMA
/////////////////////////////////////////

export const PermissionSchema = z.object({
  id: z.string().cuid(),
  name: z.string(),
  description: z.string().nullable(),
  module: z.string(),
  action: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Permission = z.infer<typeof PermissionSchema>

/////////////////////////////////////////
// ROLE PERMISSION SCHEMA
/////////////////////////////////////////

export const RolePermissionSchema = z.object({
  role: UserRoleSchema,
  id: z.string().cuid(),
  permissionId: z.string(),
  createdAt: z.coerce.date(),
})

export type RolePermission = z.infer<typeof RolePermissionSchema>

/////////////////////////////////////////
// CUSTOM ROLE SCHEMA
/////////////////////////////////////////

export const CustomRoleSchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  color: z.string(),
  isActive: z.boolean(),
  createdById: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type CustomRole = z.infer<typeof CustomRoleSchema>

/////////////////////////////////////////
// CUSTOM ROLE PERMISSION SCHEMA
/////////////////////////////////////////

export const CustomRolePermissionSchema = z.object({
  id: z.string().cuid(),
  customRoleId: z.string(),
  permissionId: z.string(),
  createdAt: z.coerce.date(),
})

export type CustomRolePermission = z.infer<typeof CustomRolePermissionSchema>

/////////////////////////////////////////
// ORGANIZATION SCHEMA
/////////////////////////////////////////

export const OrganizationSchema = z.object({
  id: z.string().cuid(),
  name: z.string(),
  logo: z.string().nullable(),
  website: z.string().nullable(),
  industry: z.string().nullable(),
  description: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Organization = z.infer<typeof OrganizationSchema>

/////////////////////////////////////////
// IMPORT SESSION SCHEMA
/////////////////////////////////////////

export const ImportSessionSchema = z.object({
  module: ImportModuleSchema,
  entityType: ImportEntityTypeSchema,
  status: ImportStatusSchema,
  dedupeMode: DedupeModeSchema,
  id: z.string().cuid(),
  organizationId: z.string(),
  createdByUserId: z.string(),
  fileName: z.string(),
  fileSize: z.number().int(),
  fileType: z.string().nullable(),
  mappingConfig: JsonValueSchema.nullable(),
  summary: JsonValueSchema.nullable(),
  rowCount: z.number().int().nullable(),
  processedCount: z.number().int(),
  successCount: z.number().int(),
  failureCount: z.number().int(),
  skippedCount: z.number().int(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  startedAt: z.coerce.date().nullable(),
  completedAt: z.coerce.date().nullable(),
  appliedTemplateId: z.string().nullable(),
})

export type ImportSession = z.infer<typeof ImportSessionSchema>

/////////////////////////////////////////
// IMPORT TEMPLATE SCHEMA
/////////////////////////////////////////

export const ImportTemplateSchema = z.object({
  module: ImportModuleSchema,
  entityType: ImportEntityTypeSchema,
  id: z.string().cuid(),
  organizationId: z.string(),
  createdByUserId: z.string(),
  name: z.string(),
  mappingConfig: JsonValueSchema,
  columnSignature: JsonValueSchema,
  usageCount: z.number().int(),
  lastUsedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type ImportTemplate = z.infer<typeof ImportTemplateSchema>

/////////////////////////////////////////
// IMPORT ROW SCHEMA
/////////////////////////////////////////

export const ImportRowSchema = z.object({
  status: RowStatusSchema,
  id: z.string().cuid(),
  sessionId: z.string(),
  rowNumber: z.number().int(),
  rawData: JsonValueSchema,
  mappedData: JsonValueSchema.nullable(),
  dedupeHint: z.string().nullable(),
  score: z.number().int().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type ImportRow = z.infer<typeof ImportRowSchema>

/////////////////////////////////////////
// IMPORT ROW ISSUE SCHEMA
/////////////////////////////////////////

export const ImportRowIssueSchema = z.object({
  severity: IssueSeveritySchema,
  id: z.string().cuid(),
  sessionId: z.string(),
  rowId: z.string(),
  field: z.string().nullable(),
  message: z.string(),
  hint: z.string().nullable(),
  value: z.string().nullable(),
  createdAt: z.coerce.date(),
})

export type ImportRowIssue = z.infer<typeof ImportRowIssueSchema>

/////////////////////////////////////////
// USER ORGANIZATION SCHEMA
/////////////////////////////////////////

export const UserOrganizationSchema = z.object({
  role: UserRoleSchema.nullable(),
  userId: z.string(),
  organizationId: z.string(),
  customRoleId: z.string().nullable(),
  joinedAt: z.coerce.date(),
})

export type UserOrganization = z.infer<typeof UserOrganizationSchema>

/////////////////////////////////////////
// CUSTOMER SCHEMA
/////////////////////////////////////////

export const CustomerSchema = z.object({
  type: CustomerTypeSchema,
  status: LeadStatusSchema.nullable(),
  source: LeadSourceSchema.nullable(),
  id: z.string().cuid(),
  organizationId: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  company: z.string().nullable(),
  position: z.string().nullable(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  country: z.string().nullable(),
  postalCode: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Customer = z.infer<typeof CustomerSchema>

/////////////////////////////////////////
// CUSTOMER INTERACTION SCHEMA
/////////////////////////////////////////

export const CustomerInteractionSchema = z.object({
  type: InteractionTypeSchema,
  medium: InteractionMediumSchema,
  id: z.string().cuid(),
  customerId: z.string(),
  subject: z.string().nullable(),
  content: z.string().nullable(),
  scheduledAt: z.coerce.date().nullable(),
  completedAt: z.coerce.date().nullable(),
  createdById: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type CustomerInteraction = z.infer<typeof CustomerInteractionSchema>

/////////////////////////////////////////
// DEAL SCHEMA
/////////////////////////////////////////

export const DealSchema = z.object({
  status: LeadStatusSchema,
  id: z.string().cuid(),
  customerId: z.string(),
  title: z.string(),
  value: z.instanceof(Prisma.Decimal, { message: "Field 'value' must be a Decimal. Location: ['Models', 'Deal']"}),
  currency: z.string(),
  stage: z.number().int(),
  probability: z.number().nullable(),
  expectedCloseDate: z.coerce.date().nullable(),
  actualCloseDate: z.coerce.date().nullable(),
  description: z.string().nullable(),
  createdById: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Deal = z.infer<typeof DealSchema>

/////////////////////////////////////////
// PROJECT SCHEMA
/////////////////////////////////////////

export const ProjectSchema = z.object({
  status: ProjectStatusSchema,
  id: z.string().cuid(),
  organizationId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  startDate: z.coerce.date().nullable(),
  endDate: z.coerce.date().nullable(),
  budget: z.instanceof(Prisma.Decimal, { message: "Field 'budget' must be a Decimal. Location: ['Models', 'Project']"}).nullable(),
  currency: z.string(),
  createdById: z.string().nullable(),
  customerId: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Project = z.infer<typeof ProjectSchema>

/////////////////////////////////////////
// TASK SCHEMA
/////////////////////////////////////////

export const TaskSchema = z.object({
  status: TaskStatusSchema,
  priority: PrioritySchema,
  id: z.string().cuid(),
  organizationId: z.string(),
  projectId: z.string().nullable(),
  parentTaskId: z.string().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  startDate: z.coerce.date().nullable(),
  dueDate: z.coerce.date().nullable(),
  completedAt: z.coerce.date().nullable(),
  assignedToId: z.string().nullable(),
  createdById: z.string().nullable(),
  estimatedHours: z.number().nullable(),
  actualHours: z.number().nullable(),
  order: z.number().int(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  customerInteractionId: z.string().nullable(),
})

export type Task = z.infer<typeof TaskSchema>

/////////////////////////////////////////
// PROJECT RESOURCE SCHEMA
/////////////////////////////////////////

export const ProjectResourceSchema = z.object({
  projectId: z.string(),
  assigneeId: z.string(),
  role: z.string().nullable(),
  allocation: z.number().nullable(),
  startDate: z.coerce.date().nullable(),
  endDate: z.coerce.date().nullable(),
  hourlyRate: z.instanceof(Prisma.Decimal, { message: "Field 'hourlyRate' must be a Decimal. Location: ['Models', 'ProjectResource']"}).nullable(),
  currency: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type ProjectResource = z.infer<typeof ProjectResourceSchema>

/////////////////////////////////////////
// TIME ENTRY SCHEMA
/////////////////////////////////////////

export const TimeEntrySchema = z.object({
  id: z.string().cuid(),
  projectId: z.string().nullable(),
  taskId: z.string().nullable(),
  userId: z.string(),
  description: z.string().nullable(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date().nullable(),
  duration: z.number().int().nullable(),
  billable: z.boolean(),
  invoiced: z.boolean(),
  invoiceId: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type TimeEntry = z.infer<typeof TimeEntrySchema>

/////////////////////////////////////////
// INVOICE SCHEMA
/////////////////////////////////////////

export const InvoiceSchema = z.object({
  status: InvoiceStatusSchema,
  id: z.string().cuid(),
  organizationId: z.string(),
  customerId: z.string(),
  customerEmail: z.string(),
  customerName: z.string().nullable(),
  customerAddress: z.string().nullable(),
  customerPhone: z.string().nullable(),
  invoiceNumber: z.string(),
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  paymentTerms: z.string(),
  poNumber: z.string().nullable(),
  subtotal: z.instanceof(Prisma.Decimal, { message: "Field 'subtotal' must be a Decimal. Location: ['Models', 'Invoice']"}),
  taxAmount: z.instanceof(Prisma.Decimal, { message: "Field 'taxAmount' must be a Decimal. Location: ['Models', 'Invoice']"}),
  discountAmount: z.instanceof(Prisma.Decimal, { message: "Field 'discountAmount' must be a Decimal. Location: ['Models', 'Invoice']"}),
  shippingAmount: z.instanceof(Prisma.Decimal, { message: "Field 'shippingAmount' must be a Decimal. Location: ['Models', 'Invoice']"}),
  totalAmount: z.instanceof(Prisma.Decimal, { message: "Field 'totalAmount' must be a Decimal. Location: ['Models', 'Invoice']"}),
  paidAmount: z.instanceof(Prisma.Decimal, { message: "Field 'paidAmount' must be a Decimal. Location: ['Models', 'Invoice']"}),
  currency: z.string(),
  notes: z.string().nullable(),
  internalNotes: z.string().nullable(),
  termsAndConditions: z.string().nullable(),
  footer: z.string().nullable(),
  logoUrl: z.string().nullable(),
  sentAt: z.coerce.date().nullable(),
  viewedAt: z.coerce.date().nullable(),
  lastReminder: z.coerce.date().nullable(),
  createdById: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Invoice = z.infer<typeof InvoiceSchema>

/////////////////////////////////////////
// INVOICE ITEM SCHEMA
/////////////////////////////////////////

export const InvoiceItemSchema = z.object({
  id: z.string().cuid(),
  invoiceId: z.string(),
  productId: z.string().nullable(),
  description: z.string(),
  quantity: z.instanceof(Prisma.Decimal, { message: "Field 'quantity' must be a Decimal. Location: ['Models', 'InvoiceItem']"}),
  unitPrice: z.instanceof(Prisma.Decimal, { message: "Field 'unitPrice' must be a Decimal. Location: ['Models', 'InvoiceItem']"}),
  taxRate: z.instanceof(Prisma.Decimal, { message: "Field 'taxRate' must be a Decimal. Location: ['Models', 'InvoiceItem']"}),
  discountRate: z.instanceof(Prisma.Decimal, { message: "Field 'discountRate' must be a Decimal. Location: ['Models', 'InvoiceItem']"}),
  subtotal: z.instanceof(Prisma.Decimal, { message: "Field 'subtotal' must be a Decimal. Location: ['Models', 'InvoiceItem']"}),
  sortOrder: z.number().int(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type InvoiceItem = z.infer<typeof InvoiceItemSchema>

/////////////////////////////////////////
// PAYMENT SCHEMA
/////////////////////////////////////////

export const PaymentSchema = z.object({
  method: PaymentMethodSchema,
  status: PaymentStatusSchema,
  id: z.string().cuid(),
  invoiceId: z.string(),
  amount: z.instanceof(Prisma.Decimal, { message: "Field 'amount' must be a Decimal. Location: ['Models', 'Payment']"}),
  currency: z.string(),
  reference: z.string().nullable(),
  paymentDate: z.coerce.date(),
  notes: z.string().nullable(),
  feeAmount: z.instanceof(Prisma.Decimal, { message: "Field 'feeAmount' must be a Decimal. Location: ['Models', 'Payment']"}),
  gatewayId: z.string().nullable(),
  refundedAmount: z.instanceof(Prisma.Decimal, { message: "Field 'refundedAmount' must be a Decimal. Location: ['Models', 'Payment']"}),
  createdById: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Payment = z.infer<typeof PaymentSchema>

/////////////////////////////////////////
// EXPENSE SCHEMA
/////////////////////////////////////////

export const ExpenseSchema = z.object({
  paymentMethod: PaymentMethodSchema,
  status: ExpenseStatusSchema,
  id: z.string().cuid(),
  organizationId: z.string(),
  categoryId: z.string().nullable(),
  customCategory: z.string().nullable(),
  amount: z.instanceof(Prisma.Decimal, { message: "Field 'amount' must be a Decimal. Location: ['Models', 'Expense']"}),
  currency: z.string(),
  date: z.coerce.date(),
  description: z.string().nullable(),
  receipt: z.string().nullable(),
  vendor: z.string().nullable(),
  projectId: z.string().nullable(),
  reimbursable: z.boolean(),
  reimbursed: z.boolean(),
  reimbursedAt: z.coerce.date().nullable(),
  submittedAt: z.coerce.date().nullable(),
  createdById: z.string().nullable(),
  approvedById: z.string().nullable(),
  approvedAt: z.coerce.date().nullable(),
  rejectedAt: z.coerce.date().nullable(),
  rejectionReason: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Expense = z.infer<typeof ExpenseSchema>

/////////////////////////////////////////
// EXPENSE CATEGORY SCHEMA
/////////////////////////////////////////

export const ExpenseCategorySchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  color: z.string(),
  isActive: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type ExpenseCategory = z.infer<typeof ExpenseCategorySchema>

/////////////////////////////////////////
// EXPENSE TAG SCHEMA
/////////////////////////////////////////

export const ExpenseTagSchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string(),
  name: z.string(),
  color: z.string(),
  createdAt: z.coerce.date(),
})

export type ExpenseTag = z.infer<typeof ExpenseTagSchema>

/////////////////////////////////////////
// EXPENSE TO TAG SCHEMA
/////////////////////////////////////////

export const ExpenseToTagSchema = z.object({
  expenseId: z.string(),
  tagId: z.string(),
})

export type ExpenseToTag = z.infer<typeof ExpenseToTagSchema>

/////////////////////////////////////////
// COMMENT SCHEMA
/////////////////////////////////////////

export const CommentSchema = z.object({
  id: z.string().cuid(),
  taskId: z.string(),
  content: z.string(),
  authorId: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Comment = z.infer<typeof CommentSchema>

/////////////////////////////////////////
// ATTACHMENT SCHEMA
/////////////////////////////////////////

export const AttachmentSchema = z.object({
  id: z.string().cuid(),
  taskId: z.string(),
  name: z.string(),
  fileUrl: z.string(),
  fileType: z.string(),
  fileSize: z.number().int(),
  uploadedById: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Attachment = z.infer<typeof AttachmentSchema>

/////////////////////////////////////////
// CALENDAR EVENT SCHEMA
/////////////////////////////////////////

export const CalendarEventSchema = z.object({
  id: z.string().cuid(),
  title: z.string(),
  description: z.string().nullable(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  allDay: z.boolean(),
  location: z.string().nullable(),
  organizerId: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type CalendarEvent = z.infer<typeof CalendarEventSchema>

/////////////////////////////////////////
// CALENDAR EVENT ATTENDEE SCHEMA
/////////////////////////////////////////

export const CalendarEventAttendeeSchema = z.object({
  status: AttendeeStatusSchema,
  eventId: z.string(),
  userId: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type CalendarEventAttendee = z.infer<typeof CalendarEventAttendeeSchema>

/////////////////////////////////////////
// NOTIFICATION SCHEMA
/////////////////////////////////////////

export const NotificationSchema = z.object({
  type: NotificationTypeSchema,
  id: z.string().cuid(),
  userId: z.string(),
  title: z.string(),
  content: z.string(),
  read: z.boolean(),
  actionUrl: z.string().nullable(),
  createdAt: z.coerce.date(),
})

export type Notification = z.infer<typeof NotificationSchema>

/////////////////////////////////////////
// INVITATION SCHEMA
/////////////////////////////////////////

export const InvitationSchema = z.object({
  role: UserRoleSchema,
  status: InvitationStatusSchema,
  id: z.string().cuid(),
  organizationId: z.string(),
  email: z.string(),
  inviterId: z.string(),
  token: z.string(),
  expiresAt: z.coerce.date(),
  acceptedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Invitation = z.infer<typeof InvitationSchema>

/////////////////////////////////////////
// EMPLOYEE SCHEMA
/////////////////////////////////////////

export const EmployeeSchema = z.object({
  status: EmployeeStatusSchema,
  id: z.string().cuid(),
  organizationId: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  position: z.string().nullable(),
  department: z.string().nullable(),
  hireDate: z.coerce.date().nullable(),
  terminationDate: z.coerce.date().nullable(),
  managerId: z.string().nullable(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  country: z.string().nullable(),
  postalCode: z.string().nullable(),
  birthDate: z.coerce.date().nullable(),
  taxId: z.string().nullable(),
  emergencyContactName: z.string().nullable(),
  emergencyContactPhone: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Employee = z.infer<typeof EmployeeSchema>

/////////////////////////////////////////
// PAYROLL SCHEMA
/////////////////////////////////////////

export const PayrollSchema = z.object({
  status: PayrollStatusSchema,
  id: z.string().cuid(),
  employeeId: z.string(),
  payPeriodStart: z.coerce.date(),
  payPeriodEnd: z.coerce.date(),
  payDate: z.coerce.date(),
  basicSalary: z.instanceof(Prisma.Decimal, { message: "Field 'basicSalary' must be a Decimal. Location: ['Models', 'Payroll']"}),
  overtime: z.instanceof(Prisma.Decimal, { message: "Field 'overtime' must be a Decimal. Location: ['Models', 'Payroll']"}),
  bonus: z.instanceof(Prisma.Decimal, { message: "Field 'bonus' must be a Decimal. Location: ['Models', 'Payroll']"}),
  tax: z.instanceof(Prisma.Decimal, { message: "Field 'tax' must be a Decimal. Location: ['Models', 'Payroll']"}),
  deductions: z.instanceof(Prisma.Decimal, { message: "Field 'deductions' must be a Decimal. Location: ['Models', 'Payroll']"}),
  netAmount: z.instanceof(Prisma.Decimal, { message: "Field 'netAmount' must be a Decimal. Location: ['Models', 'Payroll']"}),
  currency: z.string(),
  notes: z.string().nullable(),
  createdById: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Payroll = z.infer<typeof PayrollSchema>

/////////////////////////////////////////
// TIME OFF SCHEMA
/////////////////////////////////////////

export const TimeOffSchema = z.object({
  type: TimeOffTypeSchema,
  status: TimeOffStatusSchema,
  id: z.string().cuid(),
  employeeId: z.string(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  duration: z.number(),
  reason: z.string().nullable(),
  approvedById: z.string().nullable(),
  approvedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type TimeOff = z.infer<typeof TimeOffSchema>

/////////////////////////////////////////
// PERFORMANCE REVIEW SCHEMA
/////////////////////////////////////////

export const PerformanceReviewSchema = z.object({
  status: ReviewStatusSchema,
  id: z.string().cuid(),
  employeeId: z.string(),
  reviewerId: z.string(),
  reviewPeriod: z.string(),
  performanceScore: z.number().nullable(),
  strengths: z.string().nullable(),
  improvements: z.string().nullable(),
  goals: z.string().nullable(),
  comments: z.string().nullable(),
  reviewDate: z.coerce.date(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type PerformanceReview = z.infer<typeof PerformanceReviewSchema>

/////////////////////////////////////////
// MARKETING CAMPAIGN SCHEMA
/////////////////////////////////////////

export const MarketingCampaignSchema = z.object({
  type: CampaignTypeSchema,
  status: CampaignStatusSchema,
  id: z.string().cuid(),
  organizationId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  startDate: z.coerce.date().nullable(),
  endDate: z.coerce.date().nullable(),
  budget: z.instanceof(Prisma.Decimal, { message: "Field 'budget' must be a Decimal. Location: ['Models', 'MarketingCampaign']"}).nullable(),
  currency: z.string(),
  targetAudience: z.string().nullable(),
  createdById: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type MarketingCampaign = z.infer<typeof MarketingCampaignSchema>

/////////////////////////////////////////
// EMAIL CAMPAIGN SCHEMA
/////////////////////////////////////////

export const EmailCampaignSchema = z.object({
  id: z.string().cuid(),
  campaignId: z.string(),
  subject: z.string(),
  content: z.string(),
  sender: z.string(),
  scheduledAt: z.coerce.date().nullable(),
  sentAt: z.coerce.date().nullable(),
  opens: z.number().int(),
  clicks: z.number().int(),
  bounces: z.number().int(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type EmailCampaign = z.infer<typeof EmailCampaignSchema>

/////////////////////////////////////////
// SOCIAL MEDIA POST SCHEMA
/////////////////////////////////////////

export const SocialMediaPostSchema = z.object({
  platform: SocialPlatformSchema,
  id: z.string().cuid(),
  campaignId: z.string(),
  content: z.string(),
  mediaUrl: z.string().nullable(),
  scheduledAt: z.coerce.date().nullable(),
  publishedAt: z.coerce.date().nullable(),
  likes: z.number().int(),
  shares: z.number().int(),
  comments: z.number().int(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type SocialMediaPost = z.infer<typeof SocialMediaPostSchema>

/////////////////////////////////////////
// USER SCHEMA
/////////////////////////////////////////

export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  emailVerified: z.boolean(),
  image: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type User = z.infer<typeof UserSchema>

/////////////////////////////////////////
// SESSION SCHEMA
/////////////////////////////////////////

export const SessionSchema = z.object({
  id: z.string(),
  expiresAt: z.coerce.date(),
  token: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  userId: z.string(),
})

export type Session = z.infer<typeof SessionSchema>

/////////////////////////////////////////
// ACCOUNT SCHEMA
/////////////////////////////////////////

export const AccountSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  providerId: z.string(),
  userId: z.string(),
  accessToken: z.string().nullable(),
  refreshToken: z.string().nullable(),
  idToken: z.string().nullable(),
  accessTokenExpiresAt: z.coerce.date().nullable(),
  refreshTokenExpiresAt: z.coerce.date().nullable(),
  scope: z.string().nullable(),
  password: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Account = z.infer<typeof AccountSchema>

/////////////////////////////////////////
// VERIFICATION SCHEMA
/////////////////////////////////////////

export const VerificationSchema = z.object({
  id: z.string(),
  identifier: z.string(),
  value: z.string(),
  expiresAt: z.coerce.date(),
  createdAt: z.coerce.date().nullable(),
  updatedAt: z.coerce.date().nullable(),
})

export type Verification = z.infer<typeof VerificationSchema>

/////////////////////////////////////////
// FINANCIAL REPORT SCHEMA
/////////////////////////////////////////

export const FinancialReportSchema = z.object({
  type: FinancialReportTypeSchema,
  status: FinancialReportStatusSchema,
  id: z.string().cuid(),
  organizationId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  template: JsonValueSchema,
  filters: JsonValueSchema.nullable(),
  dateRange: JsonValueSchema,
  generatedAt: z.coerce.date().nullable(),
  generatedBy: z.string().nullable(),
  isTemplate: z.boolean(),
  isScheduled: z.boolean(),
  scheduleConfig: JsonValueSchema.nullable(),
  createdById: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type FinancialReport = z.infer<typeof FinancialReportSchema>

/////////////////////////////////////////
// FINANCIAL REPORT DATA SCHEMA
/////////////////////////////////////////

export const FinancialReportDataSchema = z.object({
  id: z.string().cuid(),
  reportId: z.string(),
  data: JsonValueSchema,
  metadata: JsonValueSchema.nullable(),
  createdAt: z.coerce.date(),
})

export type FinancialReportData = z.infer<typeof FinancialReportDataSchema>

/////////////////////////////////////////
// FINANCIAL REPORT EXPORT SCHEMA
/////////////////////////////////////////

export const FinancialReportExportSchema = z.object({
  format: FinancialReportExportFormatSchema,
  status: FinancialReportExportStatusSchema,
  id: z.string().cuid(),
  reportId: z.string(),
  fileName: z.string(),
  fileUrl: z.string().nullable(),
  fileSize: z.number().int().nullable(),
  error: z.string().nullable(),
  createdById: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type FinancialReportExport = z.infer<typeof FinancialReportExportSchema>

/////////////////////////////////////////
// FINANCIAL REPORT SCHEDULE SCHEMA
/////////////////////////////////////////

export const FinancialReportScheduleSchema = z.object({
  frequency: FinancialReportScheduleFrequencySchema,
  id: z.string().cuid(),
  reportId: z.string(),
  dayOfWeek: z.number().int().nullable(),
  dayOfMonth: z.number().int().nullable(),
  time: z.string(),
  timezone: z.string(),
  isActive: z.boolean(),
  lastRunAt: z.coerce.date().nullable(),
  nextRunAt: z.coerce.date(),
  recipients: JsonValueSchema,
  emailSubject: z.string().nullable(),
  emailBody: z.string().nullable(),
  createdById: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type FinancialReportSchedule = z.infer<typeof FinancialReportScheduleSchema>

/////////////////////////////////////////
// TEMPLATE PACKAGE SCHEMA
/////////////////////////////////////////

export const TemplatePackageSchema = z.object({
  visibility: TemplateVisibilitySchema,
  status: TemplateStatusSchema,
  id: z.string().cuid(),
  organizationId: z.string().nullable(),
  name: z.string(),
  description: z.string().nullable(),
  category: z.string().nullable(),
  version: z.string(),
  iconUrl: z.string().nullable(),
  tags: JsonValueSchema.nullable(),
  manifest: JsonValueSchema,
  assetsCount: z.number().int(),
  sizeBytes: z.number().int().nullable(),
  createdById: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type TemplatePackage = z.infer<typeof TemplatePackageSchema>

/////////////////////////////////////////
// TEMPLATE VERSION SCHEMA
/////////////////////////////////////////

export const TemplateVersionSchema = z.object({
  id: z.string().cuid(),
  templatePackageId: z.string(),
  version: z.string(),
  manifest: JsonValueSchema,
  changelog: z.string().nullable(),
  isActive: z.boolean(),
  createdById: z.string(),
  createdAt: z.coerce.date(),
})

export type TemplateVersion = z.infer<typeof TemplateVersionSchema>

/////////////////////////////////////////
// TEMPLATE INSTALLATION SCHEMA
/////////////////////////////////////////

export const TemplateInstallationSchema = z.object({
  status: TemplateInstallStatusSchema,
  strategy: TemplateInstallStrategySchema,
  id: z.string().cuid(),
  organizationId: z.string(),
  templatePackageId: z.string().nullable(),
  templateVersionId: z.string().nullable(),
  namePrefix: z.string().nullable(),
  preflight: JsonValueSchema.nullable(),
  logs: JsonValueSchema.nullable(),
  error: z.string().nullable(),
  createdById: z.string(),
  createdAt: z.coerce.date(),
  completedAt: z.coerce.date().nullable(),
})

export type TemplateInstallation = z.infer<typeof TemplateInstallationSchema>

/////////////////////////////////////////
// TEMPLATE INSTALL ITEM SCHEMA
/////////////////////////////////////////

export const TemplateInstallItemSchema = z.object({
  assetType: TemplateAssetTypeSchema,
  status: TemplateItemStatusSchema,
  id: z.string().cuid(),
  installationId: z.string(),
  sourceKey: z.string(),
  createdModel: z.string().nullable(),
  createdId: z.string().nullable(),
  details: JsonValueSchema.nullable(),
  createdAt: z.coerce.date(),
})

export type TemplateInstallItem = z.infer<typeof TemplateInstallItemSchema>

/////////////////////////////////////////
// WORKFLOW SCHEMA
/////////////////////////////////////////

export const WorkflowSchema = z.object({
  status: WorkflowStatusSchema,
  id: z.string().cuid(),
  organizationId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  version: z.number().int(),
  isTemplate: z.boolean(),
  category: z.string().nullable(),
  canvasData: JsonValueSchema.nullable(),
  retryConfig: JsonValueSchema.nullable(),
  timeoutConfig: JsonValueSchema.nullable(),
  totalExecutions: z.number().int(),
  successfulExecutions: z.number().int(),
  failedExecutions: z.number().int(),
  lastExecutedAt: z.coerce.date().nullable(),
  createdById: z.string(),
  updatedById: z.string().nullable(),
  publishedAt: z.coerce.date().nullable(),
  publishedById: z.string().nullable(),
  archivedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Workflow = z.infer<typeof WorkflowSchema>

/////////////////////////////////////////
// PREBUILT WORKFLOW CONFIG SCHEMA
/////////////////////////////////////////

export const PrebuiltWorkflowConfigSchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string(),
  workflowKey: z.string(),
  enabled: z.boolean(),
  emailSubject: z.string(),
  emailBody: z.string(),
  templateVersion: z.number().int(),
  updatedByUserId: z.string(),
  messageTemplateId: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type PrebuiltWorkflowConfig = z.infer<typeof PrebuiltWorkflowConfigSchema>

/////////////////////////////////////////
// PREBUILT WORKFLOW RUN SCHEMA
/////////////////////////////////////////

export const PrebuiltWorkflowRunSchema = z.object({
  status: WorkflowExecutionStatusSchema,
  id: z.string().cuid(),
  organizationId: z.string(),
  workflowKey: z.string(),
  triggerModule: z.string(),
  triggerEntity: z.string(),
  triggerEvent: z.string(),
  triggeredAt: z.coerce.date(),
  startedAt: z.coerce.date(),
  completedAt: z.coerce.date().nullable(),
  durationMs: z.number().int().nullable(),
  emailRecipient: z.string().nullable(),
  emailSubject: z.string().nullable(),
  context: JsonValueSchema.nullable(),
  result: JsonValueSchema.nullable(),
  error: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type PrebuiltWorkflowRun = z.infer<typeof PrebuiltWorkflowRunSchema>

/////////////////////////////////////////
// ORGANIZATION UI CONFIG SCHEMA
/////////////////////////////////////////

export const OrganizationUiConfigSchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string(),
  key: z.string(),
  config: JsonValueSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type OrganizationUiConfig = z.infer<typeof OrganizationUiConfigSchema>

/////////////////////////////////////////
// WORKFLOW TRIGGER SCHEMA
/////////////////////////////////////////

export const WorkflowTriggerSchema = z.object({
  type: WorkflowTriggerTypeSchema,
  id: z.string().cuid(),
  workflowId: z.string(),
  nodeId: z.string().nullable(),
  name: z.string(),
  description: z.string().nullable(),
  module: z.string(),
  entityType: z.string().nullable(),
  eventType: z.string(),
  conditions: JsonValueSchema.nullable(),
  delay: z.number().int().nullable(),
  isActive: z.boolean(),
  lastTriggered: z.coerce.date().nullable(),
  triggerCount: z.number().int(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type WorkflowTrigger = z.infer<typeof WorkflowTriggerSchema>

/////////////////////////////////////////
// WORKFLOW NODE SCHEMA
/////////////////////////////////////////

export const WorkflowNodeSchema = z.object({
  type: WorkflowNodeTypeSchema,
  id: z.string().cuid(),
  workflowId: z.string(),
  nodeId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  position: JsonValueSchema,
  config: JsonValueSchema.nullable(),
  template: JsonValueSchema.nullable(),
  executionOrder: z.number().int().nullable(),
  isOptional: z.boolean(),
  retryLimit: z.number().int(),
  timeout: z.number().int().nullable(),
  conditions: JsonValueSchema.nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type WorkflowNode = z.infer<typeof WorkflowNodeSchema>

/////////////////////////////////////////
// WORKFLOW CONNECTION SCHEMA
/////////////////////////////////////////

export const WorkflowConnectionSchema = z.object({
  id: z.string().cuid(),
  workflowId: z.string(),
  sourceNodeId: z.string(),
  targetNodeId: z.string(),
  executionOrder: z.number().int(),
  label: z.string().nullable(),
  conditions: JsonValueSchema.nullable(),
  edgeId: z.string().nullable(),
  sourceHandle: z.string().nullable(),
  targetHandle: z.string().nullable(),
  style: JsonValueSchema.nullable(),
  animated: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type WorkflowConnection = z.infer<typeof WorkflowConnectionSchema>

/////////////////////////////////////////
// NODE DEPENDENCY SCHEMA
/////////////////////////////////////////

export const NodeDependencySchema = z.object({
  dependencyType: DependencyTypeSchema,
  id: z.string().cuid(),
  dependentNodeId: z.string(),
  prerequisiteNodeId: z.string(),
  createdAt: z.coerce.date(),
})

export type NodeDependency = z.infer<typeof NodeDependencySchema>

/////////////////////////////////////////
// ACTION TEMPLATE SCHEMA
/////////////////////////////////////////

export const ActionTemplateSchema = z.object({
  category: ActionTemplateCategorySchema,
  type: WorkflowNodeTypeSchema,
  id: z.string().cuid(),
  organizationId: z.string().nullable(),
  name: z.string(),
  description: z.string().nullable(),
  template: JsonValueSchema,
  defaultConfig: JsonValueSchema.nullable(),
  schema: JsonValueSchema.nullable(),
  version: z.string(),
  isPublic: z.boolean(),
  isActive: z.boolean(),
  usageCount: z.number().int(),
  isLocked: z.boolean(),
  requiredVariables: JsonValueSchema.nullable(),
  optionalVariables: JsonValueSchema.nullable(),
  createdById: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type ActionTemplate = z.infer<typeof ActionTemplateSchema>

/////////////////////////////////////////
// ACTION TEMPLATE VERSION SCHEMA
/////////////////////////////////////////

export const ActionTemplateVersionSchema = z.object({
  id: z.string().cuid(),
  templateId: z.string(),
  version: z.string(),
  template: JsonValueSchema,
  changes: z.string().nullable(),
  isActive: z.boolean(),
  createdById: z.string().nullable(),
  createdAt: z.coerce.date(),
})

export type ActionTemplateVersion = z.infer<typeof ActionTemplateVersionSchema>

/////////////////////////////////////////
// VARIABLE DEFINITION SCHEMA
/////////////////////////////////////////

export const VariableDefinitionSchema = z.object({
  dataType: VariableDataTypeSchema,
  scope: VariableScopeSchema,
  id: z.string().cuid(),
  organizationId: z.string().nullable(),
  name: z.string(),
  displayName: z.string(),
  description: z.string().nullable(),
  category: z.string(),
  defaultValue: z.string().nullable(),
  validation: JsonValueSchema.nullable(),
  formatting: JsonValueSchema.nullable(),
  isRequired: z.boolean(),
  isCustom: z.boolean(),
  moduleScope: z.string().nullable(),
  createdById: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type VariableDefinition = z.infer<typeof VariableDefinitionSchema>

/////////////////////////////////////////
// TRIGGER VARIABLE SCHEMA
/////////////////////////////////////////

export const TriggerVariableSchema = z.object({
  id: z.string().cuid(),
  triggerId: z.string(),
  variableId: z.string(),
  mapping: JsonValueSchema.nullable(),
  isRequired: z.boolean(),
  defaultValue: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type TriggerVariable = z.infer<typeof TriggerVariableSchema>

/////////////////////////////////////////
// WORKFLOW EXECUTION SCHEMA
/////////////////////////////////////////

export const WorkflowExecutionSchema = z.object({
  status: WorkflowExecutionStatusSchema,
  priority: ExecutionPrioritySchema,
  id: z.string().cuid(),
  workflowId: z.string(),
  triggerId: z.string().nullable(),
  executionId: z.string(),
  triggerData: JsonValueSchema.nullable(),
  triggerContext: JsonValueSchema.nullable(),
  currentNodeId: z.string().nullable(),
  progress: z.number(),
  startedAt: z.coerce.date().nullable(),
  completedAt: z.coerce.date().nullable(),
  failedAt: z.coerce.date().nullable(),
  duration: z.number().int().nullable(),
  result: JsonValueSchema.nullable(),
  error: z.string().nullable(),
  errorDetails: JsonValueSchema.nullable(),
  retryCount: z.number().int(),
  maxRetries: z.number().int(),
  retryDelay: z.number().int(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type WorkflowExecution = z.infer<typeof WorkflowExecutionSchema>

/////////////////////////////////////////
// NODE EXECUTION SCHEMA
/////////////////////////////////////////

export const NodeExecutionSchema = z.object({
  status: NodeExecutionStatusSchema,
  id: z.string().cuid(),
  workflowExecutionId: z.string(),
  nodeId: z.string(),
  executionOrder: z.number().int(),
  startedAt: z.coerce.date().nullable(),
  completedAt: z.coerce.date().nullable(),
  duration: z.number().int().nullable(),
  input: JsonValueSchema.nullable(),
  output: JsonValueSchema.nullable(),
  transformedData: JsonValueSchema.nullable(),
  error: z.string().nullable(),
  errorDetails: JsonValueSchema.nullable(),
  retryCount: z.number().int(),
  maxRetries: z.number().int(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type NodeExecution = z.infer<typeof NodeExecutionSchema>

/////////////////////////////////////////
// EXECUTION VARIABLE SCHEMA
/////////////////////////////////////////

export const ExecutionVariableSchema = z.object({
  dataType: VariableDataTypeSchema,
  id: z.string().cuid(),
  workflowExecutionId: z.string(),
  variableDefinitionId: z.string().nullable(),
  name: z.string(),
  value: z.string().nullable(),
  resolvedValue: z.string().nullable(),
  source: z.string().nullable(),
  nodeId: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type ExecutionVariable = z.infer<typeof ExecutionVariableSchema>

/////////////////////////////////////////
// EXECUTION LOG SCHEMA
/////////////////////////////////////////

export const ExecutionLogSchema = z.object({
  level: LogLevelSchema,
  id: z.string().cuid(),
  workflowExecutionId: z.string(),
  nodeId: z.string().nullable(),
  message: z.string(),
  details: JsonValueSchema.nullable(),
  timestamp: z.coerce.date(),
  source: z.string().nullable(),
  category: z.string().nullable(),
  createdAt: z.coerce.date(),
})

export type ExecutionLog = z.infer<typeof ExecutionLogSchema>

/////////////////////////////////////////
// INTEGRATION CONFIG SCHEMA
/////////////////////////////////////////

export const IntegrationConfigSchema = z.object({
  type: IntegrationTypeSchema,
  id: z.string().cuid(),
  organizationId: z.string(),
  name: z.string(),
  config: JsonValueSchema,
  credentials: JsonValueSchema.nullable(),
  endpoints: JsonValueSchema.nullable(),
  isActive: z.boolean(),
  isHealthy: z.boolean(),
  lastHealthCheck: z.coerce.date().nullable(),
  healthDetails: JsonValueSchema.nullable(),
  requestCount: z.number().int(),
  errorCount: z.number().int(),
  lastUsedAt: z.coerce.date().nullable(),
  createdById: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type IntegrationConfig = z.infer<typeof IntegrationConfigSchema>

/////////////////////////////////////////
// EMAIL ACTION SCHEMA
/////////////////////////////////////////

export const EmailActionSchema = z.object({
  id: z.string().cuid(),
  actionId: z.string(),
  integrationId: z.string().nullable(),
  fromName: z.string().nullable(),
  fromEmail: z.string().nullable(),
  replyTo: z.string().nullable(),
  ccEmails: JsonValueSchema.nullable(),
  bccEmails: JsonValueSchema.nullable(),
  subject: z.string(),
  htmlBody: z.string().nullable(),
  textBody: z.string().nullable(),
  templateId: z.string().nullable(),
  attachments: JsonValueSchema.nullable(),
  trackOpens: z.boolean(),
  trackClicks: z.boolean(),
  variables: JsonValueSchema.nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type EmailAction = z.infer<typeof EmailActionSchema>

/////////////////////////////////////////
// SMS ACTION SCHEMA
/////////////////////////////////////////

export const SmsActionSchema = z.object({
  id: z.string().cuid(),
  actionId: z.string(),
  integrationId: z.string().nullable(),
  fromNumber: z.string().nullable(),
  message: z.string(),
  templateId: z.string().nullable(),
  maxLength: z.number().int().nullable(),
  unicode: z.boolean(),
  variables: JsonValueSchema.nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type SmsAction = z.infer<typeof SmsActionSchema>

/////////////////////////////////////////
// WHATS APP ACTION SCHEMA
/////////////////////////////////////////

export const WhatsAppActionSchema = z.object({
  messageType: WhatsAppMessageTypeSchema,
  id: z.string().cuid(),
  actionId: z.string(),
  integrationId: z.string().nullable(),
  businessAccountId: z.string().nullable(),
  toNumbers: JsonValueSchema,
  textMessage: z.string().nullable(),
  templateName: z.string().nullable(),
  templateLanguage: z.string().nullable(),
  mediaUrl: z.string().nullable(),
  mediaType: z.string().nullable(),
  caption: z.string().nullable(),
  templateParams: JsonValueSchema.nullable(),
  variables: JsonValueSchema.nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type WhatsAppAction = z.infer<typeof WhatsAppActionSchema>

/////////////////////////////////////////
// SLACK ACTION SCHEMA
/////////////////////////////////////////

export const SlackActionSchema = z.object({
  id: z.string().cuid(),
  actionId: z.string(),
  integrationId: z.string().nullable(),
  workspaceId: z.string().nullable(),
  channel: z.string().nullable(),
  userId: z.string().nullable(),
  message: z.string(),
  blocks: JsonValueSchema.nullable(),
  attachments: JsonValueSchema.nullable(),
  asUser: z.boolean(),
  username: z.string().nullable(),
  iconEmoji: z.string().nullable(),
  iconUrl: z.string().nullable(),
  threadTs: z.string().nullable(),
  replyBroadcast: z.boolean(),
  variables: JsonValueSchema.nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type SlackAction = z.infer<typeof SlackActionSchema>

/////////////////////////////////////////
// CALENDAR ACTION SCHEMA
/////////////////////////////////////////

export const CalendarActionSchema = z.object({
  id: z.string().cuid(),
  actionId: z.string(),
  integrationId: z.string().nullable(),
  calendarId: z.string().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  location: z.string().nullable(),
  startTime: z.string(),
  endTime: z.string(),
  isAllDay: z.boolean(),
  timezone: z.string(),
  attendees: JsonValueSchema.nullable(),
  organizer: z.string().nullable(),
  reminders: JsonValueSchema.nullable(),
  recurrence: JsonValueSchema.nullable(),
  variables: JsonValueSchema.nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type CalendarAction = z.infer<typeof CalendarActionSchema>

/////////////////////////////////////////
// WORKFLOW ANALYTICS SCHEMA
/////////////////////////////////////////

export const WorkflowAnalyticsSchema = z.object({
  id: z.string().cuid(),
  workflowId: z.string(),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  granularity: z.string(),
  totalExecutions: z.number().int(),
  successfulExecutions: z.number().int(),
  failedExecutions: z.number().int(),
  averageDuration: z.number().nullable(),
  minDuration: z.number().int().nullable(),
  maxDuration: z.number().int().nullable(),
  p95Duration: z.number().int().nullable(),
  commonErrors: JsonValueSchema.nullable(),
  errorRate: z.number().nullable(),
  avgCpuUsage: z.number().nullable(),
  avgMemoryUsage: z.number().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type WorkflowAnalytics = z.infer<typeof WorkflowAnalyticsSchema>

/////////////////////////////////////////
// TEMPLATE SHARE SCHEMA
/////////////////////////////////////////

export const TemplateShareSchema = z.object({
  shareMode: TemplateShareModeSchema,
  status: TemplateShareStatusSchema,
  id: z.string().cuid(),
  templatePackageId: z.string(),
  organizationId: z.string(),
  name: z.string().nullable(),
  tokenHash: z.string().nullable(),
  expiresAt: z.coerce.date().nullable(),
  maxUses: z.number().int().nullable(),
  allowExternal: z.boolean(),
  notes: z.string().nullable(),
  usageCount: z.number().int(),
  lastAccessedAt: z.coerce.date().nullable(),
  revokedAt: z.coerce.date().nullable(),
  revokedById: z.string().nullable(),
  snapshotData: JsonValueSchema,
  snapshotVersion: z.string(),
  createdById: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type TemplateShare = z.infer<typeof TemplateShareSchema>

/////////////////////////////////////////
// TEMPLATE SHARE RECIPIENT SCHEMA
/////////////////////////////////////////

export const TemplateShareRecipientSchema = z.object({
  status: TemplateShareRecipientStatusSchema,
  id: z.string().cuid(),
  shareId: z.string(),
  email: z.string(),
  invitedAt: z.coerce.date(),
  viewedAt: z.coerce.date().nullable(),
  importedAt: z.coerce.date().nullable(),
})

export type TemplateShareRecipient = z.infer<typeof TemplateShareRecipientSchema>

/////////////////////////////////////////
// TEMPLATE SHARE ACCESS LOG SCHEMA
/////////////////////////////////////////

export const TemplateShareAccessLogSchema = z.object({
  action: TemplateShareAccessActionSchema,
  status: TemplateShareAccessStatusSchema,
  id: z.string().cuid(),
  shareId: z.string(),
  recipientEmail: z.string().nullable(),
  userAgent: z.string().nullable(),
  ipAddress: z.string().nullable(),
  errorMessage: z.string().nullable(),
  metadata: JsonValueSchema.nullable(),
  createdAt: z.coerce.date(),
})

export type TemplateShareAccessLog = z.infer<typeof TemplateShareAccessLogSchema>

/////////////////////////////////////////
// TEMPLATE SHARE IMPORT SCHEMA
/////////////////////////////////////////

export const TemplateShareImportSchema = z.object({
  id: z.string().cuid(),
  shareId: z.string(),
  organizationId: z.string(),
  templatePackageId: z.string(),
  importedById: z.string(),
  importedAt: z.coerce.date(),
  originalPackageId: z.string(),
  originalOrgId: z.string(),
  snapshotVersion: z.string(),
})

export type TemplateShareImport = z.infer<typeof TemplateShareImportSchema>

/////////////////////////////////////////
// EARLY ACCESS CODE SCHEMA
/////////////////////////////////////////

export const EarlyAccessCodeSchema = z.object({
  id: z.string().cuid(),
  email: z.string(),
  code: z.string(),
  isUsed: z.boolean(),
  usedById: z.string().nullable(),
  usedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type EarlyAccessCode = z.infer<typeof EarlyAccessCodeSchema>
