import React from 'react';
import { Database, Sparkles, CheckCircle2, ShieldCheck, ShieldAlert } from 'lucide-react';

export const KPISection: React.FC = () => {
  const kpis = [
    { label: 'Datasets', value: '12', subtitle: '1.05M active rows', icon: Database, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Analyses', value: '48', subtitle: 'Audit pipelines run', icon: Sparkles, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Verified Claims', value: '31', subtitle: '100% auditable proof', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Evidence Checks', value: '186', subtitle: 'Slices extracted', icon: ShieldCheck, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Claims Refuted', value: '7', subtitle: 'Counterexamples found', icon: ShieldAlert, color: 'text-rose-600', bg: 'bg-rose-50' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {kpis.map((kpi, idx) => {
        const Icon = kpi.icon;
        return (
          <div key={idx} className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:shadow-xs transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{kpi.label}</span>
              <div className={`p-2 rounded-lg ${kpi.bg}`}>
                <Icon className={`w-4 h-4 ${kpi.color}`} />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-slate-900 mt-2">{kpi.value}</div>
            <div className="text-[11px] text-slate-500 mt-1 font-medium">{kpi.subtitle}</div>
          </div>
        );
      })}
    </div>
  );
};
