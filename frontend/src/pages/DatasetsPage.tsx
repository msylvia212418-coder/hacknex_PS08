import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { datasetsService } from '../services';
import type { Dataset } from '../types';
import { Database, Upload, ArrowRight, FileText, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const DatasetsPage: React.FC = () => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);

  useEffect(() => {
    datasetsService.getDatasets().then(setDatasets);
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Database className="w-6 h-6 text-blue-600" /> Datasets
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Ingested datasets available for verification and analysis
          </p>
        </div>

        <Link to="/datasets/upload">
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-2xs flex items-center gap-2 text-xs"
          >
            <Upload className="w-4 h-4" /> Upload Dataset
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Available Datasets ({datasets.length})
          </span>
          <span className="text-xs text-slate-500 font-medium">
            Click dataset to inspect structure & profiles
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <th className="py-3.5 px-4">Dataset Name</th>
                <th className="py-3.5 px-4">Rows</th>
                <th className="py-3.5 px-4">Columns</th>
                <th className="py-3.5 px-4">Size</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium">
              {datasets.map((ds) => (
                <tr key={ds.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-4 px-4 font-bold text-slate-900 font-mono flex items-center gap-2.5">
                    <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>{ds.name}</span>
                  </td>
                  <td className="py-4 px-4 font-bold text-slate-800">
                    {ds.profile.rowCount.toLocaleString()}
                  </td>
                  <td className="py-4 px-4 font-bold text-slate-800">
                    {ds.profile.columnCount}
                  </td>
                  <td className="py-4 px-4 text-slate-600 font-mono">
                    {formatBytes(ds.profile.fileSizeBytes)}
                  </td>
                  <td className="py-4 px-4">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <CheckCircle2 className="w-3 h-3" /> READY
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <Link to={`/datasets/${ds.id}`}>
                      <Button size="sm" variant="outline" className="text-xs font-semibold rounded-xl" icon={ArrowRight}>
                        Inspect
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
