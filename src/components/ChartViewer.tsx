import Plot from 'react-plotly.js';
type PlotLayout = any;
export const ChartViewer = ({ data }: { data: any[] }) => {
  if (!data || data.length === 0) return <p>Нет данных для отображения</p>;

  // ✅ Масштабируем ось X: 1 точка = 0.02 мс (для 50 Гц)
  const time = data.map((_, i) => i * 0.02); // 0.02 мс = 1/50 Гц
  const r = data.map((d) => d.current_R);
  const s = data.map((d) => d.current_S);
  const t = data.map((d) => d.current_T);

  const layout: PlotLayout = {
    width: 1700,
    height: 500,
    title: {
      text: 'Динамика работы двигателя',
      font: { size: 18, family: 'Inter, sans-serif', color: '#111827' },
      x: 0.5,
      xref: 'paper',
      xanchor: 'center',
    },
    xaxis: {
      range: [0, time[time.length - 1]],
      tickfont: { size: 12, color: '#4B5563' },
      gridcolor: '#E5E7EB',
      gridwidth: 1,
      zeroline: true,
      zerolinecolor: '#D1D5DB',
      zerolinewidth: 1,
    },
    yaxis: {
      tickfont: { size: 12, color: '#4B5563' },
      gridcolor: '#E5E7EB',
      gridwidth: 1,
      zeroline: true,
      zerolinecolor: '#D1D5DB',
      zerolinewidth: 1,
    },
    hovermode: 'closest',
    margin: { l: 40, r: 40, t: 60, b: 40 },
    plot_bgcolor: '#FFFFFF',
    paper_bgcolor: '#FFFFFF',
  };

  return (
    <div className="block bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden transition-all hover:shadow-xl">
      <div className="px-6 pt-6 pb-2">
        <h3 className="text-xl font-semibold text-gray-800">Графики показаний датчиков</h3>
      </div>
      <div className="px-6 pb-6">
        <Plot
          data={[
            {
              x: time,
              y: r,
              type: 'scatter',
              mode: 'lines',
              name: 'Фаза R',
              line: { width: 2 },
            },
            {
              x: time,
              y: s,
              type: 'scatter',
              mode: 'lines',
              name: 'Фаза S',
              line: { width: 2 },
            },
            {
              x: time,
              y: t,
              type: 'scatter',
              mode: 'lines',
              name: 'Фаза T',
              line: { width: 2 },
            },
          ]}
          layout={layout}
          config={{
            responsive: true,
            displayModeBar: true,
            modeBarButtonsToRemove: ['select2d', 'lasso2d', 'resetScale2d'],
            displaylogo: false,
          }}
        />
      </div>
    </div>
  );
};
