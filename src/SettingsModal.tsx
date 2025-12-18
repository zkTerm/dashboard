import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { SettingsModalProps, RPCConfig, RPCHeaders, RPCCustomHeader, EMPTY_HEADERS } from './types';

const EMPTY_RPC: RPCConfig = {
  solana: '',
  starknet: '',
  zcash: ''
};

export function loadRPCConfig(): RPCConfig {
  if (typeof window === 'undefined') return { ...EMPTY_RPC };
  try {
    const saved = localStorage.getItem("zkterm_rpc_config");
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        solana: parsed.solana || '',
        starknet: parsed.starknet || '',
        zcash: parsed.zcash || ''
      };
    }
  } catch (e) {
    console.error("Failed to load RPC config:", e);
  }
  return { ...EMPTY_RPC };
}

function saveRPCConfig(config: RPCConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem("zkterm_rpc_config", JSON.stringify(config));
  } catch (e) {
    console.error("Failed to save RPC config:", e);
  }
}

export function loadRPCHeaders(): RPCHeaders {
  if (typeof window === 'undefined') return { ...EMPTY_HEADERS };
  try {
    const saved = localStorage.getItem("zkterm_rpc_headers");
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        solana: { name: parsed.solana?.name || "", value: parsed.solana?.value || "" },
        starknet: { name: parsed.starknet?.name || "", value: parsed.starknet?.value || "" },
        zcash: { name: parsed.zcash?.name || "", value: parsed.zcash?.value || "" }
      };
    }
  } catch (e) {
    console.error("Failed to load RPC headers:", e);
  }
  return { ...EMPTY_HEADERS };
}

function saveRPCHeaders(headers: RPCHeaders): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem("zkterm_rpc_headers", JSON.stringify(headers));
  } catch (e) {
    console.error("Failed to save RPC headers:", e);
  }
}

export function loadCustomResendKey(): string {
  if (typeof window === 'undefined') return "";
  try {
    return localStorage.getItem("zkterm_resend_key") || "";
  } catch (e) {
    return "";
  }
}

function saveCustomResendKey(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (key) {
      localStorage.setItem("zkterm_resend_key", key);
    } else {
      localStorage.removeItem("zkterm_resend_key");
    }
  } catch (e) {
    console.error("Failed to save Resend key:", e);
  }
}

export function isUsingCustomResend(): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem("zkterm_use_custom_resend");
}

function setUseCustomResend(use: boolean): void {
  if (typeof window === 'undefined') return;
  if (use) {
    localStorage.setItem("zkterm_use_custom_resend", "true");
  } else {
    localStorage.removeItem("zkterm_use_custom_resend");
  }
}

