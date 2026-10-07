// Configuration for VERIPROOF Demo vs Real API mode

const getEnvVar = (key: string, defaultValue: string): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key] !== undefined) {
    return import.meta.env[key] as string;
  }
  return defaultValue;
};

// Check standard localStorage override or environment variables
export const getDemoModeSetting = (): boolean => {
  const saved = localStorage.getItem('VERIPROOF_DEMO_MODE');
  if (saved !== null) {
    return saved === 'true';
  }
  const envVal = getEnvVar('VITE_DEMO_MODE', 'false');
  return envVal.toLowerCase() === 'true';
};

export const setDemoModeSetting = (enabled: boolean): void => {
  localStorage.setItem('VERIPROOF_DEMO_MODE', String(enabled));
  window.dispatchEvent(new Event('veriproof_config_changed'));
};

export const getApiBaseUrlSetting = (): string => {
  const saved = localStorage.getItem('VERIPROOF_API_BASE_URL');
  if (saved !== null) {
    return saved;
  }
  return getEnvVar('VITE_API_BASE_URL', 'http://localhost:8000');
};

export const setApiBaseUrlSetting = (url: string): void => {
  localStorage.setItem('VERIPROOF_API_BASE_URL', url);
  window.dispatchEvent(new Event('veriproof_config_changed'));
};
