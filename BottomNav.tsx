import { CircleUser, Compass, Crown, Home, Search, type LucideIcon } from 'lucide-react';

export type Screen = 'projects' | 'cloud' | 'about';
export type NavTab = Screen | 'search' | 'create';

interface NavItem {
  id: NavTab;
  label: string;
  icon: LucideIcon;
}

const ITEMS: NavItem[] = [
  { id: 'projects', label: 'Home', icon: Home },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'create', label: 'Create', icon: Compass },
  { id: 'cloud', label: 'Cloud', icon: Crown },
  { id: 'about', label: 'About', icon: CircleUser },
];

interface BottomNavProps {
  active: Screen;
  onSelect: (tab: NavTab) => void;
}

export default function BottomNav({ active, onSelect }: BottomNavProps) {
  return (
    <nav aria-label="Main" className="grid shrink-0 grid-cols-5 border-t border-neutral-200 bg-[#f8f8f6]">
      {ITEMS.map(({ id, label, icon: Icon }) => {
        const selected = id === active;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            aria-label={label}
            aria-current={selected ? 'page' : undefined}
            className={`flex flex-col items-center gap-0.5 py-3 transition active:scale-95 ${
              selected ? 'text-neutral-900' : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <Icon size={24} strokeWidth={selected ? 2.25 : 1.75} fill={selected && id === 'projects' ? 'currentColor' : 'none'} />
          </button>
        );
      })}
    </nav>
  );
}
