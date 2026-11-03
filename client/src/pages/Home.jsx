import { useEffect, useState, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../socket';
import { API_URL } from '../config';
import { SKY_GAMES } from '../sky/games';
import { useTheme } from '../context/ThemeContext';
import MotifIcon from '../components/MotifIcon';
import './Home.css';

// three.js hero loads after first paint; the CSS hero gradient shows meanwhile.
const HeroGL = lazy(() => import('../world/HeroGL'));

const GROUPS = [
  { key: 'strategy', label: 'Strategy' },
  { key: 'word', label: 'Word' },
  { key: 'party', label: 'Party' },
];

// The hero transforms with the world. Dark = Space, light = Arcade.
const COPY = {
  space: {
    kicker: '◍ a sky of games',
    title: [<>Pick a star.</>, <>Play instantly.</>],
    lead: "Every game is a star. Fly in, land on one, and you're in a match — no download, no sign-up.",
    cta: 'Enter the sky',
    alt: 'All games →',
  },
  arcade: {
    kicker: '◆ grab a friend',
    title: [<>Let's</>, <><span className="hp-ac-p">play</span> <span className="hp-ac-t">now!</span></>],
    lead: 'Quick, silly, competitive board & party games you can start in two taps.',
    cta: 'Play now',
    alt: 'Browse games →',
  },
};

export default function Home() {
  const navigate = useNavigate();
  const { world, theme, toggleTheme } = useTheme();
  const [counts, setCounts] = useState({});
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [board, setBoard] = useState([]);

  useEffect(() => {
    const onState = (state) => {
      const map = {};
      for (const g of state.games || []) map[g.game] = g.players;
      setCounts(map);
      setTotalPlayers(state.totalPlayers || 0);
    };
    socket.on('sky:state', onState);
    return () => socket.off('sky:state', onState);
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/api/leaderboard`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((data) => {
        const rows = [];
        for (const [game, entries] of Object.entries(data || {})) {
          for (const e of entries || []) rows.push({ game, name: e.username, wins: e.wins });
        }
        rows.sort((a, b) => b.wins - a.wins);
        setBoard(rows.slice(0, 6));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const els = document.querySelectorAll('.hp-in');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('hp-vis'); io.unobserve(e.target); } });
    }, { threshold: 0.14 });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const play = (g) => navigate(`/game/${g.route}/local`, { state: { gameType: g.id, isLocal: true } });
  const c = COPY[world];
  const motif = world === 'arcade' ? '#b02e73' : '#e3e9ff';

  return (
    <div className="hp">
      <a className="hp-skip" href="#games">Skip to games</a>

      <nav className="hp-nav">
        <span className="hp-nav-mark"><span className="hp-nav-dot" />MultiplayerGames<span className="hp-nav-tld">.in</span></span>
        <div className="hp-nav-links">
          <button className="hp-link" onClick={() => navigate('/games')}>Games</button>
          <button className="hp-link" onClick={() => navigate('/leaderboard')}>Ranks</button>
          <button className="hp-toggle" onClick={toggleTheme} aria-label="Switch world">
            <span className="hp-toggle-knob">
              {theme === 'dark' ? (
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
              )}
            </span>
            <span className="hp-toggle-label">{world === 'space' ? 'Space' : 'Arcade'}</span>
          </button>
        </div>
      </nav>

      {/* ---------- hero: the living WebGL world ---------- */}
      <header className="hp-hero">
        <div className="hp-hero-sky" aria-hidden="true">
          <Suspense fallback={null}><HeroGL world={world} /></Suspense>
        </div>
        <div className="hp-hero-copy">
          <p className="hp-kicker">{c.kicker}</p>
          <h1 className="hp-title" key={world}>
            <span className="hp-reveal"><span>{c.title[0]}</span></span>
            <span className="hp-reveal"><span>{c.title[1]}</span></span>
          </h1>
          <p className="hp-lead">{c.lead}{totalPlayers > 0 ? ` ${totalPlayers} playing now.` : ''}</p>
          <div className="hp-actions">
            <button className="hp-cta" onClick={() => navigate('/sky')}>{c.cta}</button>
            <button className="hp-link" onClick={() => navigate('/games')}>{c.alt}</button>
          </div>
        </div>
      </header>

      {/* ---------- every game ---------- */}
      <section className="hp-games hp-in" id="games">
        <h2>The whole arcade.</h2>
        {GROUPS.map((grp) => (
          <div className="hp-group hp-in" key={grp.key}>
            <h3>{grp.label}</h3>
            <ul className="hp-grid" data-ui>
              {SKY_GAMES.filter((g) => g.cluster === grp.key).map((g) => (
                <li key={g.id}>
                  <button onClick={() => play(g)}>
                    <MotifIcon id={g.id} size={44} color={motif} />
                    <span className="hp-game-name">{g.name}</span>
                    <span className="hp-game-n">{(counts[g.id] || 0) > 0 ? `${counts[g.id]} playing` : 'Open'}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {/* ---------- how it works ---------- */}
      <section className="hp-how hp-in">
        <h2>Three moves to a game.</h2>

        <div className="hp-step-row hp-in">
          <div className="hp-step-text"><h3>Pick a game.</h3><p>Every game is one click away — a chess grid, a word board, an atom chain. Tap it and it opens.</p></div>
          <div className="hp-frag" data-ui aria-label="Choose a game">
            <div className="hp-frag-head">Choose a game</div>
            {SKY_GAMES.slice(0, 4).map((g) => (
              <div className="hp-frag-row" key={g.id}><MotifIcon id={g.id} size={26} color={motif} /><span>{g.name}</span><span className="hp-frag-dim">Open</span></div>
            ))}
          </div>
        </div>

        <div className="hp-step-row hp-reverse hp-in">
          <div className="hp-step-text"><h3>Share the room code.</h3><p>Every room has a four-letter code. Send it, your friend types it in — no accounts, no installs.</p></div>
          <div className="hp-frag hp-frag-room" data-ui aria-label="Room code">
            <div className="hp-frag-head">Room created</div>
            <div className="hp-room-code">HQ4K</div>
            <div className="hp-room-note">Waiting for one more player…</div>
            <div className="hp-room-share">multiplayergames.in/r/HQ4K <span className="hp-room-copy">Copy</span></div>
          </div>
        </div>

        <div className="hp-step-row hp-in">
          <div className="hp-step-text"><h3>Play together.</h3><p>Moves land in real time, both sides in sync, with a chat down the side to talk it out.</p></div>
          <div className="hp-frag" data-ui aria-label="A game in play">
            <div className="hp-frag-head">Connect 4 · your turn</div>
            <div className="hp-board">
              {Array.from({ length: 28 }).map((_, i) => {
                const fill = { 15: 'r', 16: 'y', 22: 'r', 23: 'y', 24: 'r' }[i];
                return <span key={i} className={`hp-cell${fill ? ' hp-' + fill : ''}`} />;
              })}
            </div>
            <div className="hp-chat"><span className="hp-chat-them">nice drop</span><span className="hp-chat-you">watch this</span></div>
          </div>
        </div>
      </section>

      {/* ---------- standings ---------- */}
      <section className="hp-standings hp-in">
        <div className="hp-standings-text">
          <h2>Every win is kept.</h2>
          <p>Each finished online match adds to the board. Bots and pass-and-play do not.</p>
          <button className="hp-link" onClick={() => navigate('/leaderboard')}>See the full board →</button>
        </div>
        <section className="hp-frag" data-ui aria-label="Leaderboard">
          <div className="hp-frag-head">Top players<span className="hp-live">by wins</span></div>
          {board.length === 0 ? (
            <p className="hp-empty">No wins recorded yet — be the first.</p>
          ) : (
            <table className="hp-table">
              <tbody>
                {board.map((r, i) => (
                  <tr key={i}><td>{r.name}</td><td className="hp-table-game">{r.game}</td><td className="hp-table-n">{r.wins}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </section>

      <section className="hp-end hp-in">
        <h2>{world === 'space' ? 'The sky is open.' : "Let's play."}</h2>
        <div className="hp-actions">
          <button className="hp-cta" onClick={() => navigate('/sky')}>{c.cta}</button>
          <button className="hp-link" onClick={() => navigate('/games')}>{c.alt}</button>
        </div>
      </section>

      <footer className="hp-footer">
        <span className="hp-footer-mark">MultiplayerGames.in</span>
        <span className="hp-footer-note">Real-time board and party games, made in India.</span>
      </footer>
    </div>
  );
}
