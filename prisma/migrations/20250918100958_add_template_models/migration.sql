-- CreateEnum
CREATE TYPE "TemplateVisibility" AS ENUM ('PRIVATE', 'UNLISTED', 'PUBLIC');

-- CreateEnum
CREATE TYPE "TemplateStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TemplateInstallStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "TemplateInstallStrategy" AS ENUM ('MERGE', 'OVERWRITE', 'PREFIX');

-- CreateEnum
CREATE TYPE "TemplateAssetType" AS ENUM ('WORKFLOW', 'REPORT', 'UILAYOUT', 'ROLE', 'VARIABLE', 'ACTION_TEMPLATE', 'DATA_SEED', 'PROJECT', 'INVOICE');

-- CreateEnum
CREATE TYPE "TemplateItemStatus" AS ENUM ('CREATED', 'SKIPPED', 'UPDATED', 'FAILED');

-- CreateEnum
CREATE TYPE "WorkflowStatus" AS ENUM ('DRAFT', 'INACTIVE', 'ACTIVE', 'PAUSED', 'ARCHIVED', 'ERROR');

-- CreateEnum
CREATE TYPE "WorkflowTriggerType" AS ENUM ('CONTACT_CREATED', 'CONTACT_UPDATED', 'DEAL_CREATED', 'DEAL_STATUS_CHANGED', 'EMPLOYEE_CREATED', 'EMPLOYEE_UPDATED', 'EMPLOYEE_STATUS_CHANGED', 'TIME_OFF_REQUESTED', 'INVOICE_CREATED', 'INVOICE_STATUS_CHANGED', 'EXPENSE_CREATED', 'PAYMENT_STATUS_CHANGED', 'PROJECT_CREATED', 'PROJECT_UPDATED', 'TASK_CREATED', 'TASK_STATUS_CHANGED', 'RECORD_CREATED', 'RECORD_UPDATED', 'RECORD_DELETED', 'STATUS_CHANGED', 'FORM_SUBMITTED');

-- CreateEnum
CREATE TYPE "WorkflowNodeType" AS ENUM ('TRIGGER', 'ACTION', 'CONDITION', 'DELAY', 'PARALLEL', 'LOOP', 'SWITCH', 'APPROVAL', 'EMAIL', 'SMS', 'WHATSAPP', 'SLACK', 'CALENDAR', 'DATA_TRANSFORM', 'NOTIFICATION', 'CUSTOM');

-- CreateEnum
CREATE TYPE "DependencyType" AS ENUM ('SUCCESS', 'FAILURE', 'COMPLETION');

-- CreateEnum
CREATE TYPE "ActionTemplateCategory" AS ENUM ('COMMUNICATION', 'NOTIFICATION', 'DATA_PROCESSING', 'INTEGRATION', 'APPROVAL', 'REPORTING', 'AUTOMATION', 'CUSTOM');

-- CreateEnum
CREATE TYPE "VariableDataType" AS ENUM ('STRING', 'NUMBER', 'BOOLEAN', 'DATE', 'DATETIME', 'EMAIL', 'PHONE', 'URL', 'JSON', 'ARRAY');

-- CreateEnum
CREATE TYPE "VariableScope" AS ENUM ('GLOBAL', 'ORGANIZATION', 'MODULE', 'WORKFLOW', 'TRIGGER');

-- CreateEnum
CREATE TYPE "WorkflowExecutionStatus" AS ENUM ('PENDING', 'RUNNING', 'PAUSED', 'COMPLETED', 'FAILED', 'CANCELLED', 'TIMEOUT');

-- CreateEnum
CREATE TYPE "ExecutionPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "NodeExecutionStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'SKIPPED', 'CANCELLED', 'TIMEOUT');

-- CreateEnum
CREATE TYPE "LogLevel" AS ENUM ('DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL');

