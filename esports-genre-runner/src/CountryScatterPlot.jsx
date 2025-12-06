import { useMemo, useState } from "react";
import * as d3 from "d3";

const WIDTH = 560;
const HEIGHT = 360;

function formatMoneyShort(value) {
  if (!value || value <= 0) return "$0";
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function formatPerPlayer(earnings, players) {
  if (!players || players <= 0) return "N/A";
  const v = earnings / players;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M / player`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K / player`;
  return `$${v.toFixed(0)} / player`;
}

function CountryScatterPlot({ stats, selectedGenre }) {
  const [hovered, setHovered] = useState(null);

  const {
    data,
    xScale,
    yScale,
    xTicks,
    yTicks,
    regressionLine,
  } = useMemo(() => {
    const margin = { top: 20, right: 20, bottom: 40, left: 60 };
    const innerWidth = WIDTH - margin.left - margin.right;
    const innerHeight = HEIGHT - margin.top - margin.bottom;

    const data = (stats || []).filter(
      (d) => d.players > 0 && d.earnings > 0
    );

    if (data.length === 0) {
      return {
        data: [],
        xScale: null,
        yScale: null,
        xTicks: [],
        yTicks: [],
        regressionLine: null,
      };
    }

    const minPlayers = d3.min(data, (d) => d.players);
    const maxPlayers = d3.max(data, (d) => d.players);
    const minEarn = d3.min(data, (d) => d.earnings);
    const maxEarn = d3.max(data, (d) => d.earnings);

    // domains with a bit of padding
    const xDomainMin = Math.max(1, minPlayers * 0.8);
    const xDomainMax = maxPlayers * 1.2;
    const yDomainMin = Math.max(1, minEarn * 0.8);
    const yDomainMax = maxEarn * 1.2;

    // log scales so small & big countries are visible
    const xScale = d3
        .scaleLog()
        .domain([xDomainMin, xDomainMax])
        .range([0, innerWidth]);

    const yScale = d3
        .scaleLog()
        .domain([yDomainMin, yDomainMax])
        .range([innerHeight, 0]);

    // ✨ manual tick values so labels don't overlap
    const possibleXTicks = [1, 10, 100, 1000, 10000, 100000, 1000000];
    const xTicks = possibleXTicks.filter(
        (t) => t >= xDomainMin && t <= xDomainMax
    );

    // do the same for y (powers of 10)
    const possibleYTicks = [100, 1000, 10000, 100000, 1000000, 10000000];
    const yTicks = possibleYTicks.filter(
        (t) => t >= yDomainMin && t <= yDomainMax
    );


    // simple log–log regression: log(players) -> log(earnings)
    let regressionLine = null;
    if (data.length >= 3) {
      const pts = data.map((d) => ({
        x: Math.log(d.players),
        y: Math.log(d.earnings),
      }));
      const n = pts.length;
      let sumX = 0,
        sumY = 0,
        sumXY = 0,
        sumX2 = 0;
      pts.forEach((p) => {
        sumX += p.x;
        sumY += p.y;
        sumXY += p.x * p.y;
        sumX2 += p.x * p.x;
      });
      const denom = n * sumX2 - sumX * sumX;
      if (denom !== 0) {
        const m = (n * sumXY - sumX * sumY) / denom;
        const b = (sumY - m * sumX) / n;

        const xLogMin = Math.log(Math.max(1, minPlayers));
        const xLogMax = Math.log(maxPlayers);
        const yLogMin = m * xLogMin + b;
        const yLogMax = m * xLogMax + b;
        const yStart = Math.exp(yLogMin);
        const yEnd = Math.exp(yLogMax);

        regressionLine = {
          x1: xScale(Math.exp(xLogMin)),
          y1: yScale(yStart),
          x2: xScale(Math.exp(xLogMax)),
          y2: yScale(yEnd),
        };
      }
    }

    // attach chart geometry info onto scales so we can use later
    xScale.innerWidth = innerWidth;
    yScale.innerHeight = innerHeight;
    xScale.margin = margin;
    yScale.margin = margin;

    return { data, xScale, yScale, xTicks, yTicks, regressionLine };
  }, [stats]);

  if (!stats || stats.length === 0) {
    return (
      <div className="scatter-card">
        <h2>Country efficiency — earnings vs players</h2>
        <p className="scatter-subtitle">
          Not enough country data available for this genre.
        </p>
      </div>
    );
  }

  const margin = xScale?.margin || { top: 20, right: 20, bottom: 40, left: 60 };
  const innerWidth = xScale?.innerWidth || WIDTH - margin.left - margin.right;
  const innerHeight = yScale?.innerHeight || HEIGHT - margin.top - margin.bottom;

  return (
    <div className="scatter-card">
      <h2>Country efficiency — earnings vs players</h2>
      <p className="scatter-subtitle">
        Each dot is a country in "{selectedGenre}". Countries above the trend
        line earn more per player.
      </p>

      {(!xScale || !yScale) && (
        <p className="scatter-empty">Not enough valid data to plot.</p>
      )}

      {xScale && yScale && (
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="scatter-svg"
        >
          <g transform={`translate(${margin.left},${margin.top})`}>
            {/* axes */}
            {/* x axis line */}
            <line
              x1={0}
              y1={innerHeight}
              x2={innerWidth}
              y2={innerHeight}
              className="scatter-axis-line"
            />
            {/* y axis line */}
            <line
              x1={0}
              y1={0}
              x2={0}
              y2={innerHeight}
              className="scatter-axis-line"
            />

            {/* x ticks */}
            {xTicks.map((t) => (
              <g key={t} transform={`translate(${xScale(t)},0)`}>
                <line
                  y1={innerHeight}
                  y2={innerHeight + 4}
                  className="scatter-tick-line"
                />
                <text
                  y={innerHeight + 16}
                  textAnchor="middle"
                  className="scatter-tick-label"
                >
                  {t >= 1000000
                    ? `${(t / 1_000_000).toFixed(1)}M`
                    : t >= 1000
                    ? `${(t / 1000).toFixed(0)}K`
                    : t}
                </text>
              </g>
            ))}

            {/* y ticks */}
            {yTicks.map((t) => (
              <g key={t} transform={`translate(0,${yScale(t)})`}>
                <line
                  x1={-4}
                  x2={0}
                  className="scatter-tick-line"
                />
                <text
                  x={-8}
                  dy="0.32em"
                  textAnchor="end"
                  className="scatter-tick-label"
                >
                  {t >= 1_000_000
                    ? `${(t / 1_000_000).toFixed(1)}M`
                    : t >= 1000
                    ? `${(t / 1000).toFixed(0)}K`
                    : t}
                </text>
              </g>
            ))}

            {/* axis labels */}
            <text
              x={innerWidth / 2}
              y={innerHeight + 32}
              textAnchor="middle"
              className="scatter-axis-title"
            >
              Number of players (log scale)
            </text>
            <text
              transform={`translate(${-42},${innerHeight / 2}) rotate(-90)`}
              textAnchor="middle"
              className="scatter-axis-title"
            >
              Total earnings (log scale)
            </text>

            {/* regression / trend line */}
            {regressionLine && (
              <line
                x1={regressionLine.x1}
                y1={regressionLine.y1}
                x2={regressionLine.x2}
                y2={regressionLine.y2}
                className="scatter-regression-line"
              />
            )}

            {/* points */}
            {data.map((d) => {
              const cx = xScale(d.players);
              const cy = yScale(d.earnings);
              const isChina = d.country === "China";
              const isHovered =
                hovered && hovered.country === d.country;

              return (
                <g
                  key={d.country}
                  onMouseEnter={() => setHovered(d)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isChina ? 6 : 4}
                    className={
                      "scatter-dot" +
                      (isChina ? " scatter-dot--china" : "") +
                      (isHovered ? " scatter-dot--hovered" : "")
                    }
                  />
                </g>
              );
            })}
          </g>
        </svg>
      )}

      <div className="scatter-footer">
        {!hovered && (
          <span>
            Hover a dot to see country details. Look for points high above the
            trend line – they earn more per player.
          </span>
        )}
        {hovered && (
          <span>
            <strong>{hovered.country}</strong> —{" "}
            {formatMoneyShort(hovered.earnings)} total earnings,{" "}
            {hovered.players.toLocaleString()} players (
            {formatPerPlayer(hovered.earnings, hovered.players)}).
          </span>
        )}
      </div>
    </div>
  );
}

export default CountryScatterPlot;
