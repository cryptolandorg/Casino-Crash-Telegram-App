import { useEffect, useState } from 'react';

interface SessionHistoryItem {
  id: string;
  crashPoint: number;
  createdAt: string;
}

export default function SessionHistory() {
  const [history, setHistory] = useState<SessionHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/session/history');
        if (response.ok) {
          const data = await response.json();
          setHistory(data.history || []);
        }
      } catch (error) {
        console.error('Error fetching session history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-4">История коэффициентов</h3>
        <div className="flex space-x-2 overflow-x-auto">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-16 h-8 bg-gray-700 rounded animate-pulse flex-shrink-0"></div>
          ))}
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-4">История коэффициентов</h3>
        <p className="text-gray-400 text-center">Нет данных</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-white mb-4">История коэффициентов</h3>
      <div className="flex space-x-2 overflow-x-auto pb-2">
        {history.map((item) => (
          <div
            key={item.id}
            className={`px-3 py-2 rounded-lg text-sm font-semibold flex-shrink-0 ${
              item.crashPoint >= 2 ? 'bg-green-600 text-white' :
              item.crashPoint >= 1.5 ? 'bg-yellow-600 text-white' :
              'bg-red-600 text-white'
            }`}
          >
            {item.crashPoint.toFixed(2)}x
          </div>
        ))}
      </div>
    </div>
  );
} 