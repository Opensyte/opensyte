-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');

-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('LEAD', 'PROSPECT', 'CUSTOMER', 'FORMER');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('WEBSITE', 'REFERRAL', 'SOCIAL_MEDIA', 'EMAIL_CAMPAIGN', 'EVENT', 'COLD_CALL', 'OTHER');

-- CreateEnum
CREATE TYPE "InteractionType" AS ENUM ('CALL', 'EMAIL', 'MEETING', 'NOTE', 'TASK');

-- CreateEnum
CREATE TYPE "InteractionMedium" AS ENUM ('IN_PERSON', 'PHONE', 'VIDEO', 'EMAIL', 'CHAT', 'OTHER');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('BACKLOG', 'TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'VIEWED', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CREDIT_CARD', 'BANK_TRANSFER', 'CASH', 'CHECK', 'PAYPAL', 'OTHER');

-- CreateEnum
CREATE TYPE "AttendeeStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'TENTATIVE');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('TASK', 'COMMENT', 'MENTION', 'REMINDER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'ON_LEAVE', 'TERMINATED', 'PROBATION');

-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('DRAFT', 'APPROVED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TimeOffType" AS ENUM ('VACATION', 'SICK', 'PERSONAL', 'BEREAVEMENT', 'MATERNITY', 'PATERNITY', 'UNPAID');

-- CreateEnum
CREATE TYPE "TimeOffStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'ACKNOWLEDGED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "CampaignType" AS ENUM ('EMAIL', 'SOCIAL_MEDIA', 'PPC', 'CONTENT', 'EVENT', 'OTHER');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('FACEBOOK', 'TWITTER', 'LINKEDIN', 'INSTAGRAM', 'YOUTUBE', 'TIKTOK', 'PINTEREST');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logo" TEXT,
    "website" TEXT,
    "industry" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserOrganization" (
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserOrganization_pkey" PRIMARY KEY ("userId","organizationId")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "CustomerType" NOT NULL,
    "status" "LeadStatus",
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "company" TEXT,
    "position" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "postalCode" TEXT,
    "source" "LeadSource",
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerInteraction" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "type" "InteractionType" NOT NULL,
    "medium" "InteractionMedium" NOT NULL,
    "subject" TEXT,
    "content" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "value" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "LeadStatus" NOT NULL,
    "stage" INTEGER NOT NULL,
    "probability" DOUBLE PRECISION,
    "expectedCloseDate" TIMESTAMP(3),
    "actualCloseDate" TIMESTAMP(3),
    "description" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" "ProjectStatus" NOT NULL,
    "budget" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT,
    "parentTaskId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL,
    "priority" "Priority" NOT NULL,
    "startDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "assignedToId" TEXT,
    "createdById" TEXT,
    "estimatedHours" DOUBLE PRECISION,
    "actualHours" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "customerInteractionId" TEXT,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectResource" (
    "projectId" TEXT NOT NULL,
    "assigneeId" TEXT NOT NULL,
    "role" TEXT,
    "allocation" DOUBLE PRECISION,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "hourlyRate" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectResource_pkey" PRIMARY KEY ("projectId","assigneeId")
);

