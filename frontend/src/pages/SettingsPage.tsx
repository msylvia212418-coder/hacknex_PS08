import React, { useState } from 'react';
import { getApiBaseUrlSetting, setApiBaseUrlSetting } from '../config/env';
import { Settings, Server, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const SettingsPage: React.FC = () => {
  const [apiUrl, setApiUrl] = useState(getApiBaseUrlSetting());
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setApiBaseUrlSetting(apiUrl.trim());
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-[#00296B]" /> Application Settings
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure the FastAPI endpoint used for claim verification
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {savedSuccess && (
          <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl font-bold text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Settings updated successfully!
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
          <h3 className="font-bold text-slate-900 text-sm mb-1 flex items-center gap-2">
            <Server className="w-4 h-4 text-[#00509D]" /> Live FastAPI Configuration
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Target base URL for the FastAPI backend service
          </p>

          <div className="text-xs space-y-2 max-w-md">
            <label className="block font-bold text-slate-800">
              API Base URL
            </label>
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="http://localhost:8000"
              className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-[#00509D]"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" variant="primary" size="md">
            Save Settings
          </Button>
        </div>
      </form>
    </div>
  );
};
