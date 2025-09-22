"use client";

import React from "react";
import { ExternalLink, Github, MessageSquare, Bug } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
  const handleGitHubClick = () => {
    window.open(
      "https://github.com/Opensyte/opensyte/issues",
      "_blank",
      "noopener,noreferrer"
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Share Your Feedback
          </DialogTitle>
          <DialogDescription>
            Help us improve OpenSyte by sharing your ideas or reporting bugs.
            Your feedback is valuable to us!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Card
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={handleGitHubClick}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Github className="h-4 w-4" />
                GitHub Issues
                <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
              </CardTitle>
              <CardDescription>
                Report bugs, request features, or suggest improvements
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Bug className="h-3 w-3" />
                  <span>Bug Reports</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  <span>Feature Requests</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleGitHubClick}>
              <Github className="h-4 w-4 mr-2" />
              Open GitHub Issues
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
