import { useState, useEffect } from 'react';
import { SettingsModalProps, RPCConfig, DEFAULT_RPC } from './types';

function loadRPCConfig(): RPCConfig {
  if (typeof window === 'undefined') return { ...DEFAULT_RPC };
  try {
    const saved = localStorage.getItem("zkterm_rpc_config");
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        solana: parsed.solana || DEFAULT_RPC.solana,
        starknet: parsed.starknet || DEFAULT_RPC.starknet,
        zcash: parsed.zcash || DEFAULT_RPC.zcash
      };
    }
  } catch (e) {
    console.error("Failed to load RPC config:", e);
  }
  return { ...DEFAULT_RPC };
}

function saveRPCConfig(config: RPCConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem("zkterm_rpc_config", JSON.stringify(config));
  } catch (e) {
    console.error("Failed to save RPC config:", e);
  }
}

function loadCustomResendKey(): string {
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

function isUsingCustomResend(): boolean {
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

export function SettingsModal({ isOpen, onClose, defaultRPC, onSave }: SettingsModalProps) {
  const [rpcConfig, setRpcConfig] = useState<RPCConfig>(loadRPCConfig());
  const [customResendKey, setCustomResendKey] = useState(loadCustomResendKey());
  const [useCustomResend, setUseCustomResendState] = useState(isUsingCustomResend());
  const [testingRpc, setTestingRpc] = useState<string | null>(null);
  const [rpcTestResults, setRpcTestResults] = useState<Record<string, boolean | null>>({});
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'rpc' | 'email'>('rpc');

  useEffect(() => {
    if (isOpen) {
      setRpcConfig(loadRPCConfig());
      setCustomResendKey(loadCustomResendKey());
      setUseCustomResendState(isUsingCustomResend());
      setRpcTestResults({});
      setSaved(false);
    }
  }, [isOpen]);

  const testRpcConnection = async (chain: keyof RPCConfig) => {
    setTestingRpc(chain);
    setRpcTestResults(prev => ({ ...prev, [chain]: null }));
    
    try {
      const url = rpcConfig[chain];
      let testSuccess = false;

      if (chain === "solana") {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getHealth" })
        });
        const data = await response.json();
        testSuccess = data.result === "ok" || !data.error;
      } else if (chain === "starknet") {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "starknet_chainId", params: [] })
        });
        const data = await response.json();
        testSuccess = !!data.result || !data.error;
      } else if (chain === "zcash") {
        const response = await fetch(url, { method: "HEAD" }).catch(() => null);
        testSuccess = response !== null;
      }

      setRpcTestResults(prev => ({ ...prev, [chain]: testSuccess }));
    } catch (e) {
      setRpcTestResults(prev => ({ ...prev, [chain]: false }));
    }
    
    setTestingRpc(null);
  };

  const handleSave = () => {
    saveRPCConfig(rpcConfig);
    saveCustomResendKey(useCustomResend ? customResendKey : "");
    setUseCustomResend(useCustomResend);
    setSaved(true);
    onSave?.({ rpc: rpcConfig, resendKey: customResendKey, useCustomResend });
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setRpcConfig(defaultRPC || { ...DEFAULT_RPC });
    setCustomResendKey("");
    setUseCustomResendState(false);
    setRpcTestResults({});
  };

  if (!isOpen) return null;

  const renderRpcInput = (chain: keyof RPCConfig, label: string) => {
    const testResult = rpcTestResults[chain];
    return (
      <div className="mb-4">
        <label className="text-[#c4d5bd] font-supply text-xs uppercase tracking-wider block mb-2">
          {label}
        </label>
        <div className="flex gap-2">
          <input
            value={rpcConfig[chain]}
            onChange={(e) => setRpcConfig(prev => ({ ...prev, [chain]: e.target.value }))}
            placeholder={(defaultRPC || DEFAULT_RPC)[chain]}
            className="bg-black border border-[#c4d5bd]/30 text-[#c4d5bd] font-supply text-sm py-2 px-3 w-full outline-none rounded-none"
            data-testid={`input-rpc-${chain}`}
          />
          <button
            onClick={() => testRpcConnection(chain)}
            disabled={testingRpc === chain}
            className={`py-2 px-4 border border-[#c4d5bd]/30 bg-transparent text-[#c4d5bd] font-supply text-xs uppercase tracking-wider cursor-pointer rounded-none ${testingRpc === chain ? 'opacity-50' : ''}`}
            data-testid={`button-test-rpc-${chain}`}
          >
            {testingRpc === chain ? '...' : testResult === true ? '✓' : testResult === false ? '✗' : 'TEST'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div 
        className="bg-black/[0.95] border border-[#c4d5bd] max-w-[500px] w-[90%] max-h-[90vh] overflow-auto p-6 relative backdrop-blur-lg rounded-none"
        data-testid="settings-modal"
      >
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

        <div className="flex gap-0 mb-6 border border-[#c4d5bd]/30 rounded-none">
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

        {activeTab === 'rpc' && (
          <div>
            <div className="p-3 border border-[#c4d5bd]/30 mb-4 bg-[#c4d5bd]/5 rounded-none">
              <p className="text-[#c4d5bd]/70 text-xs m-0">
                Configure custom RPC endpoints. Falls back to defaults if connection fails.
              </p>
            </div>
            {renderRpcInput("solana", "Solana RPC")}
            {renderRpcInput("starknet", "Starknet RPC")}
            {renderRpcInput("zcash", "Zcash RPC")}
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

        <div className="flex gap-3 mt-6">
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
  );
}

export { loadRPCConfig, loadCustomResendKey, isUsingCustomResend };
export default SettingsModal;
