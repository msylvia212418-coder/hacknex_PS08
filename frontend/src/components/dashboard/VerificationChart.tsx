import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

export const VerificationChart: React.FC = () => {
  const pieData = [
    { name: 'Verified', value: 31, color: '#10B981' },
    { name: 'Partially Verified', value: 8, color: '#FDC500' },
    { name: 'Refuted', value: 7, color: '#F43F5E' },
    { name: 'Unverified / Insufficient', value: 2, color: '#94A3B8' }
  ];

  const barData = [
    { category: 'Revenue & Geo', verified: 14, refuted: 2 },
    { category: 'Temporal Trends', verified: 8, refuted: 1 },
    { category: 'Product Pricing', verified: 5, refuted: 3 },
    { category: 'Returns & Quality', verified: 4, refuted: 1 }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Pie Chart: Outcomes */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <h4 className="font-bold text-slate-900 text-sm mb-1">Verification Outcomes Breakdown</h4>
        <p className="text-xs text-slate-500 mb-4">Distribution across 48 automated verification analyses</p>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={4}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#00296B', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '12px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-slate-600 mt-2">
          {pieData.map((d, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
              <span>{d.name} ({d.value})</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bar Chart: By Category */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <h4 className="font-bold text-slate-900 text-sm mb-1">Claim Verdicts by Category</h4>
        <p className="text-xs text-slate-500 mb-4">Comparison of verified vs refuted claims per domain</p>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
              <Tooltip contentStyle={{ backgroundColor: '#00296B', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
              <Bar dataKey="verified" name="Verified" fill="#00509D" radius={[4, 4, 0, 0]} />
              <Bar dataKey="refuted" name="Refuted" fill="#FDC500" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-6 text-xs font-semibold text-slate-600 mt-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00509D]" />
            <span>Verified</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FDC500]" />
            <span>Refuted / Partial</span>
          </div>
        </div>
      </div>
    </div>
  );
};
