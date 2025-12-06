import React, { useMemo, useState } from "react";
import * as d3 from "d3";

function formatMoneyRange(fromLog, toLog) {
  const f = 10 ** fromLog;
  const t = 10 ** toLog;
  const fmt = d3.format("~s"); // 10k, 2.3M, 1B
  return `$${fmt(f)} – $${fmt(t)}`;
}

export default function EarningsDistributionChart({ games, highlightedGame }) {
  const [tooltip, setTooltip] = useState(null);

  const {
    bins,
    kdePath,
    xScale,
    yScale,
    xTicks,
    yTicks,
    width,
    height,
    margin
  } = useMemo(() => {
    const width = 900;
    const height = 250;                         // a bit taller
    const margin = { top: 25, right: 30, bottom: 48, left: 70 };

    const values = games
      .map((g) => g.TotalEarnings)
      .filter((v) => v > 0)
      .map((v) => Math.log10(v));

    if (!values.length) {
      return {
        bins: [],
        kdePath: "",
        xScale: d3.scaleLinear([0, 1], [0, 1]),
        yScale: d3.scaleLinear([0, 1], [1, 0]),
        xTicks: [],
        yTicks: [],
        width,
        height,
        margin
      };
    }

    const minLog = d3.min(values);
    const maxLog = d3.max(values);

    const pad = 0.15;
    const domain = [minLog - pad, maxLog + pad];

    const xScale = d3
      .scaleLinear()
      .domain(domain)
      .range([margin.left, width - margin.right]);

    // Histogram on log-scale values
    const binGen = d3
      .bin()
      .domain(domain)
      .thresholds(20);

    const bins = binGen(values);
    const maxCount = d3.max(bins, (b) => b.length) || 1;

    const yScale = d3
      .scaleLinear()
      .domain([0, maxCount])
      .nice()
      .range([height - margin.bottom, margin.top + 10]);

    // Small set of y ticks (counts)
    const yTicks = d3.ticks(0, maxCount, Math.min(4, maxCount));

    // KDE
    const kernel = (u) => (Math.abs(u) <= 1 ? 0.75 * (1 - u * u) : 0); // Epanechnikov
    const bandwidth = (maxLog - minLog) / 12 || 0.2;

    const xs = d3.range(domain[0], domain[1], (domain[1] - domain[0]) / 200);

    const density = xs.map((x) => {
      const v =
        values.reduce((sum, v) => sum + kernel((x - v) / bandwidth), 0) /
        (values.length * bandwidth);
      return [x, v];
    });

    const maxDensity = d3.max(density, (d) => d[1]) || 1;

    const densityScale = d3
      .scaleLinear()
      .domain([0, maxDensity])
      .range([height - margin.bottom, margin.top + 10]);

    const line = d3
      .line()
      .x((d) => xScale(d[0]))
      .y((d) => densityScale(d[1]))
      .curve(d3.curveBasis);

    const kdePath = line(density);

    // X-axis ticks like $10k, $100k, $1M, $10M, $100M, $1B ...
    const logTicks = d3.range(4, 11); // 10^4..10^10
    const xTicks = logTicks.filter(
      (t) => t >= domain[0] && t <= domain[1]
    );

    return {
      bins,
      kdePath,
      xScale,
      yScale,
      xTicks,
      yTicks,
      width,
      height,
      margin
    };
  }, [games]);

  if (!bins.length) {
    return (
      <div className="scatter-card">
        <h2>Earnings distribution in this genre</h2>
        <p className="scatter-empty">
          Not enough games with prize money to show the distribution.
        </p>
      </div>
    );
  }

  return (
    <div className="scatter-card">
      <h2>Earnings distribution in this genre</h2>
      <p className="scatter-subtitle">
        Histogram of game prize pools with a smoothed KDE curve (log scale).
        Hover a bar to see how many games fall in that earnings band.
      </p>

      <svg width={width} height={height} className="scatter-svg">
        {/* X axis line */}
        <line
          x1={margin.left}
          x2={width - margin.right}
          y1={height - margin.bottom}
          y2={height - margin.bottom}
          className="scatter-axis-line"
        />

        {/* X axis ticks + labels */}
        {xTicks.map((t) => {
          const x = xScale(t);
          const value = 10 ** t;
          const fmt = d3.format("~s");
          return (
            <g key={t} transform={`translate(${x},0)`}>
              <line
                y1={height - margin.bottom}
                y2={height - margin.bottom + 4}
                className="scatter-tick-line"
              />
              <text
                y={height - margin.bottom + 14}
                textAnchor="middle"
                className="scatter-tick-label"
              >
                ${fmt(value)}
              </text>
            </g>
          );
        })}

        {/* X axis title – moved a bit up so it’s always visible */}
        <text
          x={(margin.left + width - margin.right) / 2}
          y={height - margin.bottom + 30}
          textAnchor="middle"
          className="scatter-axis-title"
        >
          Game total earnings (log scale)
        </text>

        {/* Y axis line */}
        <line
          x1={margin.left}
          x2={margin.left}
          y1={height - margin.bottom}
          y2={margin.top}
          className="scatter-axis-line"
        />

        {/* Y axis ticks + labels (counts of games) */}
        {yTicks.map((t) => {
          const y = yScale(t);
          return (
            <g key={t}>
              <line
                x1={margin.left - 4}
                x2={margin.left}
                y1={y}
                y2={y}
                className="scatter-tick-line"
              />
              <text
                x={margin.left - 8}
                y={y + 3}
                textAnchor="end"
                className="scatter-tick-label"
              >
                {t}
              </text>
            </g>
          );
        })}

        {/* Y axis title */}
        <text
          transform={`translate(20 ${
            (height - margin.bottom + margin.top) / 2
          }) rotate(-90)`}
          textAnchor="middle"
          className="scatter-axis-title"
        >
          Density / number of games
        </text>

        {/* Histogram bars */}
        {bins.map((bin, i) => {
          if (!bin.length) return null;
          const x0 = xScale(bin.x0);
          const x1 = xScale(bin.x1);
          const barWidth = Math.max(0, x1 - x0 - 2);
          const barHeight = height - margin.bottom - yScale(bin.length);

          return (
            <rect
              key={i}
              x={x0 + 1}
              y={yScale(bin.length)}
              width={barWidth}
              height={barHeight}
              fill="#0ea5e9"
              opacity={0.6}
              onMouseEnter={(e) => {
                const [mx, my] = d3.pointer(e);
                setTooltip({
                  x: mx,
                  y: my,
                  count: bin.length,
                  fromLog: bin.x0,
                  toLog: bin.x1
                });
              }}
              onMouseMove={(e) => {
                const [mx, my] = d3.pointer(e);
                setTooltip((prev) =>
                  prev ? { ...prev, x: mx, y: my } : prev
                );
              }}
              onMouseLeave={() => setTooltip(null)}
            />
          );
        })}

        {/* KDE curve */}
        <path
          d={kdePath}
          fill="none"
          stroke="#38bdf8"
          strokeWidth={2}
        />

        {/* Tooltip – clamp X so it doesn’t go off the edges */}
        {tooltip && (
          (() => {
            const boxWidth = 170;
            const half = boxWidth / 2;
            const minX = margin.left + half;
            const maxX = width - margin.right - half;
            const tx = Math.min(Math.max(tooltip.x, minX), maxX);

            return (
              <g
                transform={`translate(${tx},${tooltip.y - 12})`}
                pointerEvents="none"
              >
                <rect
                  x={-half}
                  y={-40}
                  width={boxWidth}
                  height={38}
                  rx={6}
                  ry={6}
                  fill="#020617"
                  stroke="#38bdf8"
                  strokeWidth={0.8}
                  opacity={0.95}
                />
                <text
                  x={-half + 8}
                  y={-24}
                  className="scatter-tick-label"
                >
                  {tooltip.count} game
                  {tooltip.count !== 1 ? "s" : ""}
                </text>
                <text
                  x={-half + 8}
                  y={-10}
                  className="scatter-tick-label"
                >
                  {formatMoneyRange(tooltip.fromLog, tooltip.toLog)}
                </text>
              </g>
            );
          })()
        )}
      </svg>
    </div>
  );
}
