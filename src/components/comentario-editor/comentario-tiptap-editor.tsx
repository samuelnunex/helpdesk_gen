"use client";

import { useEffect, useState } from "react";

import { Link as TiptapLink } from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Italic, Link2, List, ListOrdered, Quote, Redo2, Strikethrough, Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";

import "./comentario-editor.css";

type Props = {
  onChange: (html: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

export function ComentarioTiptapEditor({
  onChange,
  disabled = false,
  placeholder = "Adicione um comentário…",
}: Props) {
  const [, setTick] = useState(0);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
      }),
      Placeholder.configure({ placeholder }),
      TiptapLink.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
        HTMLAttributes: {
          class: "text-primary underline underline-offset-2",
          rel: "noopener noreferrer nofollow",
          target: "_blank",
        },
      }),
    ],
    content: "",
    editable: !disabled,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "tiptap min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs",
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
    onSelectionUpdate: () => setTick((n) => n + 1),
    onTransaction: () => setTick((n) => n + 1),
  });

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [disabled, editor]);

  if (!editor) {
    return (
      <div className="tiptap-editor-root text-muted-foreground min-h-[120px] rounded-md border border-dashed px-3 py-6 text-center text-sm">
        A carregar editor…
      </div>
    );
  }

  const Btn = ({
    onPress,
    active,
    children,
    title,
  }: {
    onPress: () => void;
    active?: boolean;
    children: React.ReactNode;
    title: string;
  }) => (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="icon"
      className="h-8 w-8 shrink-0"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onPress}
      disabled={disabled}
      title={title}
    >
      {children}
    </Button>
  );

  return (
    <div className="tiptap-editor-root flex flex-col gap-1">
      <div className="bg-muted/40 flex flex-wrap items-center gap-0.5 rounded-t-md border border-b-0 border-input px-1 py-0.5">
        <Btn title="Negrito" active={editor.isActive("bold")} onPress={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="h-4 w-4" />
        </Btn>
        <Btn
          title="Itálico"
          active={editor.isActive("italic")}
          onPress={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </Btn>
        <Btn
          title="Riscado"
          active={editor.isActive("strike")}
          onPress={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="h-4 w-4" />
        </Btn>
        <Btn
          title="Citação"
          active={editor.isActive("blockquote")}
          onPress={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="h-4 w-4" />
        </Btn>
        <Btn
          title="Lista com marcadores"
          active={editor.isActive("bulletList")}
          onPress={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </Btn>
        <Btn
          title="Lista numerada"
          active={editor.isActive("orderedList")}
          onPress={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </Btn>
        <Btn
          title="Inserir link"
          active={editor.isActive("link")}
          onPress={() => {
            const prev = editor.getAttributes("link").href as string | undefined;
            const url = window.prompt("URL do link (https://…)", prev ?? "https://");
            if (url === null) return;
            const trimmed = url.trim();
            if (trimmed === "") {
              editor.chain().focus().extendMarkRange("link").unsetLink().run();
              return;
            }
            editor.chain().focus().extendMarkRange("link").setLink({ href: trimmed }).run();
          }}
        >
          <Link2 className="h-4 w-4" />
        </Btn>
        <div className="mx-1 h-5 w-px shrink-0 bg-border" />
        <Btn title="Desfazer" onPress={() => editor.chain().focus().undo().run()}>
          <Undo2 className="h-4 w-4" />
        </Btn>
        <Btn title="Refazer" onPress={() => editor.chain().focus().redo().run()}>
          <Redo2 className="h-4 w-4" />
        </Btn>
      </div>
      <EditorContent editor={editor} className="rounded-b-md border border-input" />
      <p className="text-muted-foreground text-xs">
        Editor de texto rico gratuito (Tiptap, licença MIT). Formatação básica; o HTML é sanitizado ao guardar.
      </p>
    </div>
  );
}