export function SettingsModal({ isOpen, onClose, defaultRPC, onSave, onRefresh }: SettingsModalProps) {
  const [rpcConfig, setRpcConfig] = useState<RPCConfig>(loadRPCConfig());
  const [rpcHeaders, setRpcHeaders] = useState<RPCHeaders>(loadRPCHeaders());
  const [customResendKey, setCustomResendKey] = useState(loadCustomResendKey());
  const [useCustomResend, setUseCustomResendState] = useState(isUsingCustomResend());
  const [testingRpc, setTestingRpc] = useState<string | null>(null);
  const [rpcTestResults, setRpcTestResults] = useState<Record<string, boolean | null>>({});
  const [rpcTestErrors, setRpcTestErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'rpc' | 'email'>('rpc');

  useEffect(() => {
    if (isOpen) {
      setRpcConfig(loadRPCConfig());
      setRpcHeaders(loadRPCHeaders());
      setCustomResendKey(loadCustomResendKey());
      setUseCustomResendState(isUsingCustomResend());
      setRpcTestResults({});
      setRpcTestErrors({});
      setSaved(false);
    }
  }, [isOpen]);

  const buildHeaders = (chain: keyof RPCConfig): HeadersInit => {
    const customHeader = rpcHeaders[chain];
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (customHeader.name && customHeader.value) {
      (headers as Record<string, string>)[customHeader.name] = customHeader.value;
    }
    return headers;
  };

  const testRpcConnection = async (chain: keyof RPCConfig) => {
    setTestingRpc(chain);
    setRpcTestResults(prev => ({ ...prev, [chain]: null }));
    setRpcTestErrors(prev => ({ ...prev, [chain]: '' }));
    
    try {
      const url = rpcConfig[chain];
      
      if (!url) {
        setRpcTestErrors(prev => ({ ...prev, [chain]: 'No URL provided. Using server default.' }));
        setRpcTestResults(prev => ({ ...prev, [chain]: null }));
        setTestingRpc(null);
        return;
      }

      // Use backend proxy to bypass CORS
      const customHeader = rpcHeaders[chain];
      const response = await fetch('/api/rpc-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          chain,
          headers: customHeader.name && customHeader.value ? customHeader : undefined
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setRpcTestResults(prev => ({ ...prev, [chain]: true }));
      } else {
        setRpcTestResults(prev => ({ ...prev, [chain]: false }));
        setRpcTestErrors(prev => ({ ...prev, [chain]: data.error || 'Connection failed' }));
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Connection failed';
      setRpcTestResults(prev => ({ ...prev, [chain]: false }));
      setRpcTestErrors(prev => ({ ...prev, [chain]: errorMsg }));
    }
    
    setTestingRpc(null);
  };

  const handleSave = async () => {
    saveRPCConfig(rpcConfig);
    saveRPCHeaders(rpcHeaders);
    saveCustomResendKey(useCustomResend ? customResendKey : "");
    setUseCustomResend(useCustomResend);
    setSaved(true);
    onSave?.({ rpc: rpcConfig, headers: rpcHeaders, resendKey: customResendKey, useCustomResend });
    await onRefresh?.();
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setRpcConfig({ ...EMPTY_RPC });
    setRpcHeaders({ ...EMPTY_HEADERS });
    setCustomResendKey("");
    setUseCustomResendState(false);
    setRpcTestResults({});
    setRpcTestErrors({});
  };

  if (!isOpen) return null;

  const renderRpcInput = (chain: keyof RPCConfig, label: string, urlPlaceholder: string) => {
    const testResult = rpcTestResults[chain];
    const testError = rpcTestErrors[chain];
    const header = rpcHeaders[chain];
    return (
      <div className="mb-5">
        <label className="text-[#c4d5bd] font-supply text-xs uppercase tracking-wider block mb-2">
          {label}
        </label>
        <div className="flex gap-2 mb-1">
          <input
            value={rpcConfig[chain]}
            onChange={(e) => setRpcConfig(prev => ({ ...prev, [chain]: e.target.value }))}
            placeholder={urlPlaceholder}
            className="bg-black border border-[#c4d5bd]/30 text-[#c4d5bd] font-supply text-sm py-2 px-3 w-full outline-none rounded-none"
            data-testid={`input-rpc-${chain}`}
          />
          <button
            onClick={() => testRpcConnection(chain)}
            disabled={testingRpc === chain}
            className={`py-2 px-4 border border-[#c4d5bd]/30 bg-transparent font-supply text-xs uppercase tracking-wider cursor-pointer rounded-none shrink-0 ${testingRpc === chain ? 'opacity-50 text-[#c4d5bd]' : testResult === true ? 'text-[#4ade80] border-[#4ade80]/50' : testResult === false ? 'text-red-400 border-red-400/50' : 'text-[#c4d5bd]'}`}
            data-testid={`button-test-rpc-${chain}`}
          >
            {testingRpc === chain ? '...' : testResult === true ? '✓' : testResult === false ? '✗' : 'TEST'}
          </button>
        </div>
        {testResult === true && !testError && (
          <p className="text-[#4ade80] text-[11px] font-supply m-0 mt-1 mb-2" data-testid={`success-rpc-${chain}`}>
            Connected successfully
          </p>
        )}
        {testError && (
          <div className="flex items-center gap-2 mt-1 mb-2">
            <p className="text-red-400/80 text-[11px] font-supply m-0" data-testid={`error-rpc-${chain}`}>
              {testError}
            </p>
            <button
              onClick={() => testRpcConnection(chain)}
              disabled={testingRpc === chain}
              className="text-[#c4d5bd] text-[10px] font-supply uppercase tracking-wider underline underline-offset-2 cursor-pointer bg-transparent border-none p-0 hover:text-[#ff13e7] disabled:opacity-50"
              data-testid={`button-retry-rpc-${chain}`}
            >
              Retry
            </button>
          </div>
        )}
        <div className="pl-0 mt-2">
          <label className="text-[#c4d5bd]/50 font-supply text-[10px] uppercase tracking-wider block mb-1">
            Custom Header (optional)
          </label>
          <div className="flex gap-2">
            <input
              value={header.name}
              onChange={(e) => setRpcHeaders(prev => ({ 
                ...prev, 
                [chain]: { ...prev[chain], name: e.target.value } 
              }))}
              placeholder="Header name (e.g. X-API-Key)"
              className="bg-black border border-[#c4d5bd]/20 text-[#c4d5bd] font-supply text-xs py-1.5 px-2.5 w-[45%] outline-none rounded-none"
              data-testid={`input-header-name-${chain}`}
            />
            <input
              type="password"
              value={header.value}
              onChange={(e) => setRpcHeaders(prev => ({ 
                ...prev, 
                [chain]: { ...prev[chain], value: e.target.value } 
              }))}
              placeholder="Header value"
              className="bg-black border border-[#c4d5bd]/20 text-[#c4d5bd] font-supply text-xs py-1.5 px-2.5 flex-1 outline-none rounded-none"
              data-testid={`input-header-value-${chain}`}
            />
          </div>
        </div>
      </div>
    );
  };

  const modalContent = (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-[99999]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div 
        className="bg-black/[0.95] border border-[#c4d5bd] max-w-[500px] w-[90%] max-h-[90vh] flex flex-col backdrop-blur-lg rounded-none relative"
        data-testid="settings-modal"
      >
        <div className="p-6 pb-0 shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-transparent border-none text-[#c4d5bd] text-xl cursor-pointer p-1 rounded-none"
            data-testid="button-close-settings"
          >
            ✕
          </button>

          <div className="flex items-center gap-2 mb-6">
            <span className="text-[#ff13e7] text-xl">⚙</span>
            <h2 className="text-[#ff13e7] font-supply text-lg uppercase tracking-widest m-0">
              Settings
            </h2>
          </div>

          <div className="flex gap-0 mb-4 border border-[#c4d5bd]/30 rounded-none">
            <button
              onClick={() => setActiveTab('rpc')}
              className={`flex-1 py-2 px-4 border-none font-supply text-xs uppercase tracking-wider cursor-pointer rounded-none ${activeTab === 'rpc' ? 'bg-[#c4d5bd] text-black' : 'bg-transparent text-[#c4d5bd]'}`}
              data-testid="tab-rpc"
            >
              RPC Endpoints
            </button>
            <button
              onClick={() => setActiveTab('email')}
              className={`flex-1 py-2 px-4 border-none font-supply text-xs uppercase tracking-wider cursor-pointer rounded-none ${activeTab === 'email' ? 'bg-[#c4d5bd] text-black' : 'bg-transparent text-[#c4d5bd]'}`}
              data-testid="tab-email"
            >
              Email API
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 min-h-0">

        {activeTab === 'rpc' && (
          <div>
            <div className="p-3 border border-[#c4d5bd]/30 mb-4 bg-[#c4d5bd]/5 rounded-none">
              <p className="text-[#c4d5bd]/70 text-xs m-0">
                Custom RPC endpoints. Leave empty to use server defaults.
              </p>
            </div>
            {renderRpcInput("solana", "Solana RPC", "Leave empty to use default")}
            {renderRpcInput("starknet", "Starknet RPC", "Leave empty to use default")}
            {renderRpcInput("zcash", "Zcash RPC", "Leave empty to use default")}
          </div>
        )}

        {activeTab === 'email' && (
          <div>
            <div className="p-3 border border-[#c4d5bd]/30 mb-4 bg-[#c4d5bd]/5 rounded-none">
              <p className="text-[#c4d5bd]/70 text-xs m-0">
                Use your own Resend API key for Email OTP. Get one at resend.com
              </p>
            </div>

            <div className="flex justify-between items-center py-2 mb-4">
              <div>
                <div className="text-[#c4d5bd] text-xs uppercase tracking-wider">
                  Use Custom API Key
                </div>
                <div className="text-[#c4d5bd]/50 text-[11px] mt-1">
                  Default: zkTerm email service
                </div>
              </div>
              <button
                onClick={() => setUseCustomResendState(!useCustomResend)}
                className={`w-12 h-6 rounded-full border-none cursor-pointer relative transition-colors ${useCustomResend ? 'bg-[#c4d5bd]' : 'bg-[#c4d5bd]/30'}`}
                data-testid="switch-custom-resend"
              >
                <div className={`w-5 h-5 rounded-full absolute top-0.5 transition-all ${useCustomResend ? 'bg-black left-[26px]' : 'bg-[#c4d5bd] left-0.5'}`} />
              </button>
            </div>

            {useCustomResend && (
              <div className="mb-4">
                <label className="text-[#c4d5bd] text-xs uppercase tracking-wider block mb-2">
                  Resend API Key
                </label>
                <input
                  type="password"
                  value={customResendKey}
                  onChange={(e) => setCustomResendKey(e.target.value)}
                  placeholder="re_xxxxxxxx..."
                  className="bg-black border border-[#c4d5bd]/30 text-[#c4d5bd] font-supply text-sm py-2 px-3 w-full outline-none rounded-none"
                  data-testid="input-resend-key"
                />
                <p className="text-[#c4d5bd]/40 text-[11px] mt-2">
                  Stored locally. Never sent to our servers.
                </p>
              </div>
            )}
          </div>
        )}
        </div>

        <div className="p-6 pt-4 shrink-0 border-t border-[#c4d5bd]/10">
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="flex-1 py-2 px-4 border border-[#c4d5bd]/30 bg-transparent text-[#c4d5bd]/60 font-supply text-xs uppercase tracking-wider cursor-pointer rounded-none"
              data-testid="button-reset-settings"
            >
              Reset to Defaults
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-2 px-4 border border-[#c4d5bd]/30 bg-[#c4d5bd] text-black font-supply text-xs uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2 rounded-none"
              data-testid="button-save-settings"
            >
              {saved ? '✓ Saved' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

export default SettingsModal;
