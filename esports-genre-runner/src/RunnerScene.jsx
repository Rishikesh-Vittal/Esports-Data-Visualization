import { useEffect, useState } from "react";

const COLORS = [
  "#ff6b6b",
  "#4dabf7",
  "#ffd43b",
  "#69db7c",
  "#b197fc",
  "#ffa94d",
  "#20c997",
  "#f06595",
];

// just the SVG stick figure
function StickFigure({ color }) {
  return (
    <svg
      className="runner-figure"
      viewBox="0 0 60 80"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Head */}
      <circle cx="30" cy="10" r="6" fill={color} />

      {/* Body */}
      <line
        x1="30"
        y1="16"
        x2="30"
        y2="40"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
      />

      {/* Arms */}
      <line
        x1="30"
        y1="22"
        x2="18"
        y2="32"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
      />
      <line
        x1="30"
        y1="22"
        x2="42"
        y2="30"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
      />

      {/* Legs */}
      <line
        x1="30"
        y1="40"
        x2="22"
        y2="60"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
      />
      <line
        x1="30"
        y1="40"
        x2="40"
        y2="64"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
      />

      {/* Shadow */}
      <ellipse cx="30" cy="72" rx="16" ry="4" fill="rgba(0,0,0,0.35)" />
    </svg>
  );
}

/**
 * phases:
 *  - "idle"       -> waiting for Start
 *  - "show"       -> one runner: left -> middle, then run in place
 *  - "transition" -> new runner comes from left, overtakes old, old falls back
 *  - "finished"   -> all games shown
 */
function RunnerScene({ games }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [incomingIndex, setIncomingIndex] = useState(null);
  const [phase, setPhase] = useState("idle");
  const [isPlaying, setIsPlaying] = useState(false);
  const [showId, setShowId] = useState(0);
  const [transitionId, setTransitionId] = useState(0);

  // reset when genre changes
  useEffect(() => {
    setCurrentIndex(0);
    setIncomingIndex(null);
    setPhase("idle");
    setIsPlaying(false);
    setShowId(0);
    setTransitionId(0);
  }, [games]);

  useEffect(() => {
    if (!isPlaying || games.length === 0) return;

    if (phase === "show") {
      const showDuration = 3000; // show each leader 3s
      const timer = setTimeout(() => {
        if (currentIndex === games.length - 1) {
          setPhase("finished");
          setIsPlaying(false);
        } else {
          setIncomingIndex(currentIndex + 1);
          setPhase("transition");
          setTransitionId((id) => id + 1);
        }
      }, showDuration);
      return () => clearTimeout(timer);
    }

    if (phase === "transition") {
      const transitionDuration = 1000; // overtake animation
      const timer = setTimeout(() => {
        setCurrentIndex((idx) => idx + 1);
        setIncomingIndex(null);
        setPhase("show");
        setShowId((id) => id + 1);
      }, transitionDuration);
      return () => clearTimeout(timer);
    }
  }, [phase, currentIndex, isPlaying, games.length]);

  const startRun = () => {
    if (!games || games.length === 0) return;
    // restart from first game
    setCurrentIndex(0);
    setIncomingIndex(null);
    setPhase("show");
    setIsPlaying(true);
    setShowId((id) => id + 1);
  };

  if (!games || games.length === 0) {
    return <p>No games found for this genre.</p>;
  }

  const currentGame = games[currentIndex];
  const currentColor = COLORS[currentIndex % COLORS.length];
  const nextGame =
    incomingIndex != null && incomingIndex < games.length
      ? games[incomingIndex]
      : null;
  const nextColor =
    incomingIndex != null
      ? COLORS[incomingIndex % COLORS.length]
      : COLORS[0];

  // text should follow whoever is in front
  const displayGame =
    phase === "transition" && nextGame ? nextGame : currentGame;

  return (
    <div className="runner-container">
      <div className="runner-header">
        <h2>Race of the Top Games</h2>
        <button
          onClick={startRun}
          disabled={isPlaying || games.length === 0}
          className="runner-button"
        >
          {phase === "idle" && "Start"}
          {phase === "show" && "Running..."}
          {phase === "transition" && "Overtaking..."}
          {phase === "finished" && "Replay"}
        </button>
      </div>

      <div className="runner-track">
        {/* NEW: road background */}
        <div className="runner-road">
          <div className="runner-road-stripe" />
        </div>

        {/* label INSIDE the animation, above runner */}
        <div className="runner-label">
          <div className="runner-label-game">{displayGame.Game}</div>
          <div className="runner-label-stat">
            ${displayGame.TotalEarnings.toLocaleString()}
          </div>
          <div className="runner-label-meta">
            Game {currentIndex + 1} of {games.length} • {displayGame.Genre}
          </div>
        </div>

        {/* background / finish-line for depth */}
        <div className="runner-finish-line" />

        {/* SHOW: first/leader runner – left -> middle then run in place */}
        {phase === "show" && (
          <div
            key={displayGame.Game + "-" + showId}
            className={
              "runner-figure-wrapper " +
              (currentIndex === 0
                ? "runner-show-initial"
                : "runner-show-static")
            }
          >
            <StickFigure color={currentColor} />
          </div>
        )}

        {/* TRANSITION: old leader + incoming leader */}
        {phase === "transition" && (
          <>
            {/* old one falling back */}
            <div
              key={"old-" + currentGame.Game + "-" + transitionId}
              className="runner-figure-wrapper runner-old"
            >
              <StickFigure color={currentColor} />
            </div>

            {/* new one coming from left and overtaking */}
            {nextGame && (
              <div
                key={"new-" + nextGame.Game + "-" + transitionId}
                className="runner-figure-wrapper runner-incoming"
              >
                <StickFigure color={nextColor} />
              </div>
            )}
          </>
        )}

        {/* FINISHED: last leader calmly running in place */}
        {phase === "finished" && (
          <div className="runner-figure-wrapper runner-show-static">
            <StickFigure color={currentColor} />
          </div>
        )}
      </div>

      {phase === "finished" && (
        <p className="runner-summary">
          ✅ Every game in this genre has taken the lead. Next we’ll hook this
          to a summary chart of their earnings.
        </p>
      )}
    </div>
  );
}

export default RunnerScene;
