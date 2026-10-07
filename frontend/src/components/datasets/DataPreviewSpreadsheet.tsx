import React, { useState, useMemo } from 'react';
import { Search, ArrowUpDown, ChevronLeft, ChevronRight, Filter } from 'lucide-react';

interface DataPreviewSpreadsheetProps {
  rows: Record<string, any>[];
}

export const DataPreviewSpreadsheet: React.FC<DataPreviewSpreadsheetProps> = ({ rows }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const columns = rows?.[0] ? Object.keys(rows[0]) : [];

  const filteredRows = useMemo(() => {
    let result = [...(rows || [])];
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(row =>
        Object.values(row).some(val => String(val).toLowerCase().includes(q))
      );
    }
    if (sortColumn) {
      result.sort((a, b) => {
        const valA = a[sortColumn];
        const valB = b[sortColumn];
        if (valA < valB) return sortAsc ? -1 : 1;
        if (valA > valB) return sortAsc ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [rows, searchTerm, sortColumn, sortAsc]);

  if (!rows || rows.length === 0) {
    return <div className="p-8 text-center text-slate-500">No data preview rows available.</div>;
  }

  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;
  const paginatedRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSort = (col: string) => {
    if (sortColumn === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortColumn(col);
      setSortAsc(true);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
      {/* Controls Header */}
      <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search preview rows..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-4 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-[#00509D]"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-600">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <span>Showing {paginatedRows.length} of {filteredRows.length} preview rows</span>
        </div>
      </div>

      {/* Spreadsheet Table */}
      <div className="overflow-x-auto max-w-full">
        <table className="w-full text-left border-collapse font-mono text-xs">
          <thead>
            <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              {columns.map((col) => (
                <th
                  key={col}
                  onClick={() => handleSort(col)}
                  className="py-2.5 px-3 whitespace-nowrap cursor-pointer hover:bg-slate-200/60 transition-colors select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>{col}</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedRows.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-blue-50/40 transition-colors">
                {columns.map((col) => (
                  <td key={col} className="py-2 px-3 whitespace-nowrap text-slate-800 border-r border-slate-100 last:border-r-0">
                    {row[col] !== null && row[col] !== undefined ? (
                      String(row[col])
                    ) : (
                      <span className="text-amber-600 bg-amber-50 px-1 py-0.5 rounded font-sans text-[10px]">null</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
        <div>
          Page <span className="font-bold text-slate-900">{currentPage}</span> of <span className="font-bold text-slate-900">{totalPages}</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1 rounded bg-white border border-slate-300 disabled:opacity-40 hover:bg-slate-100"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1 rounded bg-white border border-slate-300 disabled:opacity-40 hover:bg-slate-100"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
