'use client';

import { motion } from 'framer-motion';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: boolean;
}

export function Skeleton({
  className = '',
  width = '100%',
  height = '1rem',
  rounded = true,
}: SkeletonProps) {
  return (
    <motion.div
      className={`animate-pulse bg-muted ${rounded ? 'rounded' : ''} ${className}`}
      style={{ width, height }}
      initial={{ opacity: 0.6 }}
      animate={{ opacity: [0.6, 1, 0.6] }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="space-y-4">
        <Skeleton height="1.5rem" width="60%" />
        <Skeleton height="1rem" width="100%" />
        <Skeleton height="1rem" width="80%" />
        <div className="flex space-x-2">
          <Skeleton height="2rem" width="4rem" />
          <Skeleton height="2rem" width="4rem" />
        </div>
      </div>
    </div>
  );
}

export function NavigationSkeleton() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center space-x-2">
          <Skeleton width="2rem" height="2rem" />
          <Skeleton width="5rem" height="1.5rem" />
        </div>
        <div className="flex items-center space-x-2">
          <Skeleton width="2.5rem" height="2.5rem" />
          <Skeleton width="2.5rem" height="2.5rem" />
        </div>
      </div>
    </header>
  );
}
