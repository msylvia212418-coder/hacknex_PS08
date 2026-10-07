import { Link } from 'react-router-dom';
import { ArrowRight, History } from 'lucide-react';
import { Button } from '../components/ui/Button';

export function HistoryPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900">
          <History className="h-6 w-6 text-[#00296B]" /> Verification History
        </h2>
        <p className="mt-1 text-xs text-slate-500">The current verification API does not persist runs.</p>
      </div>
      <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="font-bold text-slate-900">No saved verification runs</p>
        <p className="mt-2 text-sm text-slate-500">Each `/verify` result is displayed after computation and is not stored for later history.</p>
        <Link to="/analyze" className="mt-5 inline-flex">
          <Button icon={ArrowRight}>Verify a claim</Button>
        </Link>
      </section>
    </div>
  );
}
