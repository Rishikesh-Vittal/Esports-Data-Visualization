import { useState } from "react";
import * as d3 from "d3";

function formatMoneyShort(value) {
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`;
  }
  return `$${value.toFixed(0)}`;
}

function CountryGenreChart({ stats, selectedGenre }) {
  const [hovered, setHovered] = useState(null);

  if (!stats || stats.length === 0) {
    return (
      <div className="country-card">
        <h2>Top countries for this genre</h2>
        <p className="country-subtitle">
          No country-level data found for <strong>{selectedGenre}</strong> yet.
        </p>
      </div>
    );
  }

  // You can decide to show all, or only top N with scroll.
  const data = stats; // already sorted desc by earnings in App

  const margin = { top: 20, right: 40, bottom: 20, left: 140 };
  const barHeight = 22;
  const innerWidth = 520;
  const innerHeight = barHeight * data.length;

  const width = margin.left + innerWidth + margin.right;
  const height = margin.top + innerHeight + margin.bottom;

  const x = d3
    .scaleLinear()
    .domain([0, d3.max(data, (d) => d.earnings) || 0])
    .nice()
    .range([0, innerWidth]);

  const y = d3
    .scaleBand()
    .domain(data.map((d) => d.country))
    .range([0, innerHeight])
    .padding(0.15);

  return (
    <div className="country-card">
      <h2>Top countries for "{selectedGenre}"</h2>
      <p className="country-subtitle">
        Countries ranked by earnings from games in this genre. Hover a country
        to see more details.
      </p>

      <div className="country-scroll">
        <svg width={width} height={height}>
          <g transform={`translate(${margin.left},${margin.top})`}>
            {data.map((d) => {
              const barWidth = x(d.earnings);
              const yPos = y(d.country);
              if (yPos == null) return null;

              const isHovered = hovered && hovered.country === d.country;

              return (
                <g
                  key={d.country}
                  transform={`translate(0,${yPos})`}
                  onMouseEnter={() => setHovered(d)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <rect
                    width={barWidth}
                    height={y.bandwidth()}
                    rx={4}
                    className={
                      "country-bar" +
                      (isHovered ? " country-bar--highlighted" : "")
                    }
                  />
                  {/* value to the right of bar */}
                  <text
                    x={barWidth + 8}
                    y={y.bandwidth() / 2}
                    textAnchor="start"
                    dominantBaseline="middle"
                    className="country-value"
                  >
                    {formatMoneyShort(d.earnings)}
                  </text>
                  {/* country name on left */}
                  <text
                    x={-8}
                    y={y.bandwidth() / 2}
                    textAnchor="end"
                    dominantBaseline="middle"
                    className={
                      "country-label" +
                      (isHovered ? " country-label--highlighted" : "")
                    }
                  >
                    {d.country}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      <div className="country-footer">
        {hovered ? (
          <>
            <span>
              <strong>{hovered.country}</strong> —{" "}
              {formatMoneyShort(hovered.earnings)} in earnings,{" "}
              {hovered.players.toLocaleString()} players, involved in{" "}
              {hovered.gameCount} game
              {hovered.gameCount > 1 ? "s" : ""} for this genre.
            </span>
          </>
        ) : (
          <span>Hover a bar to see players and earnings details.</span>
        )}
      </div>
    </div>
  );
}

export default CountryGenreChart;
