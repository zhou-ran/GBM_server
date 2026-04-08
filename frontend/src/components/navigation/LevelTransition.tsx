import type { ReactNode } from 'react';

interface LevelTransitionProps {
  level: number;
  children: ReactNode;
}

export function LevelTransition({ level, children }: LevelTransitionProps) {
  return (
    <div key={level} className="flex flex-1 animate-level-enter overflow-hidden">
      {children}
    </div>
  );
}
