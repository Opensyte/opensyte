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
import { useEffect, forwardRef, useImperativeHandle } from "react";

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
}

export interface RichTextEditorRef {
  insertVariable: (variableName: string) => void;
}

export const RichTextEditor = forwardRef<
  RichTextEditorRef,
  RichTextEditorProps
>(({ content, onChange, placeholder = "Start typing...", className }, ref) => {
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
          "prose prose-sm max-w-none focus:outline-none min-h-[120px] px-3 py-2",
          "[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-6 [&_h1]:mb-4",
          "[&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-5 [&_h2]:mb-3",
          "[&_h3]:text-lg [&_h3]:font-bold [&_h3]:mt-4 [&_h3]:mb-2",
          "[&_p]:my-2 [&_p]:leading-relaxed",
          "[&_ul]:list-disc [&_ul]:ml-6 [&_ul]:my-3",
          "[&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:my-3",
          "[&_li]:my-1",
          "[&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-4",
          className
        ),
      },
    },
  });

  // Expose insertVariable function through ref
  useImperativeHandle(
    ref,
    () => ({
      insertVariable: (variableName: string) => {
        if (editor) {
          const variableText = `{${variableName}}`;
          editor.chain().focus().insertContent(variableText).run();
        }
      },
    }),
    [editor]
  );

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
});

RichTextEditor.displayName = "RichTextEditor";
