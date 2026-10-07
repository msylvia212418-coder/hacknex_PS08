import React from 'react';
import type { AdversarialRefutation } from '../../types';
import { ShieldAlert, ShieldCheck, XCircle } from 'lucide-react';

interface RefutationPanelProps {
  refutation: AdversarialRefutation;
}

export const RefutationPanel: React.FC<RefutationPanelProps> = ({ refutation }) => {
  const survived = refutation.successfulRefutationsCount === 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
        <div>
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#00509D]" /> Adversarial Refutation Engine
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Searches for counterexamples and hostile edge-case conditions to disprove the claim
          </p>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
          survived
            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
            : 'bg-rose-100 text-rose-800 border border-rose-300'
        }`}>
          {survived ? 'ATTACKS SURVIVED' : 'COUNTEREXAMPLE FOUND'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5 text-xs">
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
          <div className="text-[10px] uppercase font-bold text-slate-400">Refutation Vectors Tested</div>
          <div className="text-xl font-extrabold text-slate-900 mt-1">{refutation.attemptsCount}</div>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
          <div className="text-[10px] uppercase font-bold text-slate-400">Successful Refutations</div>
          <div className={`text-xl font-extrabold mt-1 ${survived ? 'text-emerald-600' : 'text-rose-600'}`}>
            {refutation.successfulRefutationsCount}
          </div>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
          <div className="text-[10px] uppercase font-bold text-slate-400">Attack Verdict</div>
          <div className="text-xs font-bold text-slate-800 mt-2">{refutation.verdict}</div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-xs font-bold text-slate-700 uppercase tracking-wider text-[10px]">
          Automated Counter-Hypothesis Tests
        </div>

        {refutation.tests.map((t) => (
          <div key={t.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-slate-900">{t.hypothesis}</span>
              {t.counterExampleFound ? (
                <span className="inline-flex items-center gap-1 font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-[11px]">
                  <XCircle className="w-3.5 h-3.5 text-rose-600" /> Counterexample Found
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Refutation Failed
                </span>
              )}
            </div>

            <div className="text-slate-600 text-[11px] mt-1">
              <span className="font-semibold text-slate-700">Attack Execution: </span>
              {t.testPerformed}
            </div>

            <div className="text-slate-500 text-[11px] mt-1 bg-white p-2 rounded border border-slate-100">
              <span className="font-semibold text-slate-700">Finding: </span>
              {t.details}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
