import { useMemo, useState, useEffect, useRef } from "react";
import * as d3 from "d3";
import { feature } from "topojson-client";
import worldData from "world-atlas/countries-110m.json";

const WIDTH = 800;
const HEIGHT = 520;

function formatMoneyShort(value) {
  if (!value || value <= 0) return "$0";
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function CountryMapChoropleth({ stats, selectedGenre }) {
  const [hovered, setHovered] = useState(null);
  const svgRef = useRef(null);

  const { countries, path, statByCountry, colorScale } = useMemo(() => {
    // Convert TopoJSON to GeoJSON
    const geo = feature(worldData, worldData.objects.countries);
    const countries = geo.features;

    // Fit world into our SVG
    const projection = d3.geoMercator().fitSize([WIDTH, HEIGHT], geo);
    const path = d3.geoPath(projection);

    // Map of country name -> stats (earnings, players, gameCount)
    const statByCountry = new Map(
      (stats || []).map((d) => [d.country, d])
    );

    const maxEarnings = d3.max(stats || [], (d) => d.earnings) || 0;

    // Single-hue blue scale: 0 = light blue, max = dark blue
    const lowColor = "#fee0e0ff";  // very light blue
    const highColor = "#f41010ff"; // deep blue

    const colorScale = d3
      .scaleLinear()
      .domain([0, maxEarnings || 1])
      .range([lowColor, highColor]);

    return { countries, path, statByCountry, colorScale };
  }, [stats]);

  // 🔍 Enable zoom + pan
  useEffect(() => {
    if (!svgRef.current || !countries) return;

    const svg = d3.select(svgRef.current);

    const zoomBehavior = d3
      .zoom()
      .scaleExtent([1, 5]) // min & max zoom
      .translateExtent([
        [-WIDTH, -HEIGHT],      // how far you can pan
        [2 * WIDTH, 2 * HEIGHT] // in each direction
      ])
      .on("zoom", (event) => {
        svg
          .select(".country-map-zoom-layer")
          .attr("transform", event.transform);
      });

    svg.call(zoomBehavior);

    // optional: reset to identity on genre change
    svg.call(zoomBehavior.transform, d3.zoomIdentity);

    return () => {
      svg.on(".zoom", null);
    };
  }, [countries]);

  const hasData = stats && stats.length > 0;

  return (
    <div className="country-map-card">
      <h2>World view for "{selectedGenre}"</h2>
      <p className="country-map-subtitle">
        Choropleth = total earnings in this genre (lighter → lower, darker → higher).
        Scroll to zoom, drag to pan.
      </p>

      <div className="country-map-wrapper">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="country-map-svg"
        >
          {/* everything inside this group will zoom/pan */}
          <g className="country-map-zoom-layer">
            {countries.map((f) => {
              const name = f.properties.name;
              const stat = statByCountry.get(name);
              const hasStat = !!stat;

              const fill = hasStat
                ? colorScale(stat.earnings || 0)
                : "#f6f7f9ff"; // no-data countries

              return (
                <path
                  key={name}
                  d={path(f)}
                  className="country-map-land"
                  fill={fill}
                  opacity={hasStat ? 0.95 : 0.4}
                  onMouseEnter={() =>
                    hasStat &&
                    setHovered({
                      ...stat,
                      country: name,
                    })
                  }
                  onMouseLeave={() => setHovered(null)}
                />
              );
            })}
          </g>
        </svg>
      </div>

      <div className="country-map-footer">
        {!hasData && (
          <span>No country-level data available for this genre yet.</span>
        )}

        {hasData && !hovered && (
          <span>Hover a country to see details. Scroll to zoom, drag to pan.</span>
        )}

        {hasData && hovered && (
          <span>
            <strong>{hovered.country}</strong> —{" "}
            {formatMoneyShort(hovered.earnings)} earnings,{" "}
            {hovered.players.toLocaleString()} players across{" "}
            {hovered.gameCount} game
            {hovered.gameCount > 1 ? "s" : ""} in this genre.
          </span>
        )}
      </div>
    </div>
  );
}

export default CountryMapChoropleth;
