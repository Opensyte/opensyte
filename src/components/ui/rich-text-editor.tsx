"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Blockquote from "@tiptap/extension-blockquote";
import Heading from "@tiptap/extension-heading";
import BulletList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";
import ListItem from "@tiptap/extension-list-item";
import { Button } from "~/components/ui/button";
import {
  Bold,
  Italic,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { useEffect } from "react";

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = "Start typing...",
  className,
}: RichTextEditorProps) {
  // Avoid SSR hydration mismatches by mounting editor only on client
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        bulletList: false,
        orderedList: false,
        listItem: false,
        heading: false,
      }),
      Heading.configure({ levels: [1, 2, 3] }),
      BulletList.configure({
        HTMLAttributes: {
          class: "list-disc list-outside ml-6",
        },
      }),
      OrderedList.configure({
        HTMLAttributes: {
          class: "list-decimal list-outside ml-6",
        },
      }),
      ListItem,
      Blockquote.configure({
        HTMLAttributes: {
          class: "border-l-4 border-gray-300 pl-4 italic",
        },
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[120px] px-3 py-2",
          className
        ),
      },
    },
  });

  // Keep the editor content in sync with external content changes
  // without causing hydration issues
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (content !== current) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor)
    return <div className={cn("min-h-[120px] px-3 py-2", className)} />;

  return (
    <div className="border border-input rounded-md">
      {/* Toolbar */}
      <div className="border-b border-input p-2 flex flex-wrap gap-1">
        {/* Headings */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          className={cn("h-8 px-2 text-xs", {
            "bg-muted": editor.isActive("heading", { level: 1 }),
          })}
        >
          H1
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          className={cn("h-8 px-2 text-xs", {
            "bg-muted": editor.isActive("heading", { level: 2 }),
          })}
        >
          H2
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          className={cn("h-8 px-2 text-xs", {
            "bg-muted": editor.isActive("heading", { level: 3 }),
          })}
        >
          H3
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={cn("h-8 w-8 p-0", {
            "bg-muted": editor.isActive("bold"),
          })}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={cn("h-8 w-8 p-0", {
            "bg-muted": editor.isActive("italic"),
          })}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={cn("h-8 w-8 p-0", {
            "bg-muted": editor.isActive("strike"),
          })}
        >
          <Strikethrough className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={cn("h-8 w-8 p-0", {
            "bg-muted": editor.isActive("bulletList"),
          })}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={cn("h-8 w-8 p-0", {
            "bg-muted": editor.isActive("orderedList"),
          })}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={cn("h-8 w-8 p-0", {
            "bg-muted": editor.isActive("blockquote"),
          })}
        >
          <Quote className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
          className="h-8 w-8 p-0"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
          className="h-8 w-8 p-0"
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>

      {/* Editor */}
      <div className="min-h-[120px]">
        <EditorContent
          editor={editor}
          className="focus-within:outline-none"
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}
