import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  Database,
  Sparkles,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Menu,
  X
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/datasets', label: 'Datasets', icon: Database },
    { to: '/analyze', label: 'Analyses', icon: Sparkles },
    { to: '/history', label: 'History', icon: History },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile top toggle button */}
      <div className="md:hidden fixed top-3 left-4 z-50">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg bg-[#0F172A] text-white shadow-md hover:bg-slate-800 transition-colors"
          aria-label="Toggle navigation"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Backdrop for mobile */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 md:hidden"
        />
      )}

      {/* Main Sidebar */}
      <aside
        className={`bg-[#0F172A] text-white flex flex-col transition-all duration-300 z-40 border-r border-slate-800 fixed md:static inset-y-0 left-0 ${
          mobileOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'
        } ${collapsed ? 'md:w-20' : 'md:w-64'}`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
          {(!collapsed || mobileOpen) ? (
            <NavLink to="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black shadow-sm group-hover:bg-blue-500 transition-colors">
                <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <div className="font-extrabold text-base tracking-tight leading-none text-white">
                  VERIPROOF
                </div>
                <div className="text-[10px] text-slate-400 font-medium tracking-wide uppercase mt-0.5">
                  Proof Data Analyst
                </div>
              </div>
            </NavLink>
          ) : (
            <NavLink to="/" className="mx-auto w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white">
              <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
            </NavLink>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs font-bold'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`
                }
                title={collapsed && !mobileOpen ? item.label : undefined}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {(!collapsed || mobileOpen) && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </div>

        {/* Footer info */}
        {(!collapsed || mobileOpen) && (
          <div className="p-3 bg-slate-950/60 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span className="text-slate-300 font-medium flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" /> Evidence API
            </span>
            <span className="font-mono text-[10px] text-slate-500">/verify</span>
          </div>
        )}
      </aside>
    </>
  );
};
