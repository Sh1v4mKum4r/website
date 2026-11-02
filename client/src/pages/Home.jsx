import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../socket';
import { API_URL } from '../config';
import { SKY_GAMES, CLUSTERS } from '../sky/games';
import MotifIcon from '../components/MotifIcon';
import './Home.css';

const GROUPS = [
  { key: 'strategy', label: 'Strategy' },
  { key: 'word', label: 'Word' },
  { key: 'party', label: 'Party' },
];

export default function Home() {
  const navigate = useNavigate();
  const [counts, setCounts] = useState({});
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [board, setBoard] = useState([]);

  // the product performing: live player counts over the real socket
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

  // real leaderboard numbers for the standings
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

  // section entrances (motion layer)
  useEffect(() => {
    const els = document.querySelectorAll('.hp-in');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('hp-vis'); io.unobserve(e.target); } });
    }, { threshold: 0.15 });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const play = (g) => navigate(`/game/${g.route}/local`, { state: { gameType: g.id, isLocal: true } });

  const liveTop = useMemo(
    () => [...SKY_GAMES].sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0)).slice(0, 6),
    [counts]
  );

  return (
    <div className="hp">
      <a className="hp-skip" href="#games">Skip to games</a>

      <nav className="hp-nav">
        <span className="hp-nav-mark">MultiplayerGames.in</span>
        <div className="hp-nav-links">
          <button className="hp-link" onClick={() => navigate('/sky')}>The sky</button>
          <button className="hp-link" onClick={() => navigate('/leaderboard')}>Leaderboard</button>
        </div>
      </nav>

      {/* ---------- hero: headline + the live product fragment ---------- */}
      <header className="hp-hero">
        <div className="hp-hero-left">
          <h1 className="hp-title">
            <span className="hp-reveal"><span>Board games with</span></span>
            <span className="hp-reveal"><span>anyone, live.</span></span>
          </h1>
          <p className="hp-lead">Fourteen real-time games. Share a room code. No downloads — open a tab and play.</p>
          <div className="hp-actions">
            <button className="hp-cta" onClick={() => navigate('/games')}>Browse the games</button>
            <button className="hp-link" onClick={() => navigate('/sky')}>Enter the sky →</button>
          </div>
        </div>

        <div className="hp-hero-right">
          <section className="hp-panel" data-ui aria-label="Now playing">
            <div className="hp-panel-head">
              <span>Now playing</span>
              <span className="hp-live">{totalPlayers} in a game</span>
            </div>
            <ul className="hp-panel-list">
              {liveTop.map((g) => (
                <li key={g.id}>
                  <button onClick={() => play(g)}>
                    <MotifIcon id={g.id} size={28} color="#e3e9ff" />
                    <span className="hp-panel-name">{g.name}</span>
                    <span className="hp-panel-n">{counts[g.id] || 0}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </header>

      {/* ---------- every game, as the real choose-a-game interface ---------- */}
      <section className="hp-games hp-in" id="games">
        <h2>Fourteen games.</h2>
        {GROUPS.map((grp) => {
          const games = SKY_GAMES.filter((g) => g.cluster === grp.key);          return (
            <div className="hp-group hp-in" key={grp.key}>
              <h3>{grp.label}</h3>
              <ul className="hp-grid" data-ui>
                {games.map((g) => (
                  <li key={g.id}>
                    <button onClick={() => play(g)}>
                      <MotifIcon id={g.id} size={44} color="#1f2b4d" />
                      <span className="hp-game-name">{g.name}</span>
                      <span className="hp-game-n">{(counts[g.id] || 0) > 0 ? `${counts[g.id]} playing` : 'Open'}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>

      {/* ---------- how it works: statement + a real fragment each ---------- */}
      <section className="hp-how hp-in">
        <h2>Three moves to a game.</h2>

        <div className="hp-step-row hp-in">
          <div className="hp-step-text"><h3>Pick a game.</h3><p>Fourteen to choose from — a chess grid, a word board, an atom chain. Each opens straight away.</p></div>
          <div className="hp-frag" data-ui aria-label="Choose a game">
            <div className="hp-frag-head">Choose a game</div>
            {SKY_GAMES.slice(0, 4).map((g) => (
              <div className="hp-frag-row" key={g.id}><MotifIcon id={g.id} size={26} color="#e3e9ff" /><span>{g.name}</span><span className="hp-frag-dim">Open</span></div>
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

      {/* ---------- standings (real numbers) ---------- */}
      <section className="hp-standings hp-in">
        <div className="hp-standings-text">
          <h2>Every win is kept.</h2>
          <p>Every finished online match adds to the board. Bots and pass-and-play do not.</p>
          <button className="hp-link" onClick={() => navigate('/leaderboard')}>See the full board →</button>
        </div>
        <section className="hp-panel" data-ui aria-label="Leaderboard">
          <div className="hp-panel-head"><span>Top players</span><span className="hp-live">by wins</span></div>
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

      {/* ---------- close ---------- */}
      <section className="hp-end hp-in">
        <h2>Open a game.</h2>
        <div className="hp-actions">
          <button className="hp-cta" onClick={() => navigate('/games')}>Browse the games</button>
          <button className="hp-link" onClick={() => navigate('/sky')}>Enter the sky →</button>
        </div>
      </section>

      <footer className="hp-footer">
        <span className="hp-footer-mark">MultiplayerGames.in</span>
        <span className="hp-footer-note">Real-time board and word games, made in India.</span>
      </footer>
    </div>
  );
}
