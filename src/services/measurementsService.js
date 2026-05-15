const MEASUREMENTS_API_URL = 'https://solar-backend-98oy.onrender.com/api/measurements';

export const MAX_RANGE_MINUTES = 12 * 60;

export const mapMeasurementDocuments = (documents, maxPoints = 500) => {
  return documents
    .reverse()
    .map((doc) => {
      const ts = doc.marca_tiempo
        ? (doc.marca_tiempo < 1e12 ? doc.marca_tiempo * 1000 : doc.marca_tiempo)
        : new Date(doc.recibido_en).getTime();

      const pv = doc.voltaje_panel || 0;
      const pc = doc.corriente_panel || 0;
      const bv = doc.voltaje_bateria || 0;
      const bc = doc.corriente_bateria || 0;
      const lc = doc.corriente_carga || 0;

      return {
        time: new Date(ts).toLocaleTimeString('es-ES', { hour12: false }),
        panel_voltage: pv,
        panel_current: pc,
        panel_power: Math.round(pv * pc * 1000) / 1000,
        battery_voltage: bv,
        battery_current: bc,
        battery_power: Math.round(bv * bc * 1000) / 1000,
        load_voltage: bv,
        load_current: lc,
        load_power: Math.round(bv * lc * 1000) / 1000,
        power: doc.potencia || 0,
        timestamp: ts
      };
    })
    .slice(-maxPoints);
};

export const fetchMeasurementsByRange = async ({ fromIso, toIso }) => {
  const fromDate = new Date(fromIso);
  const toDate = new Date(toIso);
  const rangeMinutes = Math.max(1, Math.ceil((toDate.getTime() - fromDate.getTime()) / (60 * 1000)));

  const query = new URLSearchParams({ from: fromIso, to: toIso });
  const response = await fetch(`${MEASUREMENTS_API_URL}/range?${query.toString()}`);
  let payload = null;

  try {
    payload = await response.json();
  } catch (_err) {
    payload = null;
  }

  if (response.ok && payload?.success) {
    return {
      documents: Array.isArray(payload.data) ? payload.data : [],
      range: payload.range || null
    };
  }

  const backendWithoutRangeEndpoint =
    response.status === 404 ||
    payload?.error?.includes('24 hex characters') ||
    payload?.error?.includes('Medición no encontrada');

  const nowDeltaMinutes = Math.abs(Date.now() - toDate.getTime()) / (60 * 1000);
  const canUseRecentFallback = backendWithoutRangeEndpoint && nowDeltaMinutes <= 5;

  if (canUseRecentFallback) {
    const fallbackResponse = await fetch(`${MEASUREMENTS_API_URL}/recent?minutes=${rangeMinutes}`);
    const fallbackPayload = await fallbackResponse.json();

    if (!fallbackResponse.ok || !fallbackPayload.success) {
      throw new Error(fallbackPayload.error || 'No se pudo obtener histórico por rango');
    }

    return {
      documents: Array.isArray(fallbackPayload.data) ? fallbackPayload.data : [],
      range: {
        from: fromIso,
        to: toIso,
        minutes: rangeMinutes,
        fallback: 'recent'
      }
    };
  }

  if (backendWithoutRangeEndpoint) {
    throw new Error('El backend remoto aún no soporta rango absoluto. Actualiza y despliega el backend para usar rangos personalizados antiguos.');
  }

  throw new Error(payload?.error || 'No se pudo obtener histórico por rango');
};
