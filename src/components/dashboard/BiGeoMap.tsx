import React, { useState } from 'react';
import { GeoAnalyticsResult, GeoRegionDatum, formatBiMetric } from '../../utils/biDashboard';
import { ContextMenuTarget } from './BiChartPanel';
import { MapPin, Layers } from 'lucide-react';

interface BiGeoMapProps {
  geo: GeoAnalyticsResult;
  primaryMetric: string | null;
  activeCrossFilterValue?: string | null;
  onSelectRegion: (region: string) => void;
  onOpenContextMenu: (target: ContextMenuTarget) => void;
  chartColors: string[];
}

export const BiGeoMap: React.FC<BiGeoMapProps> = ({
  geo,
  primaryMetric,
  activeCrossFilterValue,
  onSelectRegion,
  onOpenContextMenu,
  chartColors,
}) => {
  const [hoveredRegion, setHoveredRegion] = useState<GeoRegionDatum | null>(null);

  if (!geo.hasGeoData) {
    // Relevant analytical visualization when dataset has no geographical column
    const maxVal = Math.max(...geo.alternativeBreakdown.items.map(i => i.metricValue), 1);
    return (
      <div className="space-y-3 h-full flex flex-col justify-between">
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[11px]">
          <Layers className="w-4 h-4 text-[var(--color-primary)] shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-[var(--text-main)]">{geo.alternativeBreakdown.title}</div>
            <div className="text-[var(--text-secondary)]">{geo.alternativeBreakdown.subtitle}</div>
          </div>
        </div>

        <div className="space-y-2 flex-1">
          {geo.alternativeBreakdown.items.slice(0, 6).map((item, idx) => {
            const pctWidth = Math.max(4, Math.min(100, (item.metricValue / maxVal) * 100));
            return (
              <div key={item.label} className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-medium text-[var(--text-main)] truncate">{item.label}</span>
                  <span className="text-[var(--text-secondary)] tabular-nums shrink-0 ml-2">
                    {formatBiMetric(item.metricValue, primaryMetric)} ({item.sharePct}%)
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-[var(--bg-secondary)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${pctWidth}%`,
                      backgroundColor: chartColors[idx % chartColors.length],
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const maxRegionVal = Math.max(...geo.regions.map(r => r.value), 1);

  return (
    <div className="space-y-3">
      {/* Interactive SVG Indonesia Archipelago Map */}
      <div className="relative rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)]/55 overflow-hidden p-2">
        <svg
          viewBox="0 0 800 300"
          role="img"
          aria-label="Peta Distribusi Geografis Indonesia"
          className="w-full h-44 sm:h-48 select-none"
        >
          {/* Subtle coordinate grid lines */}
          <g stroke="var(--border-color)" strokeOpacity="0.45" strokeDasharray="3 4" strokeWidth="0.8">
            <line x1="0" y1="75" x2="800" y2="75" />
            <line x1="0" y1="150" x2="800" y2="150" />
            <line x1="0" y1="225" x2="800" y2="225" />
            <line x1="200" y1="0" x2="200" y2="300" />
            <line x1="400" y1="0" x2="400" y2="300" />
            <line x1="600" y1="0" x2="600" y2="300" />
          </g>

          {/* Stylized Indonesian Islands Silhouettes */}
          <g fill="var(--accent-cream)" fillOpacity="0.38" stroke="var(--color-secondary)" strokeWidth="1.2">
            {/* Sumatra */}
            <path d="M55,36 L88,42 L130,82 L166,125 L194,166 L216,196 L195,205 L160,175 L125,134 L82,92 L48,54 Z" />
            {/* Java */}
            <path d="M214,209 L275,214 L340,222 L370,231 L345,239 L280,236 L220,226 Z" />
            {/* Bali & Nusa Tenggara */}
            <path d="M375,232 L405,236 L445,238 L480,242 L470,248 L430,245 L385,241 Z" />
            {/* Kalimantan */}
            <path d="M270,96 L332,76 L385,84 L402,118 L392,155 L350,172 L292,165 L268,136 Z" />
            {/* Sulawesi */}
            <path d="M446,110 L488,88 L528,90 L520,108 L484,116 L496,154 L478,192 L456,190 L460,152 L442,135 Z" />
            {/* Maluku Islands */}
            <path d="M562,102 L584,96 L592,126 L576,138 Z" />
            <path d="M588,154 L622,148 L628,168 L595,172 Z" />
            {/* Papua */}
            <path d="M645,120 L702,116 L765,134 L772,196 L722,190 L688,168 L652,152 Z" />
          </g>

          {/* Interactive Data Bubbles */}
          {geo.regions.map((reg, idx) => {
            const cx = (reg.xPct / 100) * 800;
            const cy = (reg.yPct / 100) * 300;
            const ratio = reg.value / maxRegionVal;
            const radius = 9 + ratio * 15;
            const isSelected = activeCrossFilterValue === reg.region;
            const color = chartColors[idx % chartColors.length];

            return (
              <g
                key={reg.region}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredRegion(reg)}
                onMouseLeave={() => setHoveredRegion(null)}
                onClick={() => onSelectRegion(reg.region)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onOpenContextMenu({
                    panelId: 'geo',
                    panelTitle: 'Geographical Analytics',
                    column: geo.geoCol || 'Region',
                    value: reg.region,
                    x: e.clientX,
                    y: e.clientY,
                    canDrillDown: true,
                  });
                }}
              >
                {isSelected && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={radius + 6}
                    fill="none"
                    stroke="var(--color-primary)"
                    strokeWidth="2.5"
                  />
                )}
                <circle
                  cx={cx}
                  cy={cy}
                  r={radius}
                  fill={color}
                  fillOpacity={activeCrossFilterValue && !isSelected ? 0.35 : 0.85}
                  stroke="var(--bg-card)"
                  strokeWidth="2"
                />
                <text
                  x={cx}
                  y={cy + radius + 12}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="600"
                  fill="var(--text-main)"
                >
                  {reg.region}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip Overlay */}
        {hoveredRegion && (
          <div className="absolute top-2 right-2 px-3 py-2 rounded-lg surface-card shadow-md text-[11px] pointer-events-none z-10">
            <div className="font-bold text-[var(--text-main)] flex items-center gap-1">
              <MapPin className="w-3 h-3 text-[var(--color-primary)]" />
              <span>{hoveredRegion.region}</span>
            </div>
            <div className="text-[var(--text-secondary)] tabular-nums mt-0.5">
              {primaryMetric || 'Nilai'}: <strong className="text-[var(--text-main)]">{formatBiMetric(hoveredRegion.value, primaryMetric)}</strong>
            </div>
            <div className="text-[var(--text-secondary)] tabular-nums">
              Share: {hoveredRegion.sharePct}% · {hoveredRegion.count} records
            </div>
          </div>
        )}
      </div>

      {/* Top Regions Ranking Bar Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
        {geo.regions.slice(0, 6).map((reg, idx) => {
          const isSelected = activeCrossFilterValue === reg.region;
          const barWidth = Math.max(6, Math.round((reg.value / maxRegionVal) * 100));
          return (
            <button
              key={reg.region}
              type="button"
              onClick={() => onSelectRegion(reg.region)}
              onContextMenu={(e) => {
                e.preventDefault();
                onOpenContextMenu({
                  panelId: 'geo',
                  panelTitle: 'Geographical Analytics',
                  column: geo.geoCol || 'Region',
                  value: reg.region,
                  x: e.clientX,
                  y: e.clientY,
                  canDrillDown: true,
                });
              }}
              className={`text-left p-1.5 rounded-lg transition-theme cursor-pointer ${
                isSelected
                  ? 'bg-[var(--bg-caramel-soft)] ring-1 ring-[var(--color-primary)]'
                  : 'hover:bg-[var(--bg-secondary)]'
              }`}
            >
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-[var(--text-main)] truncate">{reg.region}</span>
                <span className="text-[var(--text-secondary)] tabular-nums shrink-0 ml-1">
                  {formatBiMetric(reg.value, primaryMetric)} ({reg.sharePct}%)
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-[var(--bg-secondary)] mt-1 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${barWidth}%`,
                    backgroundColor: chartColors[idx % chartColors.length],
                  }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
