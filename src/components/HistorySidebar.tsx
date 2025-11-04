import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export interface HistoryItem {
  id: string;
  slug: string;
  title: string;
  date: string;
  url: string;
  prompt: string;
}

const HISTORY_STORAGE_KEY = 'paywall_experiments_history';

export function getHistory(): HistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveToHistory(item: HistoryItem): void {
  if (typeof window === 'undefined') return;
  try {
    const history = getHistory();
    // Remove duplicate if exists
    const filtered = history.filter(h => h.id !== item.id);
    // Add to beginning
    const updated = [item, ...filtered].slice(0, 50); // Keep last 50
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save to history:', error);
  }
}

interface HistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HistorySidebar({ isOpen, onClose }: HistorySidebarProps) {
  const navigate = useNavigate();
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    setHistory(getHistory());
  }, [isOpen]);

  const handleItemClick = (item: HistoryItem) => {
    navigate(item.url);
    onClose();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-100/50 z-40 transition-all duration-1000 ease-in-out"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full w-[320px] md:w-[400px] bg-white border-r border-slate-200 z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">History</h2>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            className="rounded-full"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* History List */}
        <div className="overflow-y-auto h-[calc(100vh-73px)]">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <p className="text-slate-500 text-sm">No experiments yet</p>
              <p className="text-slate-400 text-xs mt-1">Your generated experiments will appear here</p>
            </div>
          ) : (
            <div className="p-2">
              {history.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className="w-full cursor-pointer text-left p-3 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200 group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-slate-900 truncate group-hover:text-slate-700">
                        {item.title}
                      </h3>
                      {item.prompt && (
                        <p className="text-xs text-slate-500 truncate mt-1">
                          {item.prompt}
                        </p>
                      )}
                      <p className="text-xs text-slate-400 mt-2">
                        {formatDate(item.date)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

