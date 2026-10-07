import React, { useEffect, useState } from 'react';
import { healthService } from '../../services';
import type { HealthStatus } from '../../types';

export const SystemStatusBadge: React.FC = () => {
  const [health, setHealth] = useState<HealthStatus | null>(null);

  useEffect(() => {
    const fetchHealth = () => {
      healthService.checkHealth().then(setHealth).catch(() => {});
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  const isOk = health?.status === 'ok';

  return (
    <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-100 px-3 py-1 rounded-md border border-slate-200">
      <span className={`w-2 h-2 rounded-full ${isOk ? 'bg-emerald-500' : 'bg-amber-500'}`} />
      <span className="font-medium hidden sm:inline text-slate-700">System:</span>
      <span className="text-slate-900 font-semibold">{isOk ? 'Operational' : 'Degraded'}</span>
    </div>
  );
};
