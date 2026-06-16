"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { ScrollArea } from "~/components/ui/scroll-area";
import { cn } from "~/lib/utils";
import { currencies } from "~/types/currencies";

interface CurrencyComboboxProps {
  value: string;
  onChange: (code: string) => void;
}

export function CurrencyCombobox({ value, onChange }: CurrencyComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = currencies.find(c => c.code === value);
  const q = query.trim().toLowerCase();
  const filtered = q
    ? currencies.filter(
        c =>
          c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
      )
    : currencies;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-10 w-full justify-between font-normal"
        >
          {selected ? `${selected.code} — ${selected.name}` : value || "Select currency"}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search currency or code…"
            className="h-10 border-0 px-0 shadow-none focus-visible:ring-0"
            autoFocus
          />
        </div>
        <ScrollArea className="h-64">
          {filtered.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">
              No currency found.
            </p>
          ) : (
            <div className="p-1">
              {filtered.map(c => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => {
                    onChange(c.code);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-sm px-2 py-2 text-sm hover:bg-accent hover:text-accent-foreground",
                    c.code === value && "bg-accent/50"
                  )}
                >
                  <span>
                    <span className="font-medium">{c.code}</span>
                    <span className="ml-2 text-muted-foreground">{c.name}</span>
                  </span>
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <span>{c.symbol}</span>
                    {c.code === value && <Check className="h-4 w-4" />}
                  </span>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
