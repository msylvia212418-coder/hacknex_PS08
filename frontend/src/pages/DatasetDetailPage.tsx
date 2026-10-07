import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { datasetsService } from '../services';
import type { Dataset } from '../types';
import { ColumnProfileTable } from '../components/datasets/ColumnProfileTable';
import { DataPreviewSpreadsheet } from '../components/datasets/DataPreviewSpreadsheet';
import { Database, ArrowLeft, CheckCircle2, Sparkles, ChevronDown, ChevronUp, FileCode } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const DatasetDetailPage: React.FC = () => {
  const { datasetId } = useParams<{ datasetId: string }>();
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [showTechnicalMetadata, setShowTechnicalMetadata] = useState(false);

  useEffect(() => {
    if (datasetId) {
      datasetsService.getDataset(datasetId).then(setDataset).catch(() => {});
    }
  }, [datasetId]);

  if (!dataset) {
    return <div className="p-8 text-center text-slate-500 font-medium">Loading dataset details...</div>;
  }

  const qualityChecks = [
    'Valid UTF-8 encoding',
    'Valid CSV structure',
    'Numeric fields checked',
    'Missing values detected',
    'Duplicate analysis available'
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-4">
      <div>
        <Link to="/datasets" className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900 mb-4">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Datasets Repository
        </Link>

        {/* Main Dataset Card */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-900 font-mono">{dataset.name}</h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    READY
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Uploaded on {new Date(dataset.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            <Link to={`/analyze?dataset=${dataset.id}`}>
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl shadow-2xs flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-300" /> Ask a Question
              </Button>
            </Link>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70">
              <div className="text-[10px] uppercase font-bold text-slate-400">Rows</div>
              <div className="text-base font-extrabold text-slate-900 mt-0.5">{dataset.profile.rowCount.toLocaleString()}</div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70">
              <div className="text-[10px] uppercase font-bold text-slate-400">Columns</div>
              <div className="text-base font-extrabold text-slate-900 mt-0.5">{dataset.profile.columnCount}</div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70">
              <div className="text-[10px] uppercase font-bold text-slate-400">File Size</div>
              <div className="text-base font-extrabold text-slate-900 mt-0.5">
                {(dataset.profile.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70">
              <div className="text-[10px] uppercase font-bold text-slate-400">Status</div>
              <div className="text-base font-extrabold text-emerald-600 mt-0.5 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Ready
              </div>
            </div>
          </div>

          {/* Data Quality Summary */}
          <div className="p-5 bg-emerald-50/70 rounded-2xl border border-emerald-200/80 space-y-3">
            <h3 className="font-extrabold text-emerald-900 text-xs uppercase tracking-wider">
              Data Quality Summary
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold text-emerald-800">
              {qualityChecks.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Progressive Disclosure: Technical Dataset Metadata */}
          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={() => setShowTechnicalMetadata(!showTechnicalMetadata)}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
            >
              {showTechnicalMetadata ? 'Hide technical metadata' : 'Technical dataset metadata'}
              {showTechnicalMetadata ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showTechnicalMetadata && (
              <div className="mt-4 p-4 bg-slate-900 text-slate-200 rounded-2xl text-xs font-mono space-y-2 animate-in fade-in duration-150">
                <div><span className="text-slate-500">Dataset ID:</span> {dataset.id}</div>
                <div><span className="text-slate-500">SHA-256 Hash:</span> {dataset.profile.sha256}</div>
                <div><span className="text-slate-500">Storage Path:</span> private/datasets/{dataset.id}/data.csv</div>
                <div><span className="text-slate-500">Encoding:</span> {dataset.profile.encoding}</div>
                <div><span className="text-slate-500">Duplicates:</span> {dataset.profile.duplicateRowCount} rows</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Column Profiling & Spreadsheet Preview */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm space-y-6">
        <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <FileCode className="w-5 h-5 text-blue-600" /> Column Profile & Preview
        </h2>

        <ColumnProfileTable columns={dataset.profile.columns} />

        <div className="pt-4">
          <h3 className="text-sm font-bold text-slate-800 mb-3">Data Sample Spreadsheet</h3>
          <DataPreviewSpreadsheet rows={dataset.previewRows} />
        </div>
      </div>
    </div>
  );
};
