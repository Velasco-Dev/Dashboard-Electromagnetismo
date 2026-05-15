import React, { useEffect, useMemo, useState } from 'react';
import { X, Clock3, History } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { fetchMeasurementsByRange, mapMeasurementDocuments, MAX_RANGE_MINUTES } from '../services/measurementsService';

const minutesBetween = (fromIso, toIso) => {
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  return Math.max(0, Math.ceil((to - from) / (60 * 1000)));
};

const toDateTimeLocalValue = (date) => {
  const pad = (num) => String(num).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const fromDateTimeLocalToIso = (value) => new Date(value).toISOString();

const getDefaultRangeValues = (anchorTimestamp) => {
  const anchor = anchorTimestamp ? new Date(anchorTimestamp) : new Date();
  const from = new Date(anchor.getTime() - 30 * 60 * 1000);
  return {
    from: toDateTimeLocalValue(from),
    to: toDateTimeLocalValue(anchor)
  };
};

function HistoricalChartModal({
  isOpen,
  onClose,
  title,
  dataKey,
  colorHex,
  gradientId,
  realtimeData
}) {
  const [chartData, setChartData] = useState(realtimeData);
  const [mode, setMode] = useState('realtime');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resultMeta, setResultMeta] = useState(null);

  const initialRange = useMemo(() => getDefaultRangeValues(), []);
  const [fromInput, setFromInput] = useState(initialRange.from);
  const [toInput, setToInput] = useState(initialRange.to);

  useEffect(() => {
    if (!isOpen) return;

    const lastRealtimeTimestamp = realtimeData.length > 0
      ? realtimeData[realtimeData.length - 1].timestamp
      : null;

    setChartData(realtimeData);
    setMode('realtime');
    setLoading(false);
    setError('');
    setResultMeta(null);
    const freshRange = getDefaultRangeValues(lastRealtimeTimestamp);
    setFromInput(freshRange.from);
    setToInput(freshRange.to);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || mode !== 'realtime') return;
    setChartData(realtimeData);
  }, [isOpen, mode, realtimeData]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const handleFetchRange = async () => {
    setError('');

    if (!fromInput || !toInput) {
      setError('Debes seleccionar fecha/hora de inicio y fin.');
      return;
    }

    const fromIso = fromDateTimeLocalToIso(fromInput);
    const toIso = fromDateTimeLocalToIso(toInput);
    const rangeMinutes = minutesBetween(fromIso, toIso);

    if (rangeMinutes <= 0) {
      setError('El rango debe ser mayor a 0 minutos.');
      return;
    }

    if (rangeMinutes > MAX_RANGE_MINUTES) {
      setError(`Rango demasiado grande. Máximo permitido: ${MAX_RANGE_MINUTES} minutos.`);
      return;
    }

    try {
      setLoading(true);
      const { documents, range } = await fetchMeasurementsByRange({ fromIso, toIso });
      const mapped = mapMeasurementDocuments(documents, 500);
      setChartData(mapped);
      setResultMeta(range);
      setMode('historical');
    } catch (err) {
      setError(err.message || 'No se pudo consultar histórico');
    } finally {
      setLoading(false);
    }
  };

  const handleShowRealtime = () => {
    setMode('realtime');
    setChartData(realtimeData);
    setError('');
    setResultMeta(null);
  };

  return (
    <div className="history-modal" role="dialog" aria-modal="true" aria-label={title}>
      <div className="history-modal__backdrop" onClick={onClose}></div>
      <div className="history-modal__panel card">
        <div className="history-modal__header">
          <div>
            <div className="history-modal__eyebrow">Detalle de gráfica</div>
            <h3 className="history-modal__title">{title}</h3>
          </div>
          <button className="history-modal__close" onClick={onClose} aria-label="Cerrar modal">
            <X size={18} />
          </button>
        </div>

        <div className="history-modal__chart">
          {chartData.length === 0 && <div className="chart-card__empty">No hay datos para el rango seleccionado.</div>}
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colorHex} stopOpacity={0.65} />
                  <stop offset="95%" stopColor={colorHex} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" stroke="var(--chart-axis)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--chart-axis)" fontSize={12} tickLine={false} axisLine={false} />
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--tooltip-bg)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '1rem', color: 'var(--text-main)', boxShadow: '0 18px 40px rgba(0, 0, 0, 0.24)', backdropFilter: 'blur(18px)' }}
                itemStyle={{ color: colorHex }}
                labelStyle={{ color: 'var(--text-soft)' }}
              />
              <Area type="monotone" dataKey={dataKey} stroke={colorHex} strokeWidth={2.5} fillOpacity={1} fill={`url(#${gradientId})`} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="history-modal__controls">
          <label className="history-control">
            <span>Desde</span>
            <input type="datetime-local" value={fromInput} onChange={(event) => setFromInput(event.target.value)} />
          </label>

          <label className="history-control">
            <span>Hasta</span>
            <input type="datetime-local" value={toInput} onChange={(event) => setToInput(event.target.value)} />
          </label>

          <button className="history-modal__btn history-modal__btn--primary" onClick={handleFetchRange} disabled={loading}>
            <Clock3 size={16} />
            {loading ? 'Consultando...' : 'Consultar rango'}
          </button>

          <button className="history-modal__btn history-modal__btn--ghost" onClick={handleShowRealtime}>
            <History size={16} />
            Tiempo real
          </button>
        </div>

        <div className="history-modal__meta">
          <span>Modo: {mode === 'realtime' ? 'Tiempo real' : 'Histórico (MongoDB)'}</span>
          <span>Límite máximo de rango: {MAX_RANGE_MINUTES} minutos</span>
          {resultMeta && <span>Datos devueltos: {chartData.length}</span>}
          {resultMeta?.fallback === 'recent' && <span>Consulta compatible: usando ventana reciente</span>}
        </div>

        {error && <div className="history-modal__error">{error}</div>}
      </div>
    </div>
  );
}

export default HistoricalChartModal;
