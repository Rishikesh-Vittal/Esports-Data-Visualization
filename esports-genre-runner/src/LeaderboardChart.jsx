import * as d3 from "d3";

function formatMoney(value) {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`;
  }
  return `$${value}`;
}

function LeaderboardChart({ games }) {
  if (!games || games.length === 0) {
    return (
      <div className="leaderboard-card">
        <h2>Earnings leaderboard</h2>
        <p className="leaderboard-subtitle">No games to display.</p>
      </div>
    );
  }

  // Sort descending by earnings
  const sorted = [...games].sort(
    (a, b) => b.TotalEarnings - a.TotalEarnings
  );

  const margin = { top: 20, right: 80, bottom: 20, left: 260 };
  const barHeight = 22;
  const innerWidth = 420; // drawing area width
  const innerHeight = barHeight * sorted.length;

  const width = margin.left + innerWidth + margin.right;
  const height = margin.top + innerHeight + margin.bottom;

  const x = d3
    .scaleLinear()
    .domain([0, d3.max(sorted, (d) => d.TotalEarnings) || 0])
    .nice()
    .range([0, innerWidth]);

  const y = d3
    .scaleBand()
    .domain(sorted.map((d) => d.Game))
    .range([0, innerHeight])
    .padding(0.15);

  return (
    <div className="leaderboard-card">
      <h2>Earnings leaderboard</h2>
      <p className="leaderboard-subtitle">
        Games in this genre, sorted by total earnings (scroll to see all).
      </p>

      <div className="leaderboard-scroll">
        <svg width={width} height={height}>
          <g transform={`translate(${margin.left},${margin.top})`}>
            {/* Bars */}
            {sorted.map((d) => {
              const barWidth = x(d.TotalEarnings);
              const yPos = y(d.Game);
              if (yPos == null) return null;
              return (
                <g key={d.Game} transform={`translate(0,${yPos})`}>
                  <rect
                    width={barWidth}
                    height={y.bandwidth()}
                    rx={4}
                    className="leaderboard-bar"
                  />
                  {/* Value label to the right of the bar */}
                  <text
                    x={barWidth + 8}
                    y={y.bandwidth() / 2}
                    textAnchor="start"
                    dominantBaseline="middle"
                    className="leaderboard-value"
                  >
                    {formatMoney(d.TotalEarnings)}
                  </text>
                  {/* Game name on the left */}
                  <text
                    x={-8}
                    y={y.bandwidth() / 2}
                    textAnchor="end"
                    dominantBaseline="middle"
                    className="leaderboard-label"
                  >
                    {d.Game}
                  </text>
                </g>
              );
            })}

            {/* X-axis guide line (optional subtle baseline) */}
            <line
              x1={0}
              x2={innerWidth}
              y1={innerHeight}
              y2={innerHeight}
              className="leaderboard-axis"
            />
          </g>
        </svg>
      </div>
    </div>
  );
}

export default LeaderboardChart;
