"use client";

import React, { useState } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Skeleton } from "~/components/ui/skeleton";
import { Mail, MessageSquare, Search, Lock, Plus, Check } from "lucide-react";
import { SystemTemplateService } from "~/lib/system-templates";
import type {
  MessageChannel,
  MessageTemplatePickerOption,
} from "~/types/message-templates";
import { cn } from "~/lib/utils";

interface MessageTemplatePickerProps {
  organizationId: string;
  channel?: MessageChannel;
  value?: string; // Selected template ID
  onChange: (
    templateId: string | null,
    templateInfo?: MessageTemplatePickerOption
  ) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function MessageTemplatePicker({
  organizationId,
  channel,
  value,
  onChange,
  placeholder = "Select a template...",
  disabled = false,
}: MessageTemplatePickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Get action templates
  const { data: actionTemplates, isLoading } =
    api.workflows.actions.getActionTemplates.useQuery({
      organizationId,
      category: "COMMUNICATION",
    });

  // Filter templates based on channel and search
  const filteredTemplates = React.useMemo(() => {
    if (!actionTemplates) return [];

    return actionTemplates
      .filter(template => {
        // Filter by channel if specified
        if (channel && template.type !== channel) return false;

        // Only show EMAIL and SMS templates
        if (template.type !== "EMAIL" && template.type !== "SMS") return false;

        // Filter by search
        if (
          search &&
          !template.name.toLowerCase().includes(search.toLowerCase())
        ) {
          return false;
        }

        return true;
      })
      .map(
        (template): MessageTemplatePickerOption => ({
          id: template.id,
          name: template.name,
          type: template.type as MessageChannel,
          description: template.description ?? undefined,
          isSystem: SystemTemplateService.isSystemTemplate(template.id),
        })
      );
  }, [actionTemplates, channel, search]);

  // Get selected template info
  const selectedTemplate = filteredTemplates.find(t => t.id === value);

  const handleSelect = (template: MessageTemplatePickerOption) => {
    onChange(template.id, template);
    setOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    setOpen(false);
  };

  const getChannelIcon = (type: MessageChannel) => {
    switch (type) {
      case "EMAIL":
        return <Mail className="h-4 w-4" />;
      case "SMS":
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-2">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between",
              !selectedTemplate && "text-muted-foreground"
            )}
            disabled={disabled}
          >
            {selectedTemplate ? (
              <div className="flex items-center gap-2">
                {getChannelIcon(selectedTemplate.type)}
                <span>{selectedTemplate.name}</span>
                {selectedTemplate.isSystem && <Lock className="h-3 w-3" />}
              </div>
            ) : (
              placeholder
            )}
            <Plus className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Select {channel ? channel.toLowerCase() : "message"} template
            </DialogTitle>
            <DialogDescription>
              Choose from available templates or create a new one
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Clear Selection */}
            {selectedTemplate && (
              <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">
                    Selected: {selectedTemplate.name}
                  </span>
                </div>
                <Button variant="outline" size="sm" onClick={handleClear}>
                  Clear
                </Button>
              </div>
            )}

            {/* Templates List */}
            <ScrollArea className="h-96">
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i}>
                      <CardHeader className="pb-2">
                        <Skeleton className="h-5 w-1/2" />
                        <Skeleton className="h-4 w-3/4" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-4 w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">
                    {search
                      ? "No templates found matching your search"
                      : `No ${channel?.toLowerCase() ?? "message"} templates available`}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTemplates.map(template => (
                    <Card
                      key={template.id}
                      className={cn(
                        "cursor-pointer transition-colors hover:bg-muted/50",
                        value === template.id && "ring-2 ring-primary"
                      )}
                      onClick={() => handleSelect(template)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base flex items-center gap-2">
                            {getChannelIcon(template.type)}
                            {template.name}
                            {template.isSystem && (
                              <Lock className="h-3 w-3 text-muted-foreground" />
                            )}
                          </CardTitle>
                          <div className="flex gap-1">
                            <Badge
                              variant={
                                template.isSystem ? "secondary" : "outline"
                              }
                              className="text-xs"
                            >
                              {template.isSystem ? "System" : "Custom"}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {template.type}
                            </Badge>
                          </div>
                        </div>
                        {template.description && (
                          <CardDescription className="text-sm">
                            {template.description}
                          </CardDescription>
                        )}
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Create New Template Link */}
            <div className="border-t pt-4">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setOpen(false);
                  // Navigate to create template page
                  const url = `/${organizationId}/workflows/message-templates/create${channel ? `?type=${channel}` : ""}`;
                  window.open(url, "_blank");
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create New Template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Selected template display */}
      {selectedTemplate && (
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          {getChannelIcon(selectedTemplate.type)}
          {selectedTemplate.type} •{" "}
          {selectedTemplate.isSystem ? "System" : "Custom"}
          {selectedTemplate.description && ` • ${selectedTemplate.description}`}
        </div>
      )}
    </div>
  );
}

// Simplified version for form inputs
interface MessageTemplateSelectProps {
  organizationId: string;
  channel?: MessageChannel;
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function MessageTemplateSelect({
  organizationId,
  channel,
  value,
  onChange,
  placeholder = "Select template...",
  disabled = false,
}: MessageTemplateSelectProps) {
  // Get action templates
  const { data: actionTemplates, isLoading } =
    api.workflows.actions.getActionTemplates.useQuery({
      organizationId,
      category: "COMMUNICATION",
    });

  // Filter templates
  const options = React.useMemo(() => {
    if (!actionTemplates) return [];

    return actionTemplates
      .filter(template => {
        if (channel && template.type !== channel) return false;
        return template.type === "EMAIL" || template.type === "SMS";
      })
      .map(template => ({
        id: template.id,
        name: template.name,
        type: template.type as MessageChannel,
        isSystem: SystemTemplateService.isSystemTemplate(template.id),
      }));
  }, [actionTemplates, channel]);

  const getChannelIcon = (type: MessageChannel) => {
    switch (type) {
      case "EMAIL":
        return <Mail className="h-4 w-4" />;
      case "SMS":
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return <Skeleton className="h-10 w-full" />;
  }

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map(template => (
          <SelectItem key={template.id} value={template.id}>
            <div className="flex items-center gap-2">
              {getChannelIcon(template.type)}
              <span>{template.name}</span>
              {template.isSystem && <Lock className="h-3 w-3" />}
              <Badge variant="outline" className="text-xs ml-auto">
                {template.type}
              </Badge>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
