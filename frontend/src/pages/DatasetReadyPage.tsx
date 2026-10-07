import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, Sparkles, ArrowRight, Database } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const DatasetReadyPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-xl mx-auto py-12 text-center space-y-8">
      {/* Big Success Icon & Title */}
      <div className="space-y-3">
        <div className="w-20 h-20 rounded-3xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-xs">
          <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          Your dataset is ready.
        </h1>
        <p className="text-slate-500 font-medium text-sm">
          VERIPROOF has ingested and profiled your data structure.
        </p>
      </div>

      {/* Summary Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 text-left shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-slate-500 uppercase">Dataset</span>
          </div>
          <span className="font-bold text-slate-900 text-sm font-mono">veriproof_combined_retail.csv</span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl">
            <div className="text-slate-400 font-bold uppercase text-[10px]">Rows</div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">1,048,575</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl">
            <div className="text-slate-400 font-bold uppercase text-[10px]">Columns</div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">13</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl">
            <div className="text-slate-400 font-bold uppercase text-[10px]">Data quality</div>
            <div className="text-sm font-bold text-emerald-600 mt-0.5">Good</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl">
            <div className="text-slate-400 font-bold uppercase text-[10px]">Status</div>
            <div className="text-sm font-bold text-emerald-600 mt-0.5">Ready to analyze</div>
          </div>
        </div>
      </div>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <Button
          size="lg"
          onClick={() => navigate('/analyze')}
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3 rounded-xl shadow-xs flex items-center justify-center gap-2"
        >
          <Sparkles className="w-5 h-5 text-amber-300" />
          Ask a Question
          <ArrowRight className="w-4 h-4" />
        </Button>

        <Link to="/datasets/ds-retail-001" className="w-full sm:w-auto">
          <Button
            size="lg"
            variant="outline"
            className="w-full text-slate-700 font-semibold px-6 py-3 rounded-xl border-slate-300 hover:bg-slate-50 justify-center"
          >
            View Dataset Details
          </Button>
        </Link>
      </div>
    </div>
  );
};
