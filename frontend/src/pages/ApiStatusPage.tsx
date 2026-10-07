import React, { useEffect, useState } from 'react';
import { healthService } from '../services';
import type { HealthStatus } from '../types';
import { Server, CheckCircle2, RefreshCw, ShieldCheck, Database } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const ApiStatusPage: React.FC = () => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkStatus = () => {
    setIsChecking(true);
    healthService.checkHealth().then(res => {
      setHealth(res);
      setIsChecking(false);
    }).catch(() => setIsChecking(false));
  };

  useEffect(() => {
    let active = true;
    void healthService.checkHealth().then((res) => {
      if (active) setHealth(res);
    }).catch(() => {
      if (active) setHealth(null);
    });
    return () => { active = false; };
  }, []);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Server className="w-6 h-6 text-[#00296B]" /> System & API Status
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor the FastAPI service and Supabase database used by verification
          </p>
        </div>

        <Button variant="outline" size="sm" icon={RefreshCw} isLoading={isChecking} onClick={checkStatus}>
          Re-check Status
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="font-bold text-slate-900 text-sm">Frontend UI Shell</div>
              <div className="text-slate-500">React + Vite + TypeScript</div>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full font-bold bg-emerald-100 text-emerald-800">
            CONNECTED
          </span>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700"><ShieldCheck className="w-6 h-6" /></div>
            <div><div className="font-bold text-slate-900 text-sm">Verification endpoint</div><div className="text-slate-500">POST /verify</div></div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 font-bold">{health?.apiConnected ? 'AVAILABLE' : 'WAITING'}</span>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${health?.apiConnected ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
              <Server className="w-6 h-6" />
            </div>
            <div>
              <div className="font-bold text-slate-900 text-sm">FastAPI Backend (/health)</div>
              <div className="text-slate-500">{health?.apiConnected ? 'Online at http://localhost:8000' : 'Simulated / Not Connected'}</div>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-full font-bold ${
            health?.apiConnected ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
          }`}>
            {health?.apiConnected ? 'CONNECTED' : 'DEMO MODE'}
          </span>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${health?.dbConnected ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="font-bold text-slate-900 text-sm">Supabase Database (/health/db)</div>
              <div className="text-slate-500">{health?.dbConnected ? 'Database online' : 'Simulated / Not Connected'}</div>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-full font-bold ${
            health?.dbConnected ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
          }`}>
            {health?.dbConnected ? 'CONNECTED' : 'DEMO MODE'}
          </span>
        </div>
      </div>
    </div>
  );
};
