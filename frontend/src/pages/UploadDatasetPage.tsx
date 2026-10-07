import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const UploadDatasetPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const mockDatasetInfo = {
    name: selectedFile ? selectedFile.name : 'veriproof_combined_retail.csv',
    size: selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB` : '147.8 MB',
    rows: '1,048,575',
    columns: 13,
    status: 'Ready'
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
    }, 600);
  };

  const handleContinue = () => {
    navigate('/datasets/ready');
  };

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Upload your dataset
        </h1>
        <p className="text-slate-500 font-medium text-sm mt-1">
          Start by giving VERIPROOF the data you want to analyze.
        </p>
      </div>

      {!selectedFile ? (
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
          className={`border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all duration-200 bg-white ${
            isDragging
              ? 'border-blue-600 bg-blue-50/50 scale-[0.99]'
              : 'border-slate-300 hover:border-blue-500 hover:bg-slate-50/80 shadow-2xs'
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

          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-2xs">
            <Upload className="w-8 h-8 stroke-[2]" />
          </div>

          <h2 className="text-lg font-bold text-slate-900 mb-1">
            Upload your CSV
          </h2>

          <p className="text-sm font-medium text-slate-600 mb-4">
            Drag & drop your file here or
          </p>

          <Button type="button" variant="outline" className="bg-white text-blue-600 border-blue-200 font-bold px-5 py-2 shadow-2xs">
            Choose File
          </Button>

          <p className="text-xs text-slate-400 mt-6 font-medium">
            CSV files up to 500 MB
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">{mockDatasetInfo.name}</h3>
              <p className="text-xs text-slate-500 font-medium">CSV File • Verified format</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
            <div>
              <span className="text-slate-400 font-bold uppercase text-[10px]">Size</span>
              <div className="font-bold text-slate-900 text-sm mt-0.5">{mockDatasetInfo.size}</div>
            </div>
            <div>
              <span className="text-slate-400 font-bold uppercase text-[10px]">Rows</span>
              <div className="font-bold text-slate-900 text-sm mt-0.5">{mockDatasetInfo.rows}</div>
            </div>
            <div>
              <span className="text-slate-400 font-bold uppercase text-[10px]">Columns</span>
              <div className="font-bold text-slate-900 text-sm mt-0.5">{mockDatasetInfo.columns}</div>
            </div>
            <div>
              <span className="text-slate-400 font-bold uppercase text-[10px]">Status</span>
              <div className="font-bold text-emerald-600 text-sm mt-0.5 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> {mockDatasetInfo.status}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setSelectedFile(null)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700"
            >
              Choose a different file
            </button>

            <Button
              onClick={handleContinue}
              isLoading={isProcessing}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl shadow-2xs flex items-center gap-2"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
