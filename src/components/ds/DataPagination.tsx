import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface DataPaginationProps {
  page: number;
  pageCount: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
  itemLabel?: string;
}

export function DataPagination({
  page,
  pageCount,
  total,
  onPageChange,
  className,
  itemLabel = "registro(s)",
}: DataPaginationProps) {
  const safePageCount = Math.max(1, pageCount);

  return (
    <nav
      aria-label="Paginação"
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between",
        className,
      )}
    >
      <p className="min-w-0 truncate text-sm text-muted-foreground">
        {total} {itemLabel} · página {page} de {safePageCount}
      </p>
      <div className="flex shrink-0 gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          <ChevronLeft className="size-4" />
          <span className="hidden sm:inline">Anterior</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= safePageCount}
          onClick={() => onPageChange(page + 1)}
        >
          <span className="hidden sm:inline">Próxima</span>
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </nav>
  );
}
