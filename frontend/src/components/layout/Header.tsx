import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { SystemStatusBadge } from './SystemStatusBadge';
import { LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../auth/useAuth';
import { useState } from 'react';

export const Header: React.FC = () => {
  const location = useLocation();
  const { session, signOut } = useAuth();
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const userEmail = session?.user.email || 'Signed in';

  const getPageTitle = (path: string) => {
    if (path === '/' || path === '/dashboard') return 'Home';
    if (path === '/datasets/upload') return 'Upload Dataset';
    if (path === '/datasets/ready') return 'Dataset Ready';
    if (path.startsWith('/datasets')) return 'Datasets';
    if (path.startsWith('/analyze')) return 'Verify Answer';
    if (path.startsWith('/analysis')) return 'Verification Result';
    if (path === '/history') return 'Analysis History';
    if (path === '/settings') return 'Settings';
    if (path === '/api-status') return 'API & Backend Status';
    return 'VERIPROOF Analyst';
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20 shadow-2xs">
      <div className="flex items-center gap-3 pl-10 md:pl-0">
        <Link to="/" className="md:hidden flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white">
            <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
          </div>
          <span className="font-extrabold text-sm tracking-tight text-slate-900">VERIPROOF</span>
        </Link>
        <h1 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
          {getPageTitle(location.pathname)}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:block">
          <SystemStatusBadge />
        </div>

        <div className="h-5 w-px bg-slate-200 hidden sm:block" />

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#0F172A] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
            {userEmail.slice(0, 2).toUpperCase()}
          </div>
          <div className="hidden lg:block text-left">
            <div className="text-xs font-bold text-slate-900 leading-tight">{userEmail}</div>
            <div className="text-[10px] text-slate-500 font-medium">Supabase Auth</div>
          </div>
          <button
            type="button"
            onClick={() => void signOut().catch((error: unknown) => setSignOutError(error instanceof Error ? error.message : 'Sign out failed.'))}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Sign out"
            title={signOutError || 'Sign out'}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
