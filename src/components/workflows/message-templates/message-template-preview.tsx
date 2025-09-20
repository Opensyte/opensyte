"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Mail, MessageSquare, User, Clock } from "lucide-react";
import { cn } from "~/lib/utils";
import type { MessageChannel } from "~/types/message-templates";

interface MessageTemplatePreviewProps {
  type: MessageChannel;
  data: {
    subject?: string;
    html?: string;
    message?: string;
  };
  sampleData?: Record<string, unknown>;
}

// Helper function to render template with sample data
function renderTemplate(
  template: string,
  sampleData: Record<string, unknown>
): string {
  if (!template) return "";

  return template.replace(/\{([^}]+)\}/g, (match, key) => {
    const value = sampleData[key as keyof typeof sampleData];
    if (value !== undefined && value !== null) {
      // Handle different types of values
      if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      ) {
        return String(value);
      }
      // For objects, return JSON string
      return JSON.stringify(value);
    }
    return match; // Keep placeholder if no sample data
  });
}

// Helper function to extract variables from template content
function extractVariables(content: string): string[] {
  const variableRegex = /\{([^}]+)\}/g;
  const variables: string[] = [];
  let match;

  while ((match = variableRegex.exec(content)) !== null) {
    const variable = match[1];
    if (variable && !variables.includes(variable)) {
      variables.push(variable);
    }
  }

  return variables;
}

export function MessageTemplatePreview({
  type,
  data,
  sampleData = {},
}: MessageTemplatePreviewProps) {
  if (type === "EMAIL") {
    const renderedSubject = data.subject
      ? renderTemplate(data.subject, sampleData)
      : "";
    const renderedHtml = data.html ? renderTemplate(data.html, sampleData) : "";

    // Extract variables
    const allVariables = new Set<string>();
    if (data.subject)
      extractVariables(data.subject).forEach(v => allVariables.add(v));
    if (data.html)
      extractVariables(data.html).forEach(v => allVariables.add(v));

    return (
      <div className="space-y-4">
        {/* Email Preview */}
        <Card className="bg-white dark:bg-gray-900 border">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              Email Preview
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Email Header */}
            <div className="space-y-2 border-b pb-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  your-organization@example.com
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Just now</span>
              </div>
              {renderedSubject && (
                <div className="font-semibold text-lg">{renderedSubject}</div>
              )}
            </div>

            {/* Email Body */}
            <div className="min-h-[200px]">
              {renderedHtml ? (
                <div
                  className="prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: renderedHtml }}
                />
              ) : (
                <div className="flex items-center justify-center h-48 text-muted-foreground">
                  <div className="text-center">
                    <Mail className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No content to preview</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Variables Info */}
        {allVariables.size > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Variables Used</CardTitle>
              <CardDescription>
                Variables that will be replaced with actual data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {Array.from(allVariables).map(variable => (
                  <Badge
                    key={variable}
                    variant={sampleData[variable] ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {"{" + variable + "}"}
                    {sampleData[variable] !== undefined &&
                      sampleData[variable] !== null && (
                        <span className="ml-1 opacity-70">
                          →{" "}
                          {typeof sampleData[variable] === "object"
                            ? JSON.stringify(sampleData[variable])
                            : typeof sampleData[variable] === "string" ||
                                typeof sampleData[variable] === "number" ||
                                typeof sampleData[variable] === "boolean"
                              ? String(sampleData[variable])
                              : "[object]"}
                        </span>
                      )}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // SMS Preview
  const renderedMessage = data.message
    ? renderTemplate(data.message, sampleData)
    : "";
  const variables = data.message ? extractVariables(data.message) : [];

  // SMS analysis
  const characterCount = renderedMessage.length;
  const isGSM =
    /^[A-Za-z0-9 \r\n@£$¥èéùìòÇØøÅå_ΔΦΓΛΩΠΨΣΘΞÆæßÉ!"#¤%&'()*+,\-./:;<=>?¡ÄÖÑÜ§¿äöñüà^{}\\[~\]|€]*$/.test(
      renderedMessage
    );
  const encoding = isGSM ? "GSM" : "Unicode";
  const maxSingleSegment = isGSM ? 160 : 70;
  const segmentSize = isGSM ? 153 : 67;

  let segmentCount = 0;
  if (characterCount === 0) {
    segmentCount = 0;
  } else if (characterCount <= maxSingleSegment) {
    segmentCount = 1;
  } else {
    segmentCount = Math.ceil(characterCount / segmentSize);
  }

  return (
    <div className="space-y-4">
      {/* SMS Preview */}
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MessageSquare className="h-4 w-4" />
            SMS Preview
          </div>
        </CardHeader>
        <CardContent>
          {/* Phone Frame */}
          <div className="mx-auto max-w-xs">
            <div className="relative bg-gray-900 rounded-3xl p-2 shadow-xl">
              {/* Phone Notch */}
              <div className="bg-black rounded-2xl p-1">
                <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl min-h-[400px] p-4 relative">
                  {/* Status Bar */}
                  <div className="flex justify-between items-center text-xs font-medium mb-4 text-gray-600 dark:text-gray-400">
                    <span>9:41 AM</span>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-2 bg-green-500 rounded-sm"></div>
                      <span>100%</span>
                    </div>
                  </div>

                  {/* Message Header */}
                  <div className="flex items-center gap-3 mb-4 pb-2 border-b">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      O
                    </div>
                    <div>
                      <div className="font-medium text-sm">
                        Your Organization
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Just now
                      </div>
                    </div>
                  </div>

                  {/* Message Bubble */}
                  <div className="flex justify-start">
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl rounded-bl-md p-3 shadow-sm",
                        "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      )}
                    >
                      {renderedMessage ? (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                          {renderedMessage}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          No message to preview
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SMS Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Message Analysis</CardTitle>
          <CardDescription>
            Character count and SMS segment information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="font-medium">{characterCount}</div>
              <div className="text-muted-foreground">Characters</div>
            </div>
            <div className="text-center">
              <div className="font-medium">{segmentCount}</div>
              <div className="text-muted-foreground">Segments</div>
            </div>
            <div className="text-center">
              <div className="font-medium">{encoding}</div>
              <div className="text-muted-foreground">Encoding</div>
            </div>
          </div>

          {segmentCount > 1 && (
            <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md">
              <p className="text-xs text-amber-800 dark:text-amber-200">
                ⚠️ Message will be split into {segmentCount} segments
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Variables Info */}
      {variables.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Variables Used</CardTitle>
            <CardDescription>
              Variables that will be replaced with actual data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {variables.map(variable => (
                <Badge
                  key={variable}
                  variant={sampleData[variable] ? "default" : "secondary"}
                  className="text-xs"
                >
                  {"{" + variable + "}"}
                  {sampleData[variable] !== undefined &&
                    sampleData[variable] !== null && (
                      <span className="ml-1 opacity-70">
                        →{" "}
                        {typeof sampleData[variable] === "object"
                          ? JSON.stringify(sampleData[variable])
                          : typeof sampleData[variable] === "string" ||
                              typeof sampleData[variable] === "number" ||
                              typeof sampleData[variable] === "boolean"
                            ? String(sampleData[variable])
                            : "[object]"}
                      </span>
                    )}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
