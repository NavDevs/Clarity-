import React from 'react';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#141416] border border-[#27272A] rounded-xl w-full max-w-4xl overflow-hidden shadow-2xl text-[#e5e2e3]">
        <div className="p-6 border-b border-[#27272A] flex items-center justify-between bg-[#1C1C1E]">
          <div>
            <h2 className="font-bold text-xl text-[#e5e2e3]">Clarity Pricing Plans</h2>
            <p className="text-xs text-[#8c909f] font-mono mt-0.5">Scale codebase intelligence from open-source to enterprise</p>
          </div>
          <button onClick={onClose} className="text-[#8c909f] hover:text-white">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Free Tier */}
          <div className="bg-[#050505] border border-[#27272A] rounded-lg p-6 flex flex-col justify-between">
            <div>
              <span className="font-mono text-xs text-[#8c909f] uppercase block mb-1">Developer</span>
              <h3 className="text-2xl font-bold font-mono text-[#e5e2e3] mb-2">$0 <span className="text-xs text-[#8c909f] font-normal">/ month</span></h3>
              <p className="text-xs text-[#c2c6d6] mb-6">Ideal for exploring public open-source GitHub repositories.</p>
              <ul className="text-xs font-mono text-[#c2c6d6] space-y-2.5 mb-6">
                <li className="flex items-center gap-2"><span className="text-[#4edea3]">✓</span> Public Repos Scans</li>
                <li className="flex items-center gap-2"><span className="text-[#4edea3]">✓</span> 10 Scans / Month</li>
                <li className="flex items-center gap-2"><span className="text-[#4edea3]">✓</span> Basic Security Audit</li>
                <li className="flex items-center gap-2 text-[#8c909f]"><span className="text-[#8c909f]">✗</span> Real-time AI Chat</li>
              </ul>
            </div>
            <button onClick={onClose} className="w-full bg-[#353436] hover:bg-[#424754] text-[#e5e2e3] py-2 rounded font-mono text-xs transition-colors">
              Current Plan
            </button>
          </div>

          {/* Pro Tier */}
          <div className="bg-[#1C1C1E] border-2 border-[#3B82F6] rounded-lg p-6 flex flex-col justify-between relative shadow-xl">
            <span className="absolute -top-3 right-4 bg-[#3B82F6] text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded">
              POPULAR
            </span>
            <div>
              <span className="font-mono text-xs text-[#adc6ff] uppercase block mb-1">Pro Engineer</span>
              <h3 className="text-2xl font-bold font-mono text-[#e5e2e3] mb-2">$19 <span className="text-xs text-[#8c909f] font-normal">/ month</span></h3>
              <p className="text-xs text-[#c2c6d6] mb-6">Unlimited scans, full AI chat reasoning, and secret remediation.</p>
              <ul className="text-xs font-mono text-[#c2c6d6] space-y-2.5 mb-6">
                <li className="flex items-center gap-2"><span className="text-[#3B82F6]">✓</span> Unlimited Public & Private Repos</li>
                <li className="flex items-center gap-2"><span className="text-[#3B82F6]">✓</span> Gemini 3.6 Flash Code AI</li>
                <li className="flex items-center gap-2"><span className="text-[#3B82F6]">✓</span> Continuous Vigilant Mode</li>
                <li className="flex items-center gap-2"><span className="text-[#3B82F6]">✓</span> Auto-Fix PR Generation</li>
              </ul>
            </div>
            <button onClick={onClose} className="w-full bg-[#3B82F6] hover:bg-[#4d8eff] text-white py-2 rounded font-mono text-xs font-bold transition-colors">
              Upgrade to Pro
            </button>
          </div>

          {/* Enterprise Tier */}
          <div className="bg-[#050505] border border-[#27272A] rounded-lg p-6 flex flex-col justify-between">
            <div>
              <span className="font-mono text-xs text-[#8c909f] uppercase block mb-1">Enterprise</span>
              <h3 className="text-2xl font-bold font-mono text-[#e5e2e3] mb-2">Custom</h3>
              <p className="text-xs text-[#c2c6d6] mb-6">On-premise deployment with custom SOC2 compliance rules.</p>
              <ul className="text-xs font-mono text-[#c2c6d6] space-y-2.5 mb-6">
                <li className="flex items-center gap-2"><span className="text-[#4edea3]">✓</span> Self-Hosted AST Engines</li>
                <li className="flex items-center gap-2"><span className="text-[#4edea3]">✓</span> Custom SAML SSO / Okta</li>
                <li className="flex items-center gap-2"><span className="text-[#4edea3]">✓</span> Dedicated Support Lead</li>
              </ul>
            </div>
            <button onClick={onClose} className="w-full bg-[#353436] hover:bg-[#424754] text-[#e5e2e3] py-2 rounded font-mono text-xs transition-colors">
              Contact Sales
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
