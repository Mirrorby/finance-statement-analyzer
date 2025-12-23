import React, { useState } from 'react';
import { Upload } from 'lucide-react';
import { extractText } from '../file/extractText';
import { parse } from '../parsers';
import { calculateAnalytics } from '../analytics/calculateAnalytics';

export default function BankStatementAnalyzer() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const text = await extractText(file);
      const transactions = parse(text);
      calculateAnalytics(transactions);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Анализатор банковских выписок</h1>

      <label>
        <Upload /> Загрузить PDF / TXT
        <input type="file" accept=".pdf,.txt" onChange={handleFileUpload} />
      </label>

      {loading && <p>Обработка...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
