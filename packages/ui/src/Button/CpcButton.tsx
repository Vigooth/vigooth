import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../utils/cn";

export type CpcColor = "green" | "cyan" | "red" | "yellow" | "magenta" | "blue" | "orange";
export type CpcVariant = "outlined" | "filled" | "text";
export type CpcSize = "xs" | "sm" | "md" | "lg" | "xl";

interface CpcButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: CpcVariant;
  color?: CpcColor;
  size?: CpcSize;
}

const colorMap = {
  green: { base: "#00FF00", dark: "#008000" },
  cyan: { base: "#00FFFF", dark: "#008080" },
  red: { base: "#FF0000", dark: "#800000" },
  yellow: { base: "#FFFF00", dark: "#808000" },
  magenta: { base: "#FF00FF", dark: "#800080" },
  blue: { base: "#0000FF", dark: "#000080" },
  orange: { base: "#FF8000", dark: "#804000" },
};

const variantClass: Record<CpcVariant, string> = {
  outlined: "cpc-btn-outlined",
  filled: "cpc-btn-filled",
  text: "cpc-btn-text",
};

const sizeClass: Record<CpcSize, string> = {
  xs: "cpc-btn-xs",
  sm: "cpc-btn-sm",
  md: "cpc-btn-md",
  lg: "cpc-btn-lg",
  xl: "cpc-btn-xl",
};

export function CpcButton({
  children,
  variant = "outlined",
  color = "green",
  size = "sm",
  className,
  style,
  ...props
}: CpcButtonProps) {
  const c = colorMap[color];

  return (
    <button
      className={cn("cpc-btn", variantClass[variant], sizeClass[size], className)}
      style={
        {
          "--btn-color": c.base,
          "--btn-dark": c.dark,
          ...style,
        } as React.CSSProperties
      }
      {...props}
    >
      {children}
    </button>
  );
}
