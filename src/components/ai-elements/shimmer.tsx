"use client";

import { cn } from "@/lib/utils";
import type { MotionProps } from "motion/react";
import { motion } from "motion/react";
import type { CSSProperties, ElementType } from "react";
import { memo, useMemo } from "react";

type MotionHTMLProps = MotionProps & Record<string, unknown>;

// Pre-create motion components at module level to satisfy the React Compiler rule
// that forbids creating or selecting component types inside render.
const MotionP = motion.create("p") as React.ComponentType<MotionHTMLProps>;
const MotionSpan = motion.create("span") as React.ComponentType<MotionHTMLProps>;
const MotionDiv = motion.create("div") as React.ComponentType<MotionHTMLProps>;
const MotionH1 = motion.create("h1") as React.ComponentType<MotionHTMLProps>;
const MotionH2 = motion.create("h2") as React.ComponentType<MotionHTMLProps>;
const MotionH3 = motion.create("h3") as React.ComponentType<MotionHTMLProps>;

export interface TextShimmerProps {
  children: string;
  as?: ElementType;
  className?: string;
  duration?: number;
  spread?: number;
}

const ShimmerComponent = ({
  children,
  as: Component = "p",
  className,
  duration = 2,
  spread = 2,
}: TextShimmerProps) => {
  const dynamicSpread = useMemo(
    () => (children?.length ?? 0) * spread,
    [children, spread]
  );

  const sharedProps: MotionHTMLProps = {
    animate: { backgroundPosition: "0% center" },
    className: cn(
      "relative inline-block bg-[length:250%_100%,auto] bg-clip-text text-transparent",
      "[--bg:linear-gradient(90deg,#0000_calc(50%-var(--spread)),var(--color-background),#0000_calc(50%+var(--spread)))] [background-repeat:no-repeat,padding-box]",
      className
    ),
    initial: { backgroundPosition: "100% center" },
    style: {
      "--spread": `${dynamicSpread}px`,
      backgroundImage:
        "var(--bg), linear-gradient(var(--color-muted-foreground), var(--color-muted-foreground))",
    } as CSSProperties,
    transition: {
      duration,
      ease: "linear",
      repeat: Number.POSITIVE_INFINITY,
    },
  };

  if (Component === "span") return <MotionSpan {...sharedProps}>{children}</MotionSpan>;
  if (Component === "div") return <MotionDiv {...sharedProps}>{children}</MotionDiv>;
  if (Component === "h1") return <MotionH1 {...sharedProps}>{children}</MotionH1>;
  if (Component === "h2") return <MotionH2 {...sharedProps}>{children}</MotionH2>;
  if (Component === "h3") return <MotionH3 {...sharedProps}>{children}</MotionH3>;
  return <MotionP {...sharedProps}>{children}</MotionP>;
};

export const Shimmer = memo(ShimmerComponent);
