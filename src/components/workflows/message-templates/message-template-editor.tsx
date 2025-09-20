"use client";

import React, {
  useCallback,
  forwardRef,
  useImperativeHandle,
  useRef,
} from "react";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { RichTextEditor } from "~/components/ui/rich-text-editor";
import type { MessageChannel } from "~/types/message-templates";

interface MessageTemplateEditorProps {
  type: MessageChannel;
  value: {
    subject?: string;
    html?: string;
    message?: string;
  };
  onChange: (data: {
    subject?: string;
    html?: string;
    message?: string;
  }) => void;
  variables?: {
    required: string[];
    optional: string[];
  };
  onVariablesChange?: (
    variables: string[],
    variableType: "required" | "optional"
  ) => void;
  errors?: {
    subject?: string;
    html?: string;
    message?: string;
  };
}

export interface MessageTemplateEditorRef {
  insertVariable: (variableName: string) => void;
}

// SMS character counting utilities
const GSM_CHARSET =
  /^[A-Za-z0-9 \r\n@£$¥èéùìòÇØøÅå_ΔΦΓΛΩΠΨΣΘΞÆæßÉ!"#¤%&'()*+,\-./:;<=>?¡ÄÖÑÜ§¿äöñüà^{}\\[~\]|€]*$/;

function analyzeSmsLength(text: string) {
  const isGSM = GSM_CHARSET.test(text);
  const encoding = isGSM ? "GSM" : "Unicode";
  const characterCount = text.length;

  let maxSingleSegment: number;
  let segmentSize: number;

  if (isGSM) {
    maxSingleSegment = 160;
    segmentSize = 153; // Multi-part SMS segment size for GSM
  } else {
    maxSingleSegment = 70;
    segmentSize = 67; // Multi-part SMS segment size for Unicode
  }

  let segmentCount: number;
  if (characterCount === 0) {
    segmentCount = 0;
  } else if (characterCount <= maxSingleSegment) {
    segmentCount = 1;
  } else {
    segmentCount = Math.ceil(characterCount / segmentSize);
  }

  return {
    characterCount,
    segmentCount,
    encoding,
    maxSingleSegment,
    isOverLimit: segmentCount > 3, // Warn if more than 3 segments
  };
}

export const MessageTemplateEditor = forwardRef<
  MessageTemplateEditorRef,
  MessageTemplateEditorProps
>(
  (
    {
      type,
      value,
      onChange,
      variables: _variables,
      onVariablesChange: _onVariablesChange,
      errors,
    },
    ref
  ) => {
    // Refs for rich text editors
    const richTextEditorRef = useRef<{
      insertVariable: (variableName: string) => void;
    } | null>(null);

    // Expose the insertVariable function through the ref
    useImperativeHandle(
      ref,
      () => ({
        insertVariable: (variableName: string) => {
          if (richTextEditorRef.current) {
            richTextEditorRef.current.insertVariable(variableName);
          }
        },
      }),
      []
    );
    const handleSubjectChange = useCallback(
      (newSubject: string) => {
        onChange({
          subject: newSubject,
          html: value.html,
          message: value.message,
        });
      },
      [onChange, value.html, value.message]
    );

    const handleHtmlChange = useCallback(
      (newHtml: string) => {
        onChange({
          subject: value.subject,
          html: newHtml,
          message: value.message,
        });
      },
      [onChange, value.subject, value.message]
    );

    const handleMessageChange = useCallback(
      (newMessage: string) => {
        onChange({
          subject: value.subject,
          html: value.html,
          message: newMessage,
        });
      },
      [onChange, value.subject, value.html]
    );

    // SMS analysis
    const smsAnalysis =
      type === "SMS" ? analyzeSmsLength(value.message ?? "") : null;

    if (type === "EMAIL") {
      return (
        <div className="space-y-6">
          {/* Email Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">
              Subject Line <span className="text-red-500">*</span>
            </Label>
            <Input
              id="subject"
              value={value.subject ?? ""}
              onChange={e => handleSubjectChange(e.target.value)}
              placeholder="Enter email subject..."
            />
            {errors?.subject && (
              <p className="text-sm text-red-500">{errors.subject}</p>
            )}
          </div>

          {/* Email Body */}
          <div className="space-y-4">
            <Tabs defaultValue="html" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="html">Rich Text Editor</TabsTrigger>
                <TabsTrigger value="text">Plain Text Fallback</TabsTrigger>
              </TabsList>

              <TabsContent value="html" className="space-y-4">
                <div className="space-y-2">
                  <Label>
                    HTML Body <span className="text-red-500">*</span>
                  </Label>
                  <RichTextEditor
                    ref={richTextEditorRef}
                    content={value.html ?? ""}
                    onChange={handleHtmlChange}
                    placeholder="Enter your email content..."
                    className="min-h-[200px]"
                  />
                  {errors?.html && (
                    <p className="text-sm text-red-500">{errors.html}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Use variables like {"{user_name}"} for personalization
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="text" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bodyText">Plain Text Body (Optional)</Label>
                  <Textarea
                    id="bodyText"
                    value={value.html ?? ""}
                    onChange={e => onChange({ html: e.target.value })}
                    placeholder="Enter plain text version for email clients that don't support HTML..."
                    rows={8}
                  />
                  <p className="text-xs text-muted-foreground">
                    Optional: Plain text version for email clients that
                    don&apos;t support HTML
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      );
    }

    // SMS Editor
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="smsBody">
            SMS Message <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="smsBody"
            value={value.message ?? ""}
            onChange={e => handleMessageChange(e.target.value)}
            placeholder="Enter your SMS message..."
            rows={6}
          />

          {errors?.message && (
            <p className="text-sm text-red-500">{errors.message}</p>
          )}

          {/* SMS Analysis */}
          {smsAnalysis && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Characters: {smsAnalysis.characterCount}
                </span>
                <span className="text-muted-foreground">
                  Segments: {smsAnalysis.segmentCount}
                </span>
                <span className="text-muted-foreground">
                  Encoding: {smsAnalysis.encoding}
                </span>
              </div>

              {smsAnalysis.isOverLimit && (
                <p className="text-xs text-amber-600">
                  ⚠️ Message will be split into {smsAnalysis.segmentCount}{" "}
                  segments. Consider shortening for better delivery.
                </p>
              )}

              {smsAnalysis.segmentCount <= 1 &&
                smsAnalysis.characterCount >
                  smsAnalysis.maxSingleSegment * 0.8 && (
                  <p className="text-xs text-amber-600">
                    ℹ️ Approaching single SMS limit (
                    {smsAnalysis.maxSingleSegment} characters)
                  </p>
                )}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Use variables like {"{user_name}"} for personalization
          </p>
        </div>
      </div>
    );
  }
);

MessageTemplateEditor.displayName = "MessageTemplateEditor";
