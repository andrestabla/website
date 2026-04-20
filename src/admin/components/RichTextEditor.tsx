import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Color from '@tiptap/extension-color'
import TextStyle from '@tiptap/extension-text-style'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import {
    Bold,
    Italic,
    Underline as UnderlineIcon,
    List,
    ListOrdered,
    Heading1,
    Heading2,
    Link as LinkIcon,
    Image as ImageIcon,
    Type,
    Eraser,
    Undo,
    Redo,
} from 'lucide-react'

type RichTextEditorProps = {
    value: string
    onChange: (value: string) => void
    placeholder?: string
}

const MenuButton = ({
    onClick,
    active = false,
    disabled = false,
    children,
    title,
}: {
    onClick: () => void
    active?: boolean
    disabled?: boolean
    children: React.ReactNode
    title: string
}) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all ${active
                ? 'bg-brand-primary text-white shadow-md'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
            } disabled:opacity-30 disabled:pointer-events-none`}
    >
        {children}
    </button>
)

export function RichTextEditor({ value, onChange, placeholder = 'Escribe aquí...' }: RichTextEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-brand-primary underline font-bold cursor-pointer',
                },
            }),
            Image.configure({
                HTMLAttributes: {
                    class: 'max-w-full h-auto rounded-xl shadow-sm my-4',
                },
            }),
            TextStyle,
            Color,
            Placeholder.configure({
                placeholder,
                emptyEditorClass: 'is-editor-empty',
            }),
        ],
        content: value,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML())
        },
        editorProps: {
            attributes: {
                class: 'prose prose-slate max-w-none focus:outline-none min-h-[200px] px-5 py-4 text-sm font-medium text-slate-900',
            },
        },
    })

    if (!editor) return null

    const addLink = () => {
        const url = window.prompt('URL del enlace:')
        if (url) {
            editor.chain().focus().setLink({ href: url }).run()
        }
    }

    const addImage = () => {
        const url = window.prompt('URL de la imagen:')
        if (url) {
            editor.chain().focus().setImage({ src: url }).run()
        }
    }

    return (
        <div className="w-full bg-slate-50 border border-slate-200 rounded-xl overflow-hidden focus-within:bg-white focus-within:border-brand-primary focus-within:ring-4 focus-within:ring-brand-primary/5 transition-all duration-200">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-1 p-2 border-b border-slate-200 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
                <MenuButton
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    active={editor.isActive('bold')}
                    title="Negrita"
                >
                    <Bold className="w-4 h-4" />
                </MenuButton>
                <MenuButton
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    active={editor.isActive('italic')}
                    title="Itálica"
                >
                    <Italic className="w-4 h-4" />
                </MenuButton>
                <MenuButton
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    active={editor.isActive('underline')}
                    title="Subrayado"
                >
                    <UnderlineIcon className="w-4 h-4" />
                </MenuButton>

                <div className="w-px h-6 bg-slate-200 mx-1" />

                <MenuButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    active={editor.isActive('heading', { level: 1 })}
                    title="Título 1"
                >
                    <Heading1 className="w-4 h-4" />
                </MenuButton>
                <MenuButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    active={editor.isActive('heading', { level: 2 })}
                    title="Título 2"
                >
                    <Heading2 className="w-4 h-4" />
                </MenuButton>

                <div className="w-px h-6 bg-slate-200 mx-1" />

                <MenuButton
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    active={editor.isActive('bulletList')}
                    title="Lista de viñetas"
                >
                    <List className="w-4 h-4" />
                </MenuButton>
                <MenuButton
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    active={editor.isActive('orderedList')}
                    title="Lista numerada"
                >
                    <ListOrdered className="w-4 h-4" />
                </MenuButton>

                <div className="w-px h-6 bg-slate-200 mx-1" />

                <MenuButton
                    onClick={addLink}
                    active={editor.isActive('link')}
                    title="Insertar enlace"
                >
                    <LinkIcon className="w-4 h-4" />
                </MenuButton>
                <MenuButton
                    onClick={addImage}
                    title="Insertar imagen"
                >
                    <ImageIcon className="w-4 h-4" />
                </MenuButton>

                <div className="w-px h-6 bg-slate-200 mx-1" />

                <MenuButton
                    onClick={() => editor.chain().focus().setColor('#2563eb').run()}
                    active={editor.isActive('textStyle', { color: '#2563eb' })}
                    title="Color azul"
                >
                    <Type className="w-4 h-4 text-blue-600" />
                </MenuButton>
                
                <MenuButton
                    onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
                    title="Limpiar formato"
                >
                    <Eraser className="w-4 h-4" />
                </MenuButton>

                <div className="flex-1" />

                <MenuButton
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().undo()}
                    title="Deshacer"
                >
                    <Undo className="w-4 h-4" />
                </MenuButton>
                <MenuButton
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().redo()}
                    title="Rehacer"
                >
                    <Redo className="w-4 h-4" />
                </MenuButton>
            </div>

            {/* Editor Area */}
            <div className="relative">
                <EditorContent editor={editor} />
            </div>

            {/* Styles for Placeholder */}
            <style>{`
                .ProseMirror p.is-editor-empty:first-child::before {
                    content: attr(data-placeholder);
                    float: left;
                    color: #adb5bd;
                    pointer-events: none;
                    height: 0;
                }
                .ProseMirror {
                    min-height: 200px;
                    outline: none !important;
                }
                .ProseMirror ul {
                    list-style-type: disc;
                    padding-left: 1.5rem;
                }
                .ProseMirror ol {
                    list-style-type: decimal;
                    padding-left: 1.5rem;
                }
                .ProseMirror h1 {
                    font-size: 1.5rem;
                    font-weight: 800;
                    margin-bottom: 0.5rem;
                }
                .ProseMirror h2 {
                    font-size: 1.25rem;
                    font-weight: 700;
                    margin-bottom: 0.5rem;
                }
            `}</style>
        </div>
    )
}
