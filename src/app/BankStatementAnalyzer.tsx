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

import { ocrFallback } from '../ocr/ocrFallback';

/* =========================
   ВСПОМОГАТЕЛЬНАЯ ЛОГИКА
   ========================= */

// защита от дублей + объединение
function mergeTransactions(
  existing: Transaction[],
  incoming: Transaction[]
): Transaction[] {
  const map = new Map<string, Transaction>();

  [...existing, ...incoming].forEach(t => {
    const key = [
      t.date.toISOString(),
      t.income,
      t.expense,
      t.description,
      t.bank
    ].join('|');

    map.set(key, t);
  });

  return Array.from(map.values()).sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );
}

export default function BankStatementAnalyzer() {
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Состояние для OCR прогресса
  const [ocrProgress, setOcrProgress] = useState<number>(0);
  const [ocrStatus, setOcrStatus] = useState<string>('');
  const [currentFile, setCurrentFile] = useState<string>('');

  /* =========================
     ЗАГРУЗКА ДАННЫХ ИЗ IndexedDB
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
        console.warn('Ошибка загрузки данных из хранилища', e);
      }
    })();
  }, []);

  /* =========================
     ЗАГРУЗКА ФАЙЛОВ (MULTI)
     ========================= */
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    setLoading(true);
    setError(null);
    setFileNames(files.map(f => f.name));
    setOcrProgress(0);
    setOcrStatus('');
    setCurrentFile('');

    try {
      let aggregated: Transaction[] = [...transactions];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setCurrentFile(`Обработка ${i + 1}/${files.length}: ${file.name}`);
        
        // 1. пробуем обычный text layer
        let text = await extractText(file);
        let parsed = parse(text);
      
        // 2. если транзакций нет И это PDF → пробуем OCR
        if (!parsed.length && (file.type === 'application/pdf' || file.name.endsWith('.pdf'))) {
          console.warn(`PDF ${file.name}: пробуем OCR fallback`);
          
          try {
            const ocrText = await ocrFallback(file, (progress, status) => {
              setOcrProgress(progress);
              setOcrStatus(status);
            });
            
            parsed = parse(ocrText);
            
            // Сбрасываем прогресс после завершения OCR
            setOcrProgress(0);
            setOcrStatus('');
          } catch (ocrError: any) {
            console.error(`OCR ошибка для ${file.name}:`, ocrError);
            setError(`OCR ошибка для ${file.name}: ${ocrError.message}`);
            // Продолжаем обработку других файлов
            continue;
          }
        }
      
        // 3. если всё равно пусто — пропускаем файл
        if (!parsed.length) {
          console.warn(`Файл ${file.name} не дал транзакций даже после OCR`);
          continue;
        }
      
        aggregated = mergeTransactions(aggregated, parsed);
      }

      if (!aggregated.length) {
        throw new Error('Не удалось извлечь транзакции из файлов');
      }

      setTransactions(aggregated);
      setAnalytics(calculateAnalytics(aggregated));
      await saveTransactions(aggregated);
      
      // Успешное завершение
      setCurrentFile('');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Ошибка обработки файлов');
    } finally {
      setLoading(false);
      setOcrProgress(0);
      setOcrStatus('');
      setCurrentFile('');
      // сбрасываем input, чтобы можно было загрузить те же файлы повторно
      e.target.value = '';
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
     ОЧИСТКА ВСЕХ ДАННЫХ
     ========================= */
  const handleClear = async () => {
    if (!confirm('Удалить все транзакции? Это действие нельзя отменить.')) {
      return;
    }
    
    await clearTransactions();
    setTransactions([]);
    setAnalytics(null);
    setFileNames([]);
    setError(null);
  };

  /* =========================
     UI
     ========================= */
  return (
    <div style={{ minHeight: '100vh', background: '#eef2ff', padding: 24 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* HEADER */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 32, fontWeight: 700 }}>
            Агрегатор личных финансов
          </h1>
          <p style={{ color: '#555', marginTop: 8 }}>
            Загрузите несколько выписок из разных банков
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
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            <Upload size={48} style={{ marginBottom: 12, color: '#6366f1' }} />
            <div style={{ fontWeight: 600 }}>
              {fileNames.length
                ? `Выбрано файлов: ${fileNames.length}`
                : 'Выберите файлы выписок'}
            </div>
            <div style={{ fontSize: 13, color: '#666', marginTop: 6 }}>
              Можно загрузить несколько PDF / TXT файлов разных банков
            </div>
            <input
              type="file"
              accept=".pdf,.txt"
              multiple
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              disabled={loading}
            />
          </label>

          {/* Индикатор обработки */}
          {loading && (
            <div style={{ marginTop: 20 }}>
              {/* Текущий файл */}
              {currentFile && (
                <p style={{ 
                  textAlign: 'center', 
                  fontSize: 14,
                  color: '#555',
                  marginBottom: 12
                }}>
                  {currentFile}
                </p>
              )}
              
              {/* OCR прогресс */}
              {ocrProgress > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    fontSize: 13,
                    color: '#666',
                    marginBottom: 8
                  }}>
                    <span>🔍 OCR распознавание: {ocrStatus}</span>
                    <span>{Math.round(ocrProgress * 100)}%</span>
                  </div>
                  
                  {/* Прогресс бар */}
                  <div style={{
                    width: '100%',
                    height: 8,
                    background: '#e5e7eb',
                    borderRadius: 4,
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${ocrProgress * 100}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #4f46e5, #7c3aed)',
                      transition: 'width 0.3s ease',
                      borderRadius: 4
                    }} />
                  </div>
                  
                  <p style={{ 
                    fontSize: 12, 
                    color: '#999', 
                    marginTop: 8,
                    textAlign: 'center'
                  }}>
                    OCR может занять 30-60 секунд для большого файла
                  </p>
                </div>
              )}
              
              {/* Спиннер если OCR не активен */}
              {!ocrProgress && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    display: 'inline-block',
                    width: 32,
                    height: 32,
                    border: '3px solid #e5e7eb',
                    borderTop: '3px solid #4f46e5',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  <p style={{ marginTop: 12, color: '#666' }}>
                    ⏳ Обработка файлов…
                  </p>
                  
                  <style>{`
                    @keyframes spin {
                      0% { transform: rotate(0deg); }
                      100% { transform: rotate(360deg); }
                    }
                  `}</style>
                </div>
              )}
            </div>
          )}

          {/* Ошибка */}
          {error && (
            <div
              style={{
                marginTop: 16,
                padding: 12,
                background: '#fee2e2',
                color: '#991b1b',
                borderRadius: 8,
                fontSize: 14
              }}
            >
              <strong>Ошибка:</strong> {error}
              <p style={{ fontSize: 12, marginTop: 6, color: '#b91c1c' }}>
                Попробуйте экспортировать выписку в формат TXT или проверьте, 
                что файл не повреждён
              </p>
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
              value={`+${analytics.totalIncome.toFixed(2)} BYN`}
              color="#16a34a"
              icon={<TrendingUp />}
            />
            <StatCard
              title="Расходы"
              value={`-${analytics.totalExpense.toFixed(2)} BYN`}
              color="#dc2626"
              icon={<TrendingDown />}
            />
            <StatCard
              title="Баланс"
              value={`${analytics.balance >= 0 ? '+' : ''}${analytics.balance.toFixed(
                2
              )} BYN`}
              color="#2563eb"
              icon={<DollarSign />}
            />
            <StatCard
              title="Категорий"
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
                marginBottom: 16,
                flexWrap: 'wrap',
                gap: 12
              }}
            >
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
                <FileText size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />
                Транзакции ({transactions.length})
              </h2>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={exportToCSV} style={buttonPrimary}>
                  <Download size={16} /> CSV
                </button>
                <button onClick={handleClear} style={buttonSecondary}>
                  <Trash2 size={16} /> Очистить
                </button>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9' }}>
                    <Th>Дата</Th>
                    <Th>Банк</Th>
                    <Th>Категория</Th>
                    <Th>Описание</Th>
                    <Th align="right">Приход</Th>
                    <Th align="right">Расход</Th>
                    <Th align="right">Остаток</Th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <Td>{t.date.toLocaleString('ru-RU', { 
                        year: 'numeric', 
                        month: '2-digit', 
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</Td>
                      <Td>
                        <span style={{
                          fontSize: 11,
                          background: '#f3f4f6',
                          padding: '2px 8px',
                          borderRadius: 4
                        }}>
                          {t.bank}
                        </span>
                      </Td>
                      <Td>{t.category}</Td>
                      <Td style={{ maxWidth: 300 }}>{t.description}</Td>
                      <Td align="right" style={{ color: '#16a34a', fontWeight: 500 }}>
                        {t.income ? `+${t.income.toFixed(2)}` : '—'}
                      </Td>
                      <Td align="right" style={{ color: '#dc2626', fontWeight: 500 }}>
                        {t.expense ? `-${t.expense.toFixed(2)}` : '—'}
                      </Td>
                      <Td align="right" style={{ fontWeight: 500 }}>
                        {t.balance.toFixed(2)}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Empty state */}
        {!loading && transactions.length === 0 && !error && (
          <div style={{
            background: '#fff',
            borderRadius: 12,
            padding: 60,
            textAlign: 'center',
            boxShadow: '0 10px 20px rgba(0,0,0,0.05)'
          }}>
            <FileText size={64} style={{ color: '#d1d5db', marginBottom: 16 }} />
            <h3 style={{ fontSize: 18, color: '#666', marginBottom: 8 }}>
              Нет загруженных транзакций
            </h3>
            <p style={{ color: '#999', fontSize: 14 }}>
              Загрузите выписки из банков для начала анализа
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================
   МЕЛКИЕ КОМПОНЕНТЫ
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>{title}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
        </div>
        <div style={{ color, opacity: 0.8 }}>{icon}</div>
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
    <th style={{ 
      textAlign: align, 
      padding: 10, 
      fontSize: 12, 
      color: '#555',
      fontWeight: 600,
      textTransform: 'uppercase'
    }}>
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
    <td style={{ 
      textAlign: align, 
      padding: 10, 
      fontSize: 13,
      ...style 
    }}>
      {children}
    </td>
  );
}

const buttonPrimary: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  background: '#4f46e5',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '8px 14px',
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 500,
  transition: 'background 0.2s'
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
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 500,
  transition: 'background 0.2s'
};
