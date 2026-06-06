export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
} as const;

export const staggerContainer = {
  initial: { opacity: 0 },
  whileInView: { opacity: 1 },
  viewport: { once: true },
  transition: { staggerChildren: 0.1 },
} as const;

export function slideUp(delay: number = 0) {
  return {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.5, delay, ease: "easeOut" as const },
  } as const;
}

export function slideUpStagger(index: number, staggerDelay: number = 0.1) {
  return slideUp(index * staggerDelay);
}

export function useAnimationProps<T extends Record<string, unknown>>(
  prefersReducedMotion: boolean | null,
  props: T
): Partial<T> {
  if (prefersReducedMotion) return {} as Partial<T>;
  return props;
}
