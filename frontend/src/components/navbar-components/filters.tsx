import { ListFilterIcon } from "lucide-react";
import { useId } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function Component() {
  const id = useId();
  return (
    <div className="flex flex-col gap-4">
      <Popover>
        <PopoverTrigger asChild>
          <Button className="text-sm" size="sm" variant="outline">
            <ListFilterIcon
              aria-hidden="true"
              className="-ms-1 text-muted-foreground/80"
              size={16}
            />
            Filters
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-36 p-3">
          <div className="space-y-3">
            <div className="font-medium text-xs">Filters</div>
            <form>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox id={`${id}-1`} />
                  <Label className="font-normal" htmlFor={`${id}-1`}>
                    Real Time
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id={`${id}-2`} />
                  <Label className="font-normal" htmlFor={`${id}-2`}>
                    Top Channels
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id={`${id}-3`} />
                  <Label className="font-normal" htmlFor={`${id}-3`}>
                    Last Orders
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id={`${id}-4`} />
                  <Label className="font-normal" htmlFor={`${id}-4`}>
                    Total Spent
                  </Label>
                </div>
              </div>
              <div
                aria-orientation="horizontal"
                className="-mx-3 my-3 h-px bg-border"
                role="separator"
                tabIndex={-1}
              />
              <div className="flex justify-between gap-2">
                <Button className="h-7 px-2" size="sm" variant="outline">
                  Clear
                </Button>
                <Button className="h-7 px-2" size="sm">
                  Apply
                </Button>
              </div>
            </form>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
