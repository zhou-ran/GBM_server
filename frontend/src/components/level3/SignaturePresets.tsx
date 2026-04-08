import { useColorStore } from '../../stores/colorStore';

const PRESETS = {
  SASP: ['IL6', 'IL8', 'CXCL1', 'CXCL2', 'CXCL3', 'CCL2', 'CCL3', 'VEGFA', 'SERPINE1'],
  'Cell Cycle Arrest': ['CDKN1A', 'CDKN2A', 'CDKN2B', 'TP53', 'RB1'],
  'DNA Damage': ['ATM', 'ATR', 'CHEK1', 'CHEK2', 'H2AFX'],
  'Anti-Apoptotic': ['BCL2', 'BCL2L1', 'MCL1'],
} as const;

export function SignaturePresets() {
  const loadSignature = useColorStore((s) => s.loadSignature);
  const signatureName = useColorStore((s) => s.signatureName);

  return (
    <div className="space-y-2">
      {Object.entries(PRESETS).map(([label, genes]) => (
        <button
          key={label}
          type="button"
          className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${
            signatureName === label ? 'border-[var(--accent)] bg-[var(--accent)]/10' : 'border-[var(--border)] bg-black/10'
          }`}
          onClick={() => loadSignature([...genes], label)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
