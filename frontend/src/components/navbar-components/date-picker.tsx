"use client";

import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function DatePicker() {
  const [date, setDate] = useState<DateRange | undefined>();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          className="group w-full justify-between border-input bg-background px-3 font-normal text-sm outline-none outline-offset-0 focus-visible:outline-[3px]"
          size="sm"
          variant="outline"
        >
          <CalendarIcon
            aria-hidden="true"
            className="-ms-1 shrink-0 text-muted-foreground/80 transition-colors"
            size={16}
          />
          <span className={cn("truncate", !date && "font-medium")}>
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} -{" "}
                  {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              "Date"
            )}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-2">
        <Calendar mode="range" onSelect={setDate} selected={date} />
      </PopoverContent>
    </Popover>
  );
}
