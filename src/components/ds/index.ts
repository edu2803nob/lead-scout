/**
 * LeadHunter Design System — single entry point for UI building blocks.
 *
 * Import visual components from here (`@/components/ds`) so there is exactly
 * one implementation of each pattern across the app.
 */

// Primitives (shadcn-based, themed via src/styles.css tokens)
export { Button, buttonVariants, type ButtonProps } from "@/components/ui/button";
export { Input } from "@/components/ui/input";
export { Textarea } from "@/components/ui/textarea";
export { Label } from "@/components/ui/label";
export { Badge, badgeVariants, type BadgeProps } from "@/components/ui/badge";
export { Separator } from "@/components/ui/separator";
export { Skeleton } from "@/components/ui/skeleton";
export { Switch } from "@/components/ui/switch";
export { Checkbox } from "@/components/ui/checkbox";
export { Progress } from "@/components/ui/progress";

export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
export { Toaster } from "@/components/ui/sonner";
/** Toast entry point — always use this one. */
export { toast } from "sonner";

// State views
export { EmptyState, ErrorState, LoadingState } from "@/components/common/StateViews";

// Domain-aware components
export { ScoreBadge, type ScoreBadgeProps } from "@/components/ds/ScoreBadge";
export { StatusBadge, LEAD_STATUS_CLASSES, type StatusBadgeProps } from "@/components/ds/StatusBadge";
export { LeadCard, type LeadCardProps } from "@/components/ds/LeadCard";
export { DataPagination, type DataPaginationProps } from "@/components/ds/DataPagination";

// Score presentation rules
export {
  SCORE_BANDS,
  SCORE_BAND_CLASSES,
  SCORE_BAND_LABELS,
  clampScore,
  getScoreBand,
  getScoreLabel,
  type ScoreBand,
} from "@/lib/design/score";
