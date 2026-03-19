import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  autoResize?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, autoResize, onInput, ...props }, ref) => {
    const innerRef = React.useRef<HTMLTextAreaElement | null>(null);

    const setHeight = (el: HTMLTextAreaElement) => {
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    };

    const mergedRef = React.useCallback(
      (node: HTMLTextAreaElement | null) => {
        innerRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
        if (node && autoResize) setHeight(node);
      },
      [ref, autoResize]
    );

    const handleInput = React.useCallback(
      (e: React.FormEvent<HTMLTextAreaElement>) => {
        if (autoResize) setHeight(e.currentTarget);
        onInput?.(e);
      },
      [autoResize, onInput]
    );

    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-4/5 ml-auto rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-normal",
          autoResize && "overflow-hidden resize-none",
          className
        )}
        ref={mergedRef}
        onInput={handleInput}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
