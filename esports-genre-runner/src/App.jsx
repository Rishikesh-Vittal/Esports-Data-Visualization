import { useEffect, useState, useMemo } from "react";
import * as d3 from "d3";
import RunnerScene from "./RunnerScene";
import LeaderboardChart from "./LeaderboardChart";
import CountryMapChoropleth from "./CountryMapChoropleth";
import CountryScatterPlot from "./CountryScatterPlot";
import RadialCountryGameShareChart from "./RadialCountryGameShareChart";
import GameEarningsKDEChart from "./GameEarningsKDEChart";


function App() {
  const [data, setData] = useState([]);              // games dataset
  const [genres, setGenres] = useState([]);
  const [selectedGenre, setSelectedGenre] = useState("");
  const [highlightedGame, setHighlightedGame] = useState(null);
  const [countryRows, setCountryRows] = useState([]); // country_esports rows

  // Load BOTH CSVs once
  useEffect(() => {
    Promise.all([
      d3.csv("/esports_games.csv", (d) => ({
        Game: d.Game,
        Genre: d.Genre,
        TotalEarnings: +d.TotalEarnings,
      })),
      d3.csv("/country_esports.csv", (d) => ({
        country: d.country,
        totalEarningsCountry: +d.total_earnings,
        playerCount: +d.player_count,
        game: d.game,
        gameEarnings: +d.game_earnings,
      })),
    ])
      .then(([gameRows, countryRows]) => {
        setData(gameRows);
        setCountryRows(countryRows);

        const uniqueGenres = Array.from(
          new Set(gameRows.map((r) => r.Genre))
        ).sort();
        setGenres(uniqueGenres);
        if (uniqueGenres.length > 0) {
          setSelectedGenre(uniqueGenres[0]);
        }
      })
      .catch((err) => {
        console.error("Error loading CSVs:", err);
      });
  }, []);

  // Games filtered by genre (and zero earnings removed)
  const filteredGames = data
    .filter(
      (d) =>
        (!selectedGenre || d.Genre === selectedGenre) &&
        d.TotalEarnings > 0
    )
    .sort((a, b) => a.TotalEarnings - b.TotalEarnings); // ascending for runner order

  // Lookup: Game -> Genre
  const genreByGame = new Map(data.map((g) => [g.Game, g.Genre]));

  // Country stats for CURRENT genre
  const countryStatsForGenre = (() => {
    if (!selectedGenre || countryRows.length === 0 || data.length === 0) {
      return [];
    }

    const filteredByGenre = countryRows.filter((row) => {
      const genre = genreByGame.get(row.game);
      return genre === selectedGenre;
    });

    const byCountry = new Map();

    filteredByGenre.forEach((row) => {
      const key = row.country;
      const prev =
        byCountry.get(key) || {
          country: key,
          earnings: 0,
          players: 0,
          gameCount: 0,
        };

      prev.earnings += row.gameEarnings || 0;
      prev.players += row.playerCount || 0;
      prev.gameCount += 1;

      byCountry.set(key, prev);
    });

    const stats = Array.from(byCountry.values());
    stats.sort((a, b) => b.earnings - a.earnings); // highest-earning countries first
    return stats;
  })();

    // Country → games → earnings share within that country (for current genre)
    // Country → top game share within that country (for current genre)
  const countryGameSharesForGenre = useMemo(() => {
    if (!selectedGenre || !countryRows.length || !data.length) {
      return [];
    }

    // Map: Game -> Genre (already defined above, but we can reuse it)
    // const genreByGame = new Map(data.map((g) => [g.Game, g.Genre]));

    const bestByCountry = new Map();

    countryRows.forEach((row) => {
      const country = row.country;
      const game = row.game;

      if (!country || !game) return;

      // what genre is this game?
      const genre = genreByGame.get(game);
      if (genre !== selectedGenre) return;

      const totalEarn = row.totalEarningsCountry; // from loader
      const gameEarn = row.gameEarnings;          // from loader

      if (!(totalEarn > 0 && gameEarn > 0)) return;

      // ✅ your "house" logic: my salary / house total salary
      const share = gameEarn / totalEarn;

      const existing = bestByCountry.get(country);
      if (!existing || share > existing.games[0].share) {
        bestByCountry.set(country, {
          country,
          totalEarnings: totalEarn,
          games: [
            {
              game,
              earnings: gameEarn,
              share,
            },
          ],
        });
      }
    });

    const result = Array.from(bestByCountry.values());
    result.sort((a, b) => b.totalEarnings - a.totalEarnings);
    return result;
  }, [selectedGenre, countryRows, data, genreByGame]);

  return (
    <div className="app-root">
      <div className="app-panel">
        <h1 className="app-title">Esports Genre Runner</h1>

        {/* Genre dropdown */}
        <div className="genre-row">
          <label className="genre-label">Select genre:</label>
          <select
            value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)}
            className="genre-select"
          >
            {genres.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>

        {/* Main row: list (left) + leaderboard chart (right) */}
        <div className="app-main-row">
          {/* Game list */}
          <div className="game-list-card">
            <h2>Games in "{selectedGenre}"</h2>
            <p className="game-list-subtitle">
              Sorted by total earnings (used for the runner order).
            </p>
            {filteredGames.length === 0 && (
              <p>Loading or no games found…</p>
            )}

            <ul className="game-list">
              {filteredGames.map((game) => (
                <li
                  key={game.Game}
                  className={
                    "game-list-item" +
                    (highlightedGame === game.Game
                      ? " game-list-item--highlighted"
                      : "")
                  }
                  onMouseEnter={() => setHighlightedGame(game.Game)}
                  onMouseLeave={() => setHighlightedGame(null)}
                >
                  <span className="game-name">{game.Game}</span>
                  <span className="game-earnings">
                    ${game.TotalEarnings.toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Game earnings leaderboard */}
          <LeaderboardChart
            games={filteredGames}
            highlightedGame={highlightedGame}
            onHighlight={setHighlightedGame}
          />
        </div>

        <div className="map-radial-row">
          <div className="map-column">
            <CountryMapChoropleth
              stats={countryStatsForGenre}
              selectedGenre={selectedGenre}
            />
            </div>

            <RadialCountryGameShareChart
              countryGames={countryGameSharesForGenre}
              selectedGenre={selectedGenre}
            />
        </div>

        <section className="insights-section">
          <h2 className="insights-title">
            Earnings insights for "{selectedGenre}"
          </h2>
          <p className="insights-subtitle">
            The scatterplot shows how country earnings relate to player counts.
            The histogram + KDE shows how prize money is distributed across games
            in this genre.
          </p>

          <CountryScatterPlot
            stats={countryStatsForGenre}
            selectedGenre={selectedGenre}
          />

          <GameEarningsKDEChart
            games={filteredGames}
            highlightedGame={highlightedGame}
          />
        </section>

        {/* Runner animation */}
        <RunnerScene games={filteredGames} />
      </div>
    </div>
  );
}

export default App;
