import { Link } from 'react-router-dom';
import { Upload, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const DashboardPage = () => {
  return (
    <div className="space-y-10 max-w-5xl mx-auto py-4">
      {/* Brand Header */}
      <div>
        <div className="flex items-center gap-2 text-blue-600 font-extrabold text-sm tracking-wider uppercase mb-1">
          <ShieldCheck className="w-4 h-4 stroke-[2.5]" /> VERIPROOF
        </div>
        <p className="text-slate-500 font-medium text-sm sm:text-base">
          Verify analytical answers before you trust them.
        </p>
      </div>

      {/* Hero Card */}
      <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/80 shadow-sm relative overflow-hidden">
        <div className="max-w-2xl space-y-6">
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            Turn data questions into verified answers.
          </h1>

          <p className="text-slate-600 text-base sm:text-lg font-normal leading-relaxed">
            Load a READY dataset, ask a question, and verify its claim through proof obligations, deterministic computation, independent verification, and a release gate.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link to="/datasets/upload">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl shadow-xs flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload Dataset
              </Button>
            </Link>

            <Link to="/analyze">
              <Button
                size="lg"
                variant="outline"
                className="bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-300 font-semibold px-6 py-3 rounded-xl flex items-center gap-2"
              >
                <Sparkles className="w-5 h-5 text-blue-600" />
                Start Analysis
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Analyses Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Recent Analyses
          </h2>
          <Link to="/history" className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
            View all history <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <p className="font-bold text-slate-900 text-sm">No saved verification runs</p>
          <p className="text-xs text-slate-500">The current /verify endpoint returns results but does not persist analysis history.</p>
          <Link to="/analyze">
            <Button size="sm" variant="outline" className="w-full text-xs font-semibold justify-center mt-2">
              Verify a claim
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
