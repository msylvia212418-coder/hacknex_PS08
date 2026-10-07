import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  badge?: string | number;
  icon?: React.ElementType;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange }) => {
  return (
    <div className="flex border-b border-slate-200 space-x-2">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 font-semibold text-sm border-b-2 transition-all cursor-pointer ${
              isActive
                ? 'border-[#00296B] text-[#00296B]'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            {Icon && <Icon className={`w-4 h-4 ${isActive ? 'text-[#00296B]' : 'text-slate-400'}`} />}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${isActive ? 'bg-[#00296B] text-white' : 'bg-slate-100 text-slate-600'}`}>
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
