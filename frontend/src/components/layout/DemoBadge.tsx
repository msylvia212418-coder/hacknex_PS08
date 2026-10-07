import React from 'react';
import { getDemoModeSetting } from '../../config/env';

export const DemoBadge: React.FC = () => {
  const isDemo = getDemoModeSetting();

  if (!isDemo) return null;

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300 shadow-xs" title="Running in deterministic offline Demo Mode">
      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
      <span>DEMO MODE</span>
    </div>
  );
};
