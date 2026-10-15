"use client";

import { useState, useRef, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
  suggestions?: string[];
}

export function TagInput({ value, onChange, placeholder, className, suggestions = [] }: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredSuggestions = inputValue.trim().length > 0
    ? suggestions
        .filter(
          (s) =>
            s.toLowerCase().includes(inputValue.toLowerCase()) &&
            !value.includes(s)
        )
        .slice(0, 8)
    : [];

  const isDropdownOpen = showSuggestions && filteredSuggestions.length > 0;

  function addTag(tag?: string) {
    const trimmed = (tag ?? inputValue).trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInputValue("");
    setActiveIndex(-1);
    setShowSuggestions(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, filteredSuggestions.length - 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, -1));
      return;
    }
    if (event.key === "Escape") {
      setShowSuggestions(false);
      setActiveIndex(-1);
      return;
    }
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      if (isDropdownOpen && activeIndex >= 0) {
        addTag(filteredSuggestions[activeIndex]);
      } else {
        addTag();
      }
      return;
    }
    if (event.key === "Backspace" && !inputValue && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className="relative">
      <div
        className={cn(
          "flex flex-wrap gap-1.5 rounded-lg border border-sky-200/80 dark:border-sky-800/70 bg-card/60 dark:bg-card/40 px-3 py-2 min-h-10 focus-within:ring-2 focus-within:ring-sky-400/40 focus-within:border-sky-400 cursor-text transition-all",
          className
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1 pr-1 text-xs shrink-0 bg-sky-50/90 text-sky-700 border-sky-200/80 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/60">
            {tag}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(value.filter((t) => t !== tag)); }}
              className="hover:text-destructive transition-colors ml-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowSuggestions(true);
            setActiveIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => {
            // Delay so click on suggestion fires first
            setTimeout(() => setShowSuggestions(false), 150);
          }}
          placeholder={value.length === 0 ? placeholder : ""}
          className="flex-1 min-w-24 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      {isDropdownOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-sky-200/80 dark:border-sky-800/80 bg-popover/95 backdrop-blur-md shadow-[0_8px_24px_rgba(14,165,233,0.12)]">
          <ul className="py-1 max-h-48 overflow-y-auto">
            {filteredSuggestions.map((suggestion, index) => (
              <li
                key={suggestion}
                onMouseDown={() => addTag(suggestion)}
                className={cn(
                  "px-3 py-1.5 text-sm cursor-pointer transition-colors",
                  index === activeIndex
                    ? "bg-sky-100/80 text-sky-950 dark:bg-sky-950/60 dark:text-sky-100"
                    : "hover:bg-sky-50 dark:hover:bg-sky-950/40"
                )}
              >
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
