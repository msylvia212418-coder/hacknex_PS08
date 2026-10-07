import React from 'react';
import type { VerdictType } from '../../types';
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle, AlertCircle } from 'lucide-react';

interface VerdictBadgeProps {
  verdict: VerdictType;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const VerdictBadge: React.FC<VerdictBadgeProps> = ({
  verdict,
  size = 'md',
  showIcon = true
}) => {
  const getConfig = (v: VerdictType) => {
    switch (v) {
      case 'VERIFIED':
        return {
          label: 'VERIFIED',
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
          icon: CheckCircle2,
          iconColor: 'text-emerald-600'
        };
      case 'PARTIALLY_VERIFIED':
        return {
          label: 'PARTIALLY VERIFIED',
          bg: 'bg-amber-50 text-amber-800 border-amber-300',
          icon: AlertTriangle,
          iconColor: 'text-amber-600'
        };
      case 'UNVERIFIED':
        return {
          label: 'UNVERIFIED',
          bg: 'bg-slate-100 text-slate-800 border-slate-300',
          icon: HelpCircle,
          iconColor: 'text-slate-600'
        };
      case 'REFUTED':
        return {
          label: 'REFUTED',
          bg: 'bg-rose-50 text-rose-800 border-rose-300',
          icon: XCircle,
          iconColor: 'text-rose-600'
        };
      case 'INSUFFICIENT_EVIDENCE':
        return {
          label: 'INSUFFICIENT EVIDENCE',
          bg: 'bg-amber-50 text-amber-900 border-amber-300',
          icon: AlertCircle,
          iconColor: 'text-amber-700'
        };
      default:
        return {
          label: v,
          bg: 'bg-slate-100 text-slate-700 border-slate-300',
          icon: HelpCircle,
          iconColor: 'text-slate-500'
        };
    }
  };

  const config = getConfig(verdict);
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1 font-bold',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-bold',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-extrabold tracking-wide'
  }[size];

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  }[size];

  return (
    <span className={`inline-flex items-center rounded-full border shadow-2xs ${config.bg} ${sizeClasses}`}>
      {showIcon && <Icon className={`${iconSizes} ${config.iconColor} shrink-0`} />}
      <span>{config.label}</span>
    </span>
  );
};
