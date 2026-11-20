"use client";

import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export const GlassInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function GlassInput({ className, ...props }, ref) {
    return <input ref={ref} {...props} className={cn("field h-10 w-full px-3", className)} />;
  },
);

/** The one textarea recipe — inset field on glass, focus ring in accent, never a default UA box. */
export const GlassTextarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function GlassTextarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        {...props}
        className={cn("field w-full resize-none px-3 py-2.5 leading-relaxed placeholder:text-cream-2/70", className)}
      />
    );
  },
);
