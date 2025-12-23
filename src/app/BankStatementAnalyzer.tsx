import React, { useEffect, useState } from 'react';
import {
  Upload,
  DollarSign,
  TrendingUp,
  TrendingDown,
  PieChart,
  FileText,
  Download,
  Trash2
} from 'lucide-react';

import { extractText } from '../file/extractText';
import { parse } from '../parsers';
import { calculateAnalytics } from '../analytics/calculateAnalytics';
import { Transaction } from '../types/transaction';
import {
  saveTransactions,
  loadTransactions,
  clearTransactions
} from '../storage/db';

export default function BankStatementAnalyzer() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* =========================
     ЗАГРУЗКА ДАННЫХ ИЗ IndexedDB ПРИ СТАРТЕ
     ========================= */
  useEffect(() => {
    (async () => {
      try {
        const stored = await loadTransactions();
        if (stored && stored.transactions.length > 0) {
          setTransactions(stored.transactions);
          setAnalytics(calculateAnalytics(stored.transactions));
        }
      } catch (e) {
        console.warn('Не удалось загрузить данные из хранилища', e);
      }
    })();
  }, []);

  /* =========================
     ОБРАБОТКА ЗАГРУЗКИ ФАЙЛА
     ========================= */
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setLoading(true);
    setError(null);

    try {
      const text = await extractText(file);
      const parsed = parse(text);

      if (!parsed.length) {
        throw new Error(
          'Не удалось распознать транзакции. Проверь формат выписки.'
        );
      }

      const analyticsResult = calculateAnalytics(parsed);

      setTransactions(parsed);
      setAnalytics(analyticsResult);

      // 💾 сохраняем в IndexedDB
      await saveTransactions(parsed);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Ошибка обработки файла');
      setTransactions([]);
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     ЭКСПОРТ CSV
     ========================= */
  const exportToCSV = () => {
    if (!transactions.length) return;

    const headers = [
      'Дата',
      'Категория',
      'Описание',
      'Приход',
      'Расход',
      'Остаток',
      'Банк'
    ];

    const rows = transactions.map(t => [
      t.date.toISOString(),
      t.category,
      t.description.replace(/,/g, ';'),
      t.income.toFixed(2),
      t.expense.toFixed(2),
      t.balance.toFixed(2),
      t.bank
    ]);

    const csv = [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob(['\ufeff' + csv], {
      type: 'text/csv;charset=utf-8;'
    });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `transactions_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    link.click();
  };

  /* =========================
     ОЧИСТКА ДАННЫХ
     ========================= */
  const handleClear = async () => {
    await clearTransactions();
    setTransactions([]);
    setAnalytics(null);
    setFileName(null);
  };

  /* =========================
     UI
     ========================= */
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#eef2ff',
        padding: 24
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* HEADER */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 32, fontWeight: 700 }}>
            Анализатор банковских выписок
          </h1>
          <p style={{ color: '#555', marginTop: 8 }}>
            Загрузите PDF или TXT файл для анализа
          </p>
          <p style={{ fontSize: 12, color: '#777', marginTop: 4 }}>
            🔒 Все данные обрабатываются локально в браузере
          </p>
        </div>

        {/* UPLOAD */}
        <div
          style={{
            background: '#fff',
            padding: 32,
            borderRadius: 12,
            boxShadow: '0 10px 20px rgba(0,0,0,0.05)',
            marginBottom: 32
          }}
        >
          <label
            style={{
              display: 'block',
              border: '2px dashed #c7d2fe',
              borderRadius: 12,
              padding: 32,
              textAlign: 'center',
              cursor: 'pointer'
            }}
          >
            <Upload
              size={48}
              style={{ marginBottom: 12, color: '#6366f1' }}
            />
            <div style={{ fontWeight: 600 }}>
              {fileName || 'Выберите файл выписки'}
            </div>
            <div
              style={{ fontSize: 13, color: '#666', marginTop: 6 }}
            >
              Поддерживаются PDF и TXT
            </div>
            <input
              type="file"
              accept=".pdf,.txt"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </label>

          {loading && (
            <p style={{ textAlign: 'center', marginTop: 16 }}>
              ⏳ Обработка выписки…
            </p>
          )}

          {error && (
            <div
              style={{
                marginTop: 16,
                padding: 12,
                background: '#fee2e2',
                color: '#991b1b',
                borderRadius: 8
              }}
            >
              {error}
            </div>
          )}
        </div>

        {/* ANALYTICS */}
        {analytics && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 16,
              marginBottom: 32
            }}
          >
            <StatCard
              title="Доходы"
              value={`+${analytics.totalIncome.toFixed(2)}`}
              color="#16a34a"
              icon={<TrendingUp />}
            />
            <StatCard
              title="Расходы"
              value={`-${analytics.totalExpense.toFixed(2)}`}
              color="#dc2626"
              icon={<TrendingDown />}
            />
            <StatCard
              title="Баланс"
              value={`${analytics.balance >= 0 ? '+' : ''}${analytics.balance.toFixed(
                2
              )}`}
              color="#2563eb"
              icon={<DollarSign />}
            />
            <StatCard
              title="Категории"
              value={analytics.categories.length}
              color="#7c3aed"
              icon={<PieChart />}
            />
          </div>
        )}

        {/* TABLE */}
        {transactions.length > 0 && (
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: 24,
              boxShadow: '0 10px 20px rgba(0,0,0,0.05)'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16
              }}
            >
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>
                <FileText size={18} /> Транзакции ({transactions.length})
              </h2>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={exportToCSV}
                  style={buttonPrimary}
                >
                  <Download size={16} /> CSV
                </button>

                <button
                  onClick={handleClear}
                  style={buttonSecondary}
                >
                  <Trash2 size={16} /> Очистить
                </button>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse'
                }}
              >
                <thead>
                  <tr style={{ background: '#f1f5f9' }}>
                    <Th>Дата</Th>
                    <Th>Категория</Th>
                    <Th>Описание</Th>
                    <Th align="right">Приход</Th>
                    <Th align="right">Расход</Th>
                    <Th align="right">Остаток</Th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t, i) => (
                    <tr
                      key={i}
                      style={{
                        borderBottom:
                          '1px solid #e5e7eb'
                      }}
                    >
                      <Td>{t.date.toLocaleString()}</Td>
                      <Td>{t.category}</Td>
                      <Td>{t.description}</Td>
                      <Td
                        align="right"
                        style={{ color: '#16a34a' }}
                      >
                        {t.income
                          ? `+${t.income.toFixed(2)}`
                          : '—'}
                      </Td>
                      <Td
                        align="right"
                        style={{ color: '#dc2626' }}
                      >
                        {t.expense
                          ? `-${t.expense.toFixed(2)}`
                          : '—'}
                      </Td>
                      <Td align="right">
                        {t.balance.toFixed(2)}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================
   ВСПОМОГАТЕЛЬНЫЕ КОМПОНЕНТЫ
   ========================= */

function StatCard({
  title,
  value,
  color,
  icon
}: {
  title: string;
  value: string | number;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 12,
        padding: 20,
        boxShadow: '0 6px 12px rgba(0,0,0,0.05)'
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between'
        }}
      >
        <div>
          <div style={{ fontSize: 13, color: '#666' }}>
            {title}
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              color
            }}
          >
            {value}
          </div>
        </div>
        <div style={{ color }}>{icon}</div>
      </div>
    </div>
  );
}

function Th({
  children,
  align = 'left'
}: {
  children: React.ReactNode;
  align?: 'left' | 'right';
}) {
  return (
    <th
      style={{
        textAlign: align,
        padding: 10,
        fontSize: 12,
        color: '#555'
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = 'left',
  style = {}
}: {
  children: React.ReactNode;
  align?: 'left' | 'right';
  style?: React.CSSProperties;
}) {
  return (
    <td
      style={{
        textAlign: align,
        padding: 10,
        fontSize: 13,
        ...style
      }}
    >
      {children}
    </td>
  );
}

/* =========================
   СТИЛИ КНОПОК
   ========================= */

const buttonPrimary: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  background: '#4f46e5',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '8px 14px',
  cursor: 'pointer'
};

const buttonSecondary: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  background: '#e5e7eb',
  color: '#111',
  border: 'none',
  borderRadius: 8,
  padding: '8px 14px',
  cursor: 'pointer'
};
