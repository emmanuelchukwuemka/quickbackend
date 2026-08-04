import { Search } from 'lucide-react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function SearchInput({ value, onChange, placeholder = 'Search...' }: SearchInputProps) {
  return (
    <div className="flex w-full max-w-xs items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
      <Search size={16} className="text-gray-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
      />
    </div>
  );
}