-- CreateEnum
CREATE TYPE "WhatsAppMessageType" AS ENUM ('TEXT', 'TEMPLATE', 'IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'LOCATION', 'CONTACT');

-- CreateEnum
CREATE TYPE "IntegrationType" AS ENUM ('EMAIL_SMTP', 'EMAIL_SENDGRID', 'EMAIL_MAILGUN', 'EMAIL_RESEND', 'EMAIL_POSTMARK', 'SMS_TWILIO', 'SMS_AWS_SNS', 'SMS_NEXMO', 'SMS_MESSAGEBIRD', 'WHATSAPP_BUSINESS', 'WHATSAPP_TWILIO', 'SLACK', 'GOOGLE_CALENDAR', 'OUTLOOK_CALENDAR', 'APPLE_CALENDAR');

-- CreateTable
CREATE TABLE "TemplatePackage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "version" TEXT NOT NULL,
    "visibility" "TemplateVisibility" NOT NULL DEFAULT 'PRIVATE',
    "status" "TemplateStatus" NOT NULL DEFAULT 'DRAFT',
    "iconUrl" TEXT,
    "tags" JSONB,
    "manifest" JSONB NOT NULL,
    "assetsCount" INTEGER NOT NULL DEFAULT 0,
    "sizeBytes" INTEGER,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemplatePackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateVersion" (
    "id" TEXT NOT NULL,
    "templatePackageId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "manifest" JSONB NOT NULL,
    "changelog" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemplateVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateInstallation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "templatePackageId" TEXT NOT NULL,
    "templateVersionId" TEXT,
    "status" "TemplateInstallStatus" NOT NULL DEFAULT 'PENDING',
    "strategy" "TemplateInstallStrategy" NOT NULL DEFAULT 'MERGE',
    "namePrefix" TEXT,
    "preflight" JSONB,
    "logs" JSONB,
    "error" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "TemplateInstallation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateInstallItem" (
    "id" TEXT NOT NULL,
    "installationId" TEXT NOT NULL,
    "assetType" "TemplateAssetType" NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "createdModel" TEXT,
    "createdId" TEXT,
    "status" "TemplateItemStatus" NOT NULL DEFAULT 'CREATED',
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemplateInstallItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workflow" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "WorkflowStatus" NOT NULL DEFAULT 'INACTIVE',
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "category" TEXT,
    "canvasData" JSONB,
    "retryConfig" JSONB,
    "timeoutConfig" JSONB,
    "totalExecutions" INTEGER NOT NULL DEFAULT 0,
    "successfulExecutions" INTEGER NOT NULL DEFAULT 0,
    "failedExecutions" INTEGER NOT NULL DEFAULT 0,
    "lastExecutedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "publishedAt" TIMESTAMP(3),
    "publishedById" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationUiConfig" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationUiConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowTrigger" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "nodeId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "WorkflowTriggerType" NOT NULL,
    "module" TEXT NOT NULL,
    "entityType" TEXT,
    "eventType" TEXT NOT NULL,
    "conditions" JSONB,
    "delay" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastTriggered" TIMESTAMP(3),
    "triggerCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowTrigger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowNode" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "type" "WorkflowNodeType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "position" JSONB NOT NULL,
    "config" JSONB,
    "template" JSONB,
    "executionOrder" INTEGER,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "retryLimit" INTEGER NOT NULL DEFAULT 3,
    "timeout" INTEGER,
    "conditions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowConnection" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "sourceNodeId" TEXT NOT NULL,
    "targetNodeId" TEXT NOT NULL,
    "executionOrder" INTEGER NOT NULL DEFAULT 1,
    "label" TEXT,
    "conditions" JSONB,
    "edgeId" TEXT,
    "sourceHandle" TEXT,
    "targetHandle" TEXT,
    "style" JSONB,
    "animated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NodeDependency" (
    "id" TEXT NOT NULL,
    "dependentNodeId" TEXT NOT NULL,
    "prerequisiteNodeId" TEXT NOT NULL,
    "dependencyType" "DependencyType" NOT NULL DEFAULT 'SUCCESS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NodeDependency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "ActionTemplateCategory" NOT NULL,
    "type" "WorkflowNodeType" NOT NULL,
    "template" JSONB NOT NULL,
    "defaultConfig" JSONB,
    "schema" JSONB,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "requiredVariables" JSONB,
    "optionalVariables" JSONB,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActionTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionTemplateVersion" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "template" JSONB NOT NULL,
    "changes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActionTemplateVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VariableDefinition" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "dataType" "VariableDataType" NOT NULL,
    "defaultValue" TEXT,
    "validation" JSONB,
    "formatting" JSONB,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "scope" "VariableScope" NOT NULL DEFAULT 'ORGANIZATION',
    "moduleScope" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VariableDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TriggerVariable" (
    "id" TEXT NOT NULL,
    "triggerId" TEXT NOT NULL,
    "variableId" TEXT NOT NULL,
    "mapping" JSONB,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "defaultValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TriggerVariable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowExecution" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "triggerId" TEXT,
    "executionId" TEXT NOT NULL,
    "status" "WorkflowExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "ExecutionPriority" NOT NULL DEFAULT 'NORMAL',
    "triggerData" JSONB,
    "triggerContext" JSONB,
    "currentNodeId" TEXT,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "result" JSONB,
    "error" TEXT,
    "errorDetails" JSONB,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "retryDelay" INTEGER NOT NULL DEFAULT 60,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NodeExecution" (
    "id" TEXT NOT NULL,
    "workflowExecutionId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "executionOrder" INTEGER NOT NULL,
    "status" "NodeExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "input" JSONB,
    "output" JSONB,
    "transformedData" JSONB,
    "error" TEXT,
    "errorDetails" JSONB,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NodeExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecutionVariable" (
    "id" TEXT NOT NULL,
    "workflowExecutionId" TEXT NOT NULL,
    "variableDefinitionId" TEXT,
    "name" TEXT NOT NULL,
    "value" TEXT,
    "resolvedValue" TEXT,
    "dataType" "VariableDataType" NOT NULL,
    "source" TEXT,
    "nodeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExecutionVariable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecutionLog" (
    "id" TEXT NOT NULL,
    "workflowExecutionId" TEXT NOT NULL,
    "nodeId" TEXT,
    "level" "LogLevel" NOT NULL,
    "message" TEXT NOT NULL,
    "details" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExecutionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationConfig" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "IntegrationType" NOT NULL,
    "config" JSONB NOT NULL,
    "credentials" JSONB,
    "endpoints" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isHealthy" BOOLEAN NOT NULL DEFAULT true,
    "lastHealthCheck" TIMESTAMP(3),
    "healthDetails" JSONB,
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailAction" (
    "id" TEXT NOT NULL,
    "actionId" TEXT NOT NULL,
    "integrationId" TEXT,
    "fromName" TEXT,
    "fromEmail" TEXT,
    "replyTo" TEXT,
    "ccEmails" JSONB,
    "bccEmails" JSONB,
    "subject" TEXT NOT NULL,
    "htmlBody" TEXT,
    "textBody" TEXT,
    "templateId" TEXT,
    "attachments" JSONB,
    "trackOpens" BOOLEAN NOT NULL DEFAULT false,
    "trackClicks" BOOLEAN NOT NULL DEFAULT false,
    "variables" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsAction" (
    "id" TEXT NOT NULL,
    "actionId" TEXT NOT NULL,
    "integrationId" TEXT,
    "fromNumber" TEXT,
    "message" TEXT NOT NULL,
    "templateId" TEXT,
    "maxLength" INTEGER DEFAULT 160,
    "unicode" BOOLEAN NOT NULL DEFAULT false,
    "variables" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmsAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppAction" (
    "id" TEXT NOT NULL,
    "actionId" TEXT NOT NULL,
    "integrationId" TEXT,
    "businessAccountId" TEXT,
    "toNumbers" JSONB NOT NULL,
    "messageType" "WhatsAppMessageType" NOT NULL DEFAULT 'TEXT',
    "textMessage" TEXT,
    "templateName" TEXT,
    "templateLanguage" TEXT,
    "mediaUrl" TEXT,
    "mediaType" TEXT,
    "caption" TEXT,
    "templateParams" JSONB,
    "variables" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlackAction" (
    "id" TEXT NOT NULL,
    "actionId" TEXT NOT NULL,
    "integrationId" TEXT,
    "workspaceId" TEXT,
    "channel" TEXT,
    "userId" TEXT,
    "message" TEXT NOT NULL,
    "blocks" JSONB,
    "attachments" JSONB,
    "asUser" BOOLEAN NOT NULL DEFAULT false,
    "username" TEXT,
    "iconEmoji" TEXT,
    "iconUrl" TEXT,
    "threadTs" TEXT,
    "replyBroadcast" BOOLEAN NOT NULL DEFAULT false,
    "variables" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SlackAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarAction" (
    "id" TEXT NOT NULL,
    "actionId" TEXT NOT NULL,
    "integrationId" TEXT,
    "calendarId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isAllDay" BOOLEAN NOT NULL DEFAULT false,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "attendees" JSONB,
    "organizer" TEXT,
    "reminders" JSONB,
    "recurrence" JSONB,
    "variables" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowAnalytics" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "granularity" TEXT NOT NULL DEFAULT 'daily',
    "totalExecutions" INTEGER NOT NULL DEFAULT 0,
    "successfulExecutions" INTEGER NOT NULL DEFAULT 0,
    "failedExecutions" INTEGER NOT NULL DEFAULT 0,
    "averageDuration" DOUBLE PRECISION,
    "minDuration" INTEGER,
    "maxDuration" INTEGER,
    "p95Duration" INTEGER,
    "commonErrors" JSONB,
    "errorRate" DOUBLE PRECISION,
    "avgCpuUsage" DOUBLE PRECISION,
    "avgMemoryUsage" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TemplatePackage_organizationId_idx" ON "TemplatePackage"("organizationId");

-- CreateIndex
CREATE INDEX "TemplatePackage_visibility_idx" ON "TemplatePackage"("visibility");

-- CreateIndex
CREATE INDEX "TemplatePackage_status_idx" ON "TemplatePackage"("status");

-- CreateIndex
CREATE INDEX "TemplatePackage_category_idx" ON "TemplatePackage"("category");

-- CreateIndex
CREATE INDEX "TemplatePackage_createdById_idx" ON "TemplatePackage"("createdById");

-- CreateIndex
CREATE INDEX "TemplateVersion_templatePackageId_idx" ON "TemplateVersion"("templatePackageId");

-- CreateIndex
CREATE INDEX "TemplateVersion_isActive_idx" ON "TemplateVersion"("isActive");

-- CreateIndex
CREATE INDEX "TemplateVersion_createdById_idx" ON "TemplateVersion"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "TemplateVersion_templatePackageId_version_key" ON "TemplateVersion"("templatePackageId", "version");

-- CreateIndex
CREATE INDEX "TemplateInstallation_organizationId_idx" ON "TemplateInstallation"("organizationId");

-- CreateIndex
CREATE INDEX "TemplateInstallation_templatePackageId_idx" ON "TemplateInstallation"("templatePackageId");

-- CreateIndex
CREATE INDEX "TemplateInstallation_templateVersionId_idx" ON "TemplateInstallation"("templateVersionId");

-- CreateIndex
CREATE INDEX "TemplateInstallation_status_idx" ON "TemplateInstallation"("status");

-- CreateIndex
CREATE INDEX "TemplateInstallation_createdById_idx" ON "TemplateInstallation"("createdById");

-- CreateIndex
CREATE INDEX "TemplateInstallItem_installationId_idx" ON "TemplateInstallItem"("installationId");

-- CreateIndex
CREATE INDEX "TemplateInstallItem_assetType_idx" ON "TemplateInstallItem"("assetType");

-- CreateIndex
CREATE INDEX "TemplateInstallItem_status_idx" ON "TemplateInstallItem"("status");

-- CreateIndex
CREATE INDEX "Workflow_organizationId_idx" ON "Workflow"("organizationId");

-- CreateIndex
CREATE INDEX "Workflow_status_idx" ON "Workflow"("status");

-- CreateIndex
CREATE INDEX "Workflow_category_idx" ON "Workflow"("category");

-- CreateIndex
CREATE INDEX "Workflow_createdById_idx" ON "Workflow"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "Workflow_organizationId_name_version_key" ON "Workflow"("organizationId", "name", "version");

-- CreateIndex
CREATE INDEX "OrganizationUiConfig_organizationId_idx" ON "OrganizationUiConfig"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationUiConfig_organizationId_key_key" ON "OrganizationUiConfig"("organizationId", "key");

-- CreateIndex
CREATE INDEX "WorkflowTrigger_workflowId_idx" ON "WorkflowTrigger"("workflowId");

-- CreateIndex
CREATE INDEX "WorkflowTrigger_type_idx" ON "WorkflowTrigger"("type");

-- CreateIndex
CREATE INDEX "WorkflowTrigger_module_idx" ON "WorkflowTrigger"("module");

-- CreateIndex
CREATE INDEX "WorkflowTrigger_entityType_idx" ON "WorkflowTrigger"("entityType");

-- CreateIndex
CREATE INDEX "WorkflowTrigger_nodeId_idx" ON "WorkflowTrigger"("nodeId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowTrigger_nodeId_workflowId_key" ON "WorkflowTrigger"("nodeId", "workflowId");

-- CreateIndex
CREATE INDEX "WorkflowNode_workflowId_idx" ON "WorkflowNode"("workflowId");

-- CreateIndex
CREATE INDEX "WorkflowNode_type_idx" ON "WorkflowNode"("type");

-- CreateIndex
CREATE INDEX "WorkflowNode_nodeId_idx" ON "WorkflowNode"("nodeId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowNode_workflowId_nodeId_key" ON "WorkflowNode"("workflowId", "nodeId");

-- CreateIndex
CREATE INDEX "WorkflowConnection_workflowId_idx" ON "WorkflowConnection"("workflowId");

-- CreateIndex
CREATE INDEX "WorkflowConnection_sourceNodeId_idx" ON "WorkflowConnection"("sourceNodeId");

-- CreateIndex
CREATE INDEX "WorkflowConnection_targetNodeId_idx" ON "WorkflowConnection"("targetNodeId");

-- CreateIndex
CREATE INDEX "WorkflowConnection_sourceNodeId_executionOrder_idx" ON "WorkflowConnection"("sourceNodeId", "executionOrder");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowConnection_sourceNodeId_targetNodeId_key" ON "WorkflowConnection"("sourceNodeId", "targetNodeId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowConnection_workflowId_edgeId_key" ON "WorkflowConnection"("workflowId", "edgeId");

-- CreateIndex
CREATE INDEX "NodeDependency_dependentNodeId_idx" ON "NodeDependency"("dependentNodeId");

-- CreateIndex
CREATE INDEX "NodeDependency_prerequisiteNodeId_idx" ON "NodeDependency"("prerequisiteNodeId");

-- CreateIndex
CREATE UNIQUE INDEX "NodeDependency_dependentNodeId_prerequisiteNodeId_key" ON "NodeDependency"("dependentNodeId", "prerequisiteNodeId");

-- CreateIndex
CREATE INDEX "ActionTemplate_organizationId_idx" ON "ActionTemplate"("organizationId");

-- CreateIndex
CREATE INDEX "ActionTemplate_category_idx" ON "ActionTemplate"("category");

-- CreateIndex
CREATE INDEX "ActionTemplate_type_idx" ON "ActionTemplate"("type");

-- CreateIndex
CREATE INDEX "ActionTemplate_isActive_idx" ON "ActionTemplate"("isActive");

-- CreateIndex
CREATE INDEX "ActionTemplateVersion_templateId_idx" ON "ActionTemplateVersion"("templateId");

-- CreateIndex
CREATE INDEX "ActionTemplateVersion_version_idx" ON "ActionTemplateVersion"("version");

-- CreateIndex
CREATE UNIQUE INDEX "ActionTemplateVersion_templateId_version_key" ON "ActionTemplateVersion"("templateId", "version");

-- CreateIndex
CREATE INDEX "VariableDefinition_organizationId_idx" ON "VariableDefinition"("organizationId");

-- CreateIndex
CREATE INDEX "VariableDefinition_category_idx" ON "VariableDefinition"("category");

-- CreateIndex
CREATE INDEX "VariableDefinition_scope_idx" ON "VariableDefinition"("scope");

-- CreateIndex
CREATE INDEX "VariableDefinition_moduleScope_idx" ON "VariableDefinition"("moduleScope");

-- CreateIndex
CREATE UNIQUE INDEX "VariableDefinition_organizationId_name_key" ON "VariableDefinition"("organizationId", "name");

-- CreateIndex
CREATE INDEX "TriggerVariable_triggerId_idx" ON "TriggerVariable"("triggerId");

-- CreateIndex
CREATE INDEX "TriggerVariable_variableId_idx" ON "TriggerVariable"("variableId");

-- CreateIndex
CREATE UNIQUE INDEX "TriggerVariable_triggerId_variableId_key" ON "TriggerVariable"("triggerId", "variableId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowExecution_executionId_key" ON "WorkflowExecution"("executionId");

-- CreateIndex
CREATE INDEX "WorkflowExecution_workflowId_idx" ON "WorkflowExecution"("workflowId");

-- CreateIndex
CREATE INDEX "WorkflowExecution_triggerId_idx" ON "WorkflowExecution"("triggerId");

-- CreateIndex
CREATE INDEX "WorkflowExecution_status_idx" ON "WorkflowExecution"("status");

-- CreateIndex
CREATE INDEX "WorkflowExecution_startedAt_idx" ON "WorkflowExecution"("startedAt");

-- CreateIndex
CREATE INDEX "WorkflowExecution_executionId_idx" ON "WorkflowExecution"("executionId");

-- CreateIndex
CREATE INDEX "NodeExecution_workflowExecutionId_idx" ON "NodeExecution"("workflowExecutionId");

-- CreateIndex
CREATE INDEX "NodeExecution_nodeId_idx" ON "NodeExecution"("nodeId");

-- CreateIndex
CREATE INDEX "NodeExecution_status_idx" ON "NodeExecution"("status");

-- CreateIndex
CREATE INDEX "NodeExecution_executionOrder_idx" ON "NodeExecution"("executionOrder");

-- CreateIndex
CREATE INDEX "ExecutionVariable_workflowExecutionId_idx" ON "ExecutionVariable"("workflowExecutionId");

-- CreateIndex
CREATE INDEX "ExecutionVariable_variableDefinitionId_idx" ON "ExecutionVariable"("variableDefinitionId");

-- CreateIndex
CREATE INDEX "ExecutionVariable_name_idx" ON "ExecutionVariable"("name");

-- CreateIndex
CREATE INDEX "ExecutionLog_workflowExecutionId_idx" ON "ExecutionLog"("workflowExecutionId");

-- CreateIndex
CREATE INDEX "ExecutionLog_nodeId_idx" ON "ExecutionLog"("nodeId");

-- CreateIndex
CREATE INDEX "ExecutionLog_level_idx" ON "ExecutionLog"("level");

-- CreateIndex
CREATE INDEX "ExecutionLog_timestamp_idx" ON "ExecutionLog"("timestamp");

-- CreateIndex
CREATE INDEX "IntegrationConfig_organizationId_idx" ON "IntegrationConfig"("organizationId");

-- CreateIndex
CREATE INDEX "IntegrationConfig_type_idx" ON "IntegrationConfig"("type");

-- CreateIndex
CREATE INDEX "IntegrationConfig_isActive_idx" ON "IntegrationConfig"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationConfig_organizationId_name_key" ON "IntegrationConfig"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "EmailAction_actionId_key" ON "EmailAction"("actionId");

-- CreateIndex
CREATE INDEX "EmailAction_actionId_idx" ON "EmailAction"("actionId");

-- CreateIndex
CREATE INDEX "EmailAction_integrationId_idx" ON "EmailAction"("integrationId");

-- CreateIndex
CREATE UNIQUE INDEX "SmsAction_actionId_key" ON "SmsAction"("actionId");

-- CreateIndex
CREATE INDEX "SmsAction_actionId_idx" ON "SmsAction"("actionId");

-- CreateIndex
CREATE INDEX "SmsAction_integrationId_idx" ON "SmsAction"("integrationId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppAction_actionId_key" ON "WhatsAppAction"("actionId");

-- CreateIndex
CREATE INDEX "WhatsAppAction_actionId_idx" ON "WhatsAppAction"("actionId");

-- CreateIndex
CREATE INDEX "WhatsAppAction_integrationId_idx" ON "WhatsAppAction"("integrationId");

-- CreateIndex
CREATE UNIQUE INDEX "SlackAction_actionId_key" ON "SlackAction"("actionId");

-- CreateIndex
CREATE INDEX "SlackAction_actionId_idx" ON "SlackAction"("actionId");

-- CreateIndex
CREATE INDEX "SlackAction_integrationId_idx" ON "SlackAction"("integrationId");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarAction_actionId_key" ON "CalendarAction"("actionId");

-- CreateIndex
CREATE INDEX "CalendarAction_actionId_idx" ON "CalendarAction"("actionId");

-- CreateIndex
CREATE INDEX "CalendarAction_integrationId_idx" ON "CalendarAction"("integrationId");

-- CreateIndex
CREATE INDEX "WorkflowAnalytics_workflowId_idx" ON "WorkflowAnalytics"("workflowId");

-- CreateIndex
CREATE INDEX "WorkflowAnalytics_periodStart_idx" ON "WorkflowAnalytics"("periodStart");

-- CreateIndex
CREATE INDEX "WorkflowAnalytics_granularity_idx" ON "WorkflowAnalytics"("granularity");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowAnalytics_workflowId_periodStart_granularity_key" ON "WorkflowAnalytics"("workflowId", "periodStart", "granularity");

-- AddForeignKey
ALTER TABLE "TemplatePackage" ADD CONSTRAINT "TemplatePackage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateVersion" ADD CONSTRAINT "TemplateVersion_templatePackageId_fkey" FOREIGN KEY ("templatePackageId") REFERENCES "TemplatePackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateInstallation" ADD CONSTRAINT "TemplateInstallation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateInstallation" ADD CONSTRAINT "TemplateInstallation_templatePackageId_fkey" FOREIGN KEY ("templatePackageId") REFERENCES "TemplatePackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateInstallation" ADD CONSTRAINT "TemplateInstallation_templateVersionId_fkey" FOREIGN KEY ("templateVersionId") REFERENCES "TemplateVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateInstallItem" ADD CONSTRAINT "TemplateInstallItem_installationId_fkey" FOREIGN KEY ("installationId") REFERENCES "TemplateInstallation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationUiConfig" ADD CONSTRAINT "OrganizationUiConfig_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowTrigger" ADD CONSTRAINT "WorkflowTrigger_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowTrigger" ADD CONSTRAINT "WorkflowTrigger_nodeId_workflowId_fkey" FOREIGN KEY ("nodeId", "workflowId") REFERENCES "WorkflowNode"("nodeId", "workflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowNode" ADD CONSTRAINT "WorkflowNode_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowConnection" ADD CONSTRAINT "WorkflowConnection_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowConnection" ADD CONSTRAINT "WorkflowConnection_sourceNodeId_fkey" FOREIGN KEY ("sourceNodeId") REFERENCES "WorkflowNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowConnection" ADD CONSTRAINT "WorkflowConnection_targetNodeId_fkey" FOREIGN KEY ("targetNodeId") REFERENCES "WorkflowNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NodeDependency" ADD CONSTRAINT "NodeDependency_dependentNodeId_fkey" FOREIGN KEY ("dependentNodeId") REFERENCES "WorkflowNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NodeDependency" ADD CONSTRAINT "NodeDependency_prerequisiteNodeId_fkey" FOREIGN KEY ("prerequisiteNodeId") REFERENCES "WorkflowNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionTemplate" ADD CONSTRAINT "ActionTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionTemplateVersion" ADD CONSTRAINT "ActionTemplateVersion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ActionTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariableDefinition" ADD CONSTRAINT "VariableDefinition_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TriggerVariable" ADD CONSTRAINT "TriggerVariable_triggerId_fkey" FOREIGN KEY ("triggerId") REFERENCES "WorkflowTrigger"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TriggerVariable" ADD CONSTRAINT "TriggerVariable_variableId_fkey" FOREIGN KEY ("variableId") REFERENCES "VariableDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowExecution" ADD CONSTRAINT "WorkflowExecution_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowExecution" ADD CONSTRAINT "WorkflowExecution_triggerId_fkey" FOREIGN KEY ("triggerId") REFERENCES "WorkflowTrigger"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NodeExecution" ADD CONSTRAINT "NodeExecution_workflowExecutionId_fkey" FOREIGN KEY ("workflowExecutionId") REFERENCES "WorkflowExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NodeExecution" ADD CONSTRAINT "NodeExecution_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "WorkflowNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionVariable" ADD CONSTRAINT "ExecutionVariable_workflowExecutionId_fkey" FOREIGN KEY ("workflowExecutionId") REFERENCES "WorkflowExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionVariable" ADD CONSTRAINT "ExecutionVariable_variableDefinitionId_fkey" FOREIGN KEY ("variableDefinitionId") REFERENCES "VariableDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionLog" ADD CONSTRAINT "ExecutionLog_workflowExecutionId_fkey" FOREIGN KEY ("workflowExecutionId") REFERENCES "WorkflowExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationConfig" ADD CONSTRAINT "IntegrationConfig_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailAction" ADD CONSTRAINT "EmailAction_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "WorkflowNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmsAction" ADD CONSTRAINT "SmsAction_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "WorkflowNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppAction" ADD CONSTRAINT "WhatsAppAction_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "WorkflowNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlackAction" ADD CONSTRAINT "SlackAction_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "WorkflowNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarAction" ADD CONSTRAINT "CalendarAction_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "WorkflowNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowAnalytics" ADD CONSTRAINT "WorkflowAnalytics_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
