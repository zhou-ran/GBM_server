import type { ReactNode } from 'react';

interface TabDefinition<T extends string> {
  id: T;
  label: string;
  content: ReactNode;
}

interface TabPanelProps<T extends string> {
  activeTab: T;
  tabs: TabDefinition<T>[];
  onTabChange: (tab: T) => void;
}

export function TabPanel<T extends string>({ activeTab, tabs, onTabChange }: TabPanelProps<T>) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`rounded-full px-3 py-1.5 text-sm transition ${
              tab.id === activeTab ? 'bg-white/12 text-[var(--text)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="mt-3 flex-1 overflow-hidden">{tabs.find((tab) => tab.id === activeTab)?.content}</div>
    </div>
  );
}
