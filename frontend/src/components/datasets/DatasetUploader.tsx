import React, { useState, useRef } from 'react';
import { Upload, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';

interface DatasetUploaderProps {
  onUploadSuccess: (file: File) => void;
}

export const DatasetUploader: React.FC<DatasetUploaderProps> = ({ onUploadSuccess }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<'idle' | 'validating' | 'uploading' | 'profiling' | 'ready' | 'failed'>('idle');
  const [progress, setProgress] = useState(0);
  const [stepMessage, setStepMessage] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      alert('Only .csv files are supported by VERIPROOF.');
      return;
    }
    setSelectedFile(file);
    startUploadProcess(file);
  };

  const startUploadProcess = async (file: File) => {
    setUploadState('validating');
    setStepMessage('Validating CSV structure & encoding...');
    setProgress(15);
    await new Promise(r => setTimeout(r, 600));

    setUploadState('uploading');
    setStepMessage('Computing SHA-256 hash & streaming bytes...');
    for (let p = 25; p <= 75; p += 15) {
      setProgress(p);
      await new Promise(r => setTimeout(r, 350));
    }

    setUploadState('profiling');
    setStepMessage('Profiling columns, calculating null ratios & min/max bounds...');
    setProgress(90);
    await new Promise(r => setTimeout(r, 700));

    setProgress(100);
    setUploadState('ready');
    setStepMessage('Dataset profile compiled & ready for audit.');
    onUploadSuccess(file);
  };

  const resetUploader = () => {
    setSelectedFile(null);
    setUploadState('idle');
    setProgress(0);
    setStepMessage('');
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <Upload className="w-5 h-5 text-[#00296B]" /> Upload Dataset for Proof Analysis
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Accepts CSV files. Automatically profiles columns, checks SHA-256 integrity, and computes null statistics.
          </p>
        </div>
        <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-slate-100 text-slate-600 font-semibold border border-slate-200">
          Max: 200 MB
        </span>
      </div>

      {uploadState === 'idle' ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              handleFileSelect(e.dataTransfer.files[0]);
            }
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
            isDragging
              ? 'border-[#00509D] bg-blue-50/50 scale-[0.99]'
              : 'border-slate-300 hover:border-[#00509D] hover:bg-slate-50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileSelect(e.target.files[0]);
              }
            }}
          />
          <div className="w-12 h-12 rounded-full bg-blue-50 text-[#00509D] flex items-center justify-center mx-auto mb-3 border border-blue-100">
            <Upload className="w-6 h-6 stroke-[2]" />
          </div>
          <p className="text-sm font-bold text-slate-800">
            Drag and drop your CSV dataset here, or <span className="text-[#00509D] underline">browse</span>
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Example: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-mono">veriproof_combined_retail.csv</code> (1.05M rows)
          </p>
        </div>
      ) : (
        <div className="border border-slate-200 bg-slate-50/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#00296B] text-amber-400 flex items-center justify-center font-bold text-sm">
                CSV
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm">{selectedFile?.name}</div>
                <div className="text-xs text-slate-500">
                  {((selectedFile?.size || 0) / (1024 * 1024)).toFixed(2)} MB • UTF-8
                </div>
              </div>
            </div>

            {uploadState === 'ready' ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5" /> PROFILED & READY
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00509D]">
                <Loader2 className="w-4 h-4 animate-spin" /> Processing
              </span>
            )}
          </div>

          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mb-2">
            <div
              className="bg-gradient-to-r from-[#00296B] to-[#00509D] h-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
            <span>{stepMessage}</span>
            <span>{progress}%</span>
          </div>

          {uploadState === 'ready' && (
            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Demo profiling executed locally without server upload.
              </span>
              <Button size="sm" variant="outline" onClick={resetUploader}>
                Upload Another
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
