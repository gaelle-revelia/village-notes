import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";

interface MemoDatePickerProps {
  date: Date;
  onDateChange: (date: Date) => void;
  showLabel?: boolean;
}

export function MemoDatePicker({ date, onDateChange, showLabel = true }: MemoDatePickerProps) {
  return (
    <div className="space-y-1.5">
      {showLabel && <Label>Date</Label>}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(255,255,255,0.52)",
              border: "1px solid rgba(255,255,255,0.72)",
              borderRadius: 12,
              padding: "11px 13px",
              fontSize: 14,
              fontFamily: "'DM Sans', sans-serif",
              color: "#1E1A1A",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <CalendarIcon size={16} style={{ color: "#9A9490", flexShrink: 0 }} />
            {format(date, "PPP", { locale: fr })}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => d && onDateChange(d)}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
