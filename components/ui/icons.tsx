"use client";

import {
  Sparkles,
  Send,
  RefreshCw,
  CheckCircle,
  Clock,
  XCircle,
  FileText,
  BarChart3,
  MessageCircle,
  Pencil,
  Plus,
  ChevronUp,
  ChevronDown,
  Facebook,
  Instagram,
  MoreHorizontal,
  ArrowRight,
  Users,
  Trash2,
  Image,
  Search,
  ClipboardList,
  Loader2,
  Sun,
  Moon,
  Upload,
  Check,
  AlertCircle,
  X,
  LayoutGrid,
  Sheet,
} from "lucide-react";

type IconProps = {
  className?: string;
};

export function SparklesIcon({ className = "w-4 h-4" }: IconProps) {
  return <Sparkles className={className} />;
}

export function SendIcon({ className = "w-4 h-4" }: IconProps) {
  return <Send className={className} />;
}

export function RefreshIcon({ className = "w-3.5 h-3.5" }: IconProps) {
  return <RefreshCw className={className} />;
}

export function CheckCircleIcon({ className = "w-4 h-4" }: IconProps) {
  return <CheckCircle className={className} />;
}

export function ClockIcon({ className = "w-4 h-4" }: IconProps) {
  return <Clock className={className} />;
}

export function XCircleIcon({ className = "w-4 h-4" }: IconProps) {
  return <XCircle className={className} />;
}

export function DocumentIcon({ className = "w-4 h-4" }: IconProps) {
  return <FileText className={className} />;
}

export function ChartBarIcon({ className = "w-4 h-4" }: IconProps) {
  return <BarChart3 className={className} />;
}

export function ChatBubbleIcon({ className = "w-4 h-4" }: IconProps) {
  return <MessageCircle className={className} />;
}

export function PencilIcon({ className = "w-4 h-4" }: IconProps) {
  return <Pencil className={className} />;
}

export function PlusIcon({ className = "w-4 h-4" }: IconProps) {
  return <Plus className={className} />;
}

export function ChevronUpIcon({ className = "w-4 h-4" }: IconProps) {
  return <ChevronUp className={className} />;
}

export function ChevronDownIcon({ className = "w-4 h-4" }: IconProps) {
  return <ChevronDown className={className} />;
}

export function FacebookIcon({ className = "w-4 h-4" }: IconProps) {
  return <Facebook className={className} />;
}

export function InstagramIcon({ className = "w-4 h-4" }: IconProps) {
  return <Instagram className={className} />;
}

export function ThreadsIcon({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path d="M12 2.2c-5.2 0-8.6 3.3-8.6 8.4 0 5.1 3.4 8.4 8.6 8.4 4.4 0 7.3-2.2 7.3-5.7 0-2.8-1.8-4.7-4.5-4.7-2.3 0-3.8 1.4-3.8 3.3 0 1.7 1.2 2.9 3 2.9 1.4 0 2.4-.8 2.8-2.2.1.3.1.6.1.9 0 2.4-2 4-5 4-3.9 0-6.4-2.5-6.4-6.3S8 4.7 12 4.7c2.8 0 4.6 1.3 5.4 3.6h2.2C18.8 4.7 15.9 2.2 12 2.2z" />
    </svg>
  );
}

export function PoolIcon({ className = "w-4 h-4" }: IconProps) {
  return <Sheet className={className} />;
}

export function UploadIcon({ className = "w-4 h-4" }: IconProps) {
  return <Upload className={className} />;
}

export function TrashIcon({ className = "w-4 h-4" }: IconProps) {
  return <Trash2 className={className} />;
}

export function PhotoIcon({ className = "w-4 h-4" }: IconProps) {
  return <Image className={className} />;
}

export function MagnifyingGlassIcon({ className = "w-4 h-4" }: IconProps) {
  return <Search className={className} />;
}

export function ClipboardDocumentIcon({ className = "w-4 h-4" }: IconProps) {
  return <ClipboardList className={className} />;
}

export function UsersIcon({ className = "w-4 h-4" }: IconProps) {
  return <Users className={className} />;
}

export function EllipsisHorizontalIcon({ className = "w-4 h-4" }: IconProps) {
  return <MoreHorizontal className={className} />;
}

export function ArrowRightIcon({ className = "w-4 h-4" }: IconProps) {
  return <ArrowRight className={className} />;
}

export function Spinner({ className = "w-4 h-4" }: IconProps) {
  return <Loader2 className={`${className} animate-spin`} />;
}

export function AlertCircleIcon({ className = "w-4 h-4" }: IconProps) {
  return <AlertCircle className={className} />;
}

export function XIcon({ className = "w-4 h-4" }: IconProps) {
  return <X className={className} />;
}

export function CheckIcon({ className = "w-4 h-4" }: IconProps) {
  return <Check className={className} />;
}

export function SunIcon({ className = "w-4 h-4" }: IconProps) {
  return <Sun className={className} />;
}

export function MoonIcon({ className = "w-4 h-4" }: IconProps) {
  return <Moon className={className} />;
}

export function LayoutGridIcon({ className = "w-4 h-4" }: IconProps) {
  return <LayoutGrid className={className} />;
}
