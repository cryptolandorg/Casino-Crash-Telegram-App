import { useEffect, useState } from 'react';

interface TopRecord {
  id: number;
  username: string;
  bet: number;
  cashout: number;
  profit: number;
  winnings: number;
  crashPoint: number | null;
  createdAt: string;
}

export default function TopRecords() {
  const [records, setRecords] = useState<TopRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchRecords = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/session/records');
        if (response.ok) {
          const data = await response.json();
          setRecords(data.records || []);
        }
      } catch (error) {
        console.error('Error fetching top records:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecords();
  }, []);

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-4">Топ выигрышей</h3>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-700 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-4">Топ выигрышей</h3>
        <p className="text-gray-400 text-center">Нет данных</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-white mb-4">Топ выигрышей</h3>
      <div className="space-y-2">
        {records.map((record, index) => (
          <div key={record.id} className="flex justify-between items-center p-3 bg-gray-700 rounded shadow">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center text-xs font-bold text-black">
                {index + 1}
              </div>
              <div>
                <div className="text-white text-sm font-medium">
                  {record.username}
                </div>
                <div className="text-gray-400 text-xs">
                  Ставка: {record.bet.toFixed(2)}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-green-400 text-sm font-semibold">
                +{record.profit.toFixed(2)}
              </div>
              <div className="text-gray-400 text-xs">
                {record.cashout.toFixed(2)}x
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 