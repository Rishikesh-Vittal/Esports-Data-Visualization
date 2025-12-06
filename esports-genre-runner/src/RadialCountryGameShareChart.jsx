import { useMemo, useState } from "react";
import * as d3 from "d3";

const WIDTH = 600;
const HEIGHT = 600;
const MAX_COUNTRIES = 28; // show at most 28 for readability

function formatPercent(p) {
  return `${(p * 100).toFixed(1)}%`;
}

function formatMoneyShort(value) {
  if (!value || value <= 0) return "$0";
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

// Split long labels into two lines if needed
function splitLabel(name) {
  const parts = (name || "").split(" ");
  if (parts.length <= 1) return [name];
  return [parts.slice(0, -1).join(" "), parts[parts.length - 1]];
}

function RadialCountryGameShareChart({ countryGames, selectedGenre }) {
  const [hovered, setHovered] = useState(null);

  const { entries, innerRadius, outerRadius, shareTicks } = useMemo(() => {
    const innerRadius = 110;
    const outerRadius = 220;

    if (!countryGames || countryGames.length === 0) {
      return { entries: [], innerRadius, outerRadius, shareTicks: [] };
    }

    // 1) Keep only rows that have a top game
    let rows = countryGames.filter(
      (c) => c && c.games && c.games.length > 0
    );

    if (!rows.length) {
      return { entries: [], innerRadius, outerRadius, shareTicks: [] };
    }

    // 2) Sort by total earnings (desc) and take top N
    rows.sort(
      (a, b) => (b.totalEarnings || 0) - (a.totalEarnings || 0)
    );
    rows = rows.slice(0, MAX_COUNTRIES);

    // 3) Build flat entries: one per country, with its top game & share
    let entries = rows.map((c) => {
      const best = c.games[0];
      let share = best.share || 0;
      share = Math.max(0, Math.min(1, share)); // clamp to [0, 1]

      return {
        country: c.country,
        totalEarnings: c.totalEarnings,
        game: best.game,
        earnings: best.earnings,
        share,
      };
    });

    // 4) Sort by descending share (biggest wedge first)
    entries.sort((a, b) => {
      if (b.share !== a.share) return b.share - a.share;
      // tiebreaker: higher total earnings first
      return (b.totalEarnings || 0) - (a.totalEarnings || 0);
    });

    const n = entries.length;
    if (!n) {
      return { entries: [], innerRadius, outerRadius, shareTicks: [] };
    }

    const angleStep = (2 * Math.PI) / n;

    // For labels we use "math angles" (cos/sin) with 0 at 3 o'clock,
    // then rotate to start at 12 o'clock:
    const labelRotationStart = -Math.PI / 2; // index 0 at 12 o'clock

    const shareScale = d3
      .scaleLinear()
      .domain([0, 1])
      .range([innerRadius, outerRadius]);

    const arcGen = d3.arc();

    entries = entries.map((e, index) => {
      // angleCenterLabel is used for labels (cos/sin)
      const angleCenterLabel = labelRotationStart + index * angleStep;

      const band = angleStep * 0.7;

      // D3 arc 0 rad is at 12 o'clock already,
      // so arc angle = labelAngle + PI/2 to align with our cos/sin basis.
      const angleCenterArc = angleCenterLabel + Math.PI / 2;
      const startAngle = angleCenterArc - band / 2;
      const endAngle = angleCenterArc + band / 2;

      const outer = shareScale(e.share);

      const path = arcGen({
        innerRadius,
        outerRadius: outer,
        startAngle,
        endAngle,
      });

      // label position uses angleCenterLabel
      const labelRadius = outerRadius + 26;
      const lx = Math.cos(angleCenterLabel) * labelRadius;
      const ly = Math.sin(angleCenterLabel) * labelRadius;

      let rotate = (angleCenterLabel * 180) / Math.PI;
      if (rotate > 90 || rotate < -90) {
        rotate += 180;
      }

      return {
        ...e,
        path,
        labelX: lx,
        labelY: ly,
        labelRotate: rotate,
      };
    });

    const shareTicks = [0.2, 0.4, 0.6, 0.8, 1.0];

    return { entries, innerRadius, outerRadius, shareTicks };
  }, [countryGames]);

  const hasData = entries.length > 0;

  return (
    <div className="radial-card">
      <h2>Game shares within each country</h2>
      <p className="radial-subtitle">
        For the genre "{selectedGenre}", each bar shows the top game's
        percentage of that country's total earnings. Hover a bar to see
        details.
        {hasData && entries.length === MAX_COUNTRIES && (
          <> Showing top {MAX_COUNTRIES} countries by prize money.</>
        )}
      </p>

      {!hasData && (
        <p className="radial-empty">
          Not enough country–game data available for this genre.
        </p>
      )}

      {hasData && (
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="radial-svg"
        >
          <g transform={`translate(${WIDTH / 2},${HEIGHT / 2})`}>
            {/* Concentric % rings */}
            {shareTicks.map((t) => {
              const r =
                innerRadius + t * (outerRadius - innerRadius);
              return (
                <g key={t}>
                  <circle
                    r={r}
                    className="radial-tick-circle"
                  />
                  <text
                    x={0}
                    y={-r - 4}
                    textAnchor="middle"
                    className="radial-tick-label"
                  >
                    {Math.round(t * 100)}%
                  </text>
                </g>
              );
            })}

            {/* Bars */}
            {entries.map((e) => {
              const isHovered =
                hovered &&
                hovered.country === e.country &&
                hovered.game === e.game;
              return (
                <path
                  key={`${e.country}-${e.game}`}
                  d={e.path}
                  className={
                    "radial-bar" +
                    (isHovered ? " radial-bar--hovered" : "")
                  }
                  onMouseEnter={() => setHovered(e)}
                  onMouseLeave={() => setHovered(null)}
                />
              );
            })}

            {/* Center circle & text */}
            <circle
              r={innerRadius - 12}
              className="radial-center"
            />
            <text
              className="radial-center-title"
              textAnchor="middle"
            >
              <tspan x="0" dy="-1.3em">
                Top game share of
              </tspan>
              <tspan x="0" dy="1.2em">
                each country's
              </tspan>
              <tspan x="0" dy="1.2em">
                prize earnings
              </tspan>
            </text>

            {/* Country labels */}
            {entries.map((e) => {
              const lines = splitLabel(e.country);
              return (
                <g
                  key={`label-${e.country}`}
                  transform={`translate(${e.labelX},${e.labelY}) rotate(${e.labelRotate})`}
                >
                  <text
                    className="radial-country-label"
                    textAnchor="middle"
                    alignmentBaseline="middle"
                  >
                    {lines.map((line, i) => (
                      <tspan
                        key={i}
                        x="0"
                        dy={i === 0 ? "0" : "1.0em"}
                      >
                        {line}
                      </tspan>
                    ))}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      )}

      <div className="radial-footer">
        {!hovered && hasData && (
          <span>
            Hover any bar to see the game and how much of its
            country's prize money it represents.
          </span>
        )}
        {hovered && (
          <span>
            <strong>{hovered.country}</strong> —{" "}
            <strong>{hovered.game}</strong> accounts for{" "}
            {formatPercent(hovered.share)} of that country's
            earnings (
            {formatMoneyShort(hovered.earnings)}).
          </span>
        )}
      </div>
    </div>
  );
}

export default RadialCountryGameShareChart;
