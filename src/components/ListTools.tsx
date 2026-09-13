import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./ui";
export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="search-input">
      <Search size={16} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
    </div>
  );
}
export function Pagination({
  page,
  total,
  pageSize = 10,
  onChange,
}: {
  page: number;
  total: number;
  pageSize?: number;
  onChange: (p: number) => void;
}) {
  const max = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="pagination">
      <span>
        {total
          ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`
          : "0 records"}
      </span>
      <div>
        <Button
          variant="small"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft size={15} />
        </Button>
        <span>
          Page {page} of {max}
        </span>
        <Button
          variant="small"
          disabled={page >= max}
          onClick={() => onChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight size={15} />
        </Button>
      </div>
    </div>
  );
}
