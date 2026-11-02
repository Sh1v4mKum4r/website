import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../socket';
import { API_URL } from '../config';
import { SKY_GAMES } from '../sky/games';
import { layoutStars, applyCounts } from '../sky/skyModel';
import SkyCanvas from '../sky/SkyCanvas';
import MotifIcon from '../components/MotifIcon';
import './Home.css';

const GROUPS = [
  { key: 'strategy', label: 'Strategy' },
  { key: 'word', label: 'Word' },
  { key: 'party', label: 'Party' },
];

export default function Home() {
  const navigate = useNavigate();
  const heroRef = useRef(null);
  const [counts, setCounts] = useState({});
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [board, setBoard] = useState([]);
  const [hero, setHero] = useState({ w: 900, h: 520 });

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
    const el = heroRef.current;
    if (!el) return;
    const measure = () => setHero({ w: el.clientWidth || window.innerWidth, h: el.clientHeight || 520 });
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
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
  const heroStars = useMemo(
    () => applyCounts(layoutStars(SKY_GAMES, { width: hero.w, height: hero.h }), counts),
    [hero.w, hero.h, counts]
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

      {/* ---------- hero: the living constellation ---------- */}
      <header className="hp-hero" ref={heroRef}>
        <div className="hp-hero-sky" aria-hidden="true">
          <SkyCanvas stars={heroStars} effects={[]} width={hero.w} height={hero.h} onSelect={play} interactive={false} />
        </div>
        <div className="hp-hero-copy">
          <h1 className="hp-title">
            <span className="hp-reveal"><span>Fourteen games,</span></span>
            <span className="hp-reveal"><span>written in the stars.</span></span>
          </h1>
          <p className="hp-lead">A whole sky of real-time board and word games. Pick a star, share a room code, play. {totalPlayers > 0 ? `${totalPlayers} playing now.` : ''}</p>
          <div className="hp-actions">
            <button className="hp-cta" onClick={() => navigate('/sky')}>Enter the sky</button>
            <button className="hp-link" onClick={() => navigate('/games')}>Classic list →</button>
          </div>
        </div>
      </header>

      {/* ---------- every game ---------- */}
      <section className="hp-games hp-in" id="games">
        <h2>Fourteen games.</h2>
        {GROUPS.map((grp) => (
          <div className="hp-group hp-in" key={grp.key}>
            <h3>{grp.label}</h3>
            <ul className="hp-grid" data-ui>
              {SKY_GAMES.filter((g) => g.cluster === grp.key).map((g) => (
                <li key={g.id}>
                  <button onClick={() => play(g)}>
                    <MotifIcon id={g.id} size={44} color="#e3e9ff" />
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
          <div className="hp-step-text"><h3>Pick a star.</h3><p>Every game is a star in the sky — a chess grid, a word board, an atom chain. Click one and it opens.</p></div>
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
        <h2>The sky is open.</h2>
        <div className="hp-actions">
          <button className="hp-cta" onClick={() => navigate('/sky')}>Enter the sky</button>
          <button className="hp-link" onClick={() => navigate('/games')}>Classic list →</button>
        </div>
      </section>

      <footer className="hp-footer">
        <span className="hp-footer-mark">MultiplayerGames.in</span>
        <span className="hp-footer-note">Real-time board and word games, made in India.</span>
      </footer>
    </div>
  );
}