-- CreateTable
CREATE TABLE "TimeEntry" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "taskId" TEXT,
    "userId" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "duration" INTEGER,
    "billable" BOOLEAN NOT NULL DEFAULT true,
    "invoiced" BOOLEAN NOT NULL DEFAULT false,
    "invoiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT,
    "invoiceNumber" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "taxAmount" DECIMAL(10,2) NOT NULL,
    "discountAmount" DECIMAL(10,2) NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "paidAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "notes" TEXT,
    "termsAndConditions" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "method" "PaymentMethod" NOT NULL,
    "reference" TEXT,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "receipt" TEXT,
    "vendor" TEXT,
    "reimbursable" BOOLEAN NOT NULL DEFAULT false,
    "reimbursed" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "location" TEXT,
    "organizerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarEventAttendee" (
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "AttendeeStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalendarEventAttendee_pkey" PRIMARY KEY ("eventId","userId")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "actionUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "position" TEXT,
    "department" TEXT,
    "hireDate" TIMESTAMP(3),
    "terminationDate" TIMESTAMP(3),
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "managerId" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "postalCode" TEXT,
    "birthDate" TIMESTAMP(3),
    "taxId" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payroll" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "payPeriodStart" TIMESTAMP(3) NOT NULL,
    "payPeriodEnd" TIMESTAMP(3) NOT NULL,
    "payDate" TIMESTAMP(3) NOT NULL,
    "basicSalary" DECIMAL(10,2) NOT NULL,
    "overtime" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "bonus" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "tax" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "deductions" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "netAmount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "PayrollStatus" NOT NULL,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payroll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeOff" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" "TimeOffType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "duration" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "status" "TimeOffStatus" NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimeOff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceReview" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "reviewPeriod" TEXT NOT NULL,
    "performanceScore" DOUBLE PRECISION,
    "strengths" TEXT,
    "improvements" TEXT,
    "goals" TEXT,
    "comments" TEXT,
    "reviewDate" TIMESTAMP(3) NOT NULL,
    "status" "ReviewStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PerformanceReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingCampaign" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "CampaignType" NOT NULL,
    "status" "CampaignStatus" NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "budget" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "targetAudience" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketingCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailCampaign" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "opens" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "bounces" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialMediaPost" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "content" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "likes" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialMediaPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserOrganization_userId_idx" ON "UserOrganization"("userId");

-- CreateIndex
CREATE INDEX "UserOrganization_organizationId_idx" ON "UserOrganization"("organizationId");

-- CreateIndex
CREATE INDEX "Customer_organizationId_idx" ON "Customer"("organizationId");

-- CreateIndex
CREATE INDEX "Customer_email_idx" ON "Customer"("email");

-- CreateIndex
CREATE INDEX "Customer_status_idx" ON "Customer"("status");

-- CreateIndex
CREATE INDEX "CustomerInteraction_customerId_idx" ON "CustomerInteraction"("customerId");

-- CreateIndex
CREATE INDEX "CustomerInteraction_createdById_idx" ON "CustomerInteraction"("createdById");

-- CreateIndex
CREATE INDEX "Deal_customerId_idx" ON "Deal"("customerId");

-- CreateIndex
CREATE INDEX "Deal_status_idx" ON "Deal"("status");

-- CreateIndex
CREATE INDEX "Deal_createdById_idx" ON "Deal"("createdById");

-- CreateIndex
CREATE INDEX "Project_organizationId_idx" ON "Project"("organizationId");

-- CreateIndex
CREATE INDEX "Project_createdById_idx" ON "Project"("createdById");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE INDEX "Task_organizationId_idx" ON "Task"("organizationId");

-- CreateIndex
CREATE INDEX "Task_projectId_idx" ON "Task"("projectId");

-- CreateIndex
CREATE INDEX "Task_parentTaskId_idx" ON "Task"("parentTaskId");

-- CreateIndex
CREATE INDEX "Task_assignedToId_idx" ON "Task"("assignedToId");

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "Task"("status");

-- CreateIndex
CREATE INDEX "ProjectResource_projectId_idx" ON "ProjectResource"("projectId");

-- CreateIndex
CREATE INDEX "ProjectResource_assigneeId_idx" ON "ProjectResource"("assigneeId");

-- CreateIndex
CREATE INDEX "TimeEntry_projectId_idx" ON "TimeEntry"("projectId");

-- CreateIndex
CREATE INDEX "TimeEntry_taskId_idx" ON "TimeEntry"("taskId");

-- CreateIndex
CREATE INDEX "TimeEntry_userId_idx" ON "TimeEntry"("userId");

-- CreateIndex
CREATE INDEX "TimeEntry_invoiceId_idx" ON "TimeEntry"("invoiceId");

-- CreateIndex
CREATE INDEX "Invoice_organizationId_idx" ON "Invoice"("organizationId");

-- CreateIndex
CREATE INDEX "Invoice_customerId_idx" ON "Invoice"("customerId");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_organizationId_invoiceNumber_key" ON "Invoice"("organizationId", "invoiceNumber");

-- CreateIndex
CREATE INDEX "InvoiceItem_invoiceId_idx" ON "InvoiceItem"("invoiceId");

-- CreateIndex
CREATE INDEX "Payment_invoiceId_idx" ON "Payment"("invoiceId");

-- CreateIndex
CREATE INDEX "Expense_organizationId_idx" ON "Expense"("organizationId");

-- CreateIndex
CREATE INDEX "Expense_createdById_idx" ON "Expense"("createdById");

-- CreateIndex
CREATE INDEX "Expense_category_idx" ON "Expense"("category");

-- CreateIndex
CREATE INDEX "Comment_taskId_idx" ON "Comment"("taskId");

-- CreateIndex
CREATE INDEX "Comment_authorId_idx" ON "Comment"("authorId");

-- CreateIndex
CREATE INDEX "Attachment_taskId_idx" ON "Attachment"("taskId");

-- CreateIndex
CREATE INDEX "Attachment_uploadedById_idx" ON "Attachment"("uploadedById");

-- CreateIndex
CREATE INDEX "CalendarEvent_organizerId_idx" ON "CalendarEvent"("organizerId");

-- CreateIndex
CREATE INDEX "CalendarEventAttendee_eventId_idx" ON "CalendarEventAttendee"("eventId");

-- CreateIndex
CREATE INDEX "CalendarEventAttendee_userId_idx" ON "CalendarEventAttendee"("userId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_read_idx" ON "Notification"("read");

-- CreateIndex
CREATE INDEX "Employee_organizationId_idx" ON "Employee"("organizationId");

-- CreateIndex
CREATE INDEX "Employee_email_idx" ON "Employee"("email");

-- CreateIndex
CREATE INDEX "Employee_managerId_idx" ON "Employee"("managerId");

-- CreateIndex
CREATE INDEX "Employee_status_idx" ON "Employee"("status");

-- CreateIndex
CREATE INDEX "Payroll_employeeId_idx" ON "Payroll"("employeeId");

-- CreateIndex
CREATE INDEX "Payroll_status_idx" ON "Payroll"("status");

-- CreateIndex
CREATE INDEX "TimeOff_employeeId_idx" ON "TimeOff"("employeeId");

-- CreateIndex
CREATE INDEX "TimeOff_status_idx" ON "TimeOff"("status");

-- CreateIndex
CREATE INDEX "PerformanceReview_employeeId_idx" ON "PerformanceReview"("employeeId");

-- CreateIndex
CREATE INDEX "PerformanceReview_reviewerId_idx" ON "PerformanceReview"("reviewerId");

-- CreateIndex
CREATE INDEX "PerformanceReview_status_idx" ON "PerformanceReview"("status");

-- CreateIndex
CREATE INDEX "MarketingCampaign_organizationId_idx" ON "MarketingCampaign"("organizationId");

-- CreateIndex
CREATE INDEX "MarketingCampaign_status_idx" ON "MarketingCampaign"("status");

-- CreateIndex
CREATE INDEX "MarketingCampaign_type_idx" ON "MarketingCampaign"("type");

-- CreateIndex
CREATE INDEX "EmailCampaign_campaignId_idx" ON "EmailCampaign"("campaignId");

-- CreateIndex
CREATE INDEX "SocialMediaPost_campaignId_idx" ON "SocialMediaPost"("campaignId");

-- CreateIndex
CREATE INDEX "SocialMediaPost_platform_idx" ON "SocialMediaPost"("platform");

-- AddForeignKey
ALTER TABLE "UserOrganization" ADD CONSTRAINT "UserOrganization_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerInteraction" ADD CONSTRAINT "CustomerInteraction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_parentTaskId_fkey" FOREIGN KEY ("parentTaskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_customerInteractionId_fkey" FOREIGN KEY ("customerInteractionId") REFERENCES "CustomerInteraction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectResource" ADD CONSTRAINT "ProjectResource_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEventAttendee" ADD CONSTRAINT "CalendarEventAttendee_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CalendarEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payroll" ADD CONSTRAINT "Payroll_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeOff" ADD CONSTRAINT "TimeOff_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceReview" ADD CONSTRAINT "PerformanceReview_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingCampaign" ADD CONSTRAINT "MarketingCampaign_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailCampaign" ADD CONSTRAINT "EmailCampaign_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "MarketingCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialMediaPost" ADD CONSTRAINT "SocialMediaPost_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "MarketingCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
