import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-6">
      <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4 border border-amber-200 shadow-sm">
        <ShieldAlert className="w-8 h-8" />
      </div>

      <h1 className="text-3xl font-extrabold text-slate-900 mb-2">404 - Page Not Found</h1>
      <p className="text-xs text-slate-500 max-w-md mb-6 leading-relaxed">
        The requested verification route does not exist or has been moved within the audit pipeline.
      </p>

      <Link to="/">
        <Button variant="primary" icon={ArrowLeft}>
          Return to Dashboard
        </Button>
      </Link>
    </div>
  );
};
