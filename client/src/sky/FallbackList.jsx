import './FallbackList.css';

export default function FallbackList({ stars, onPlay }) {
  return (
    <ul className="sky-fallback" aria-label="Games">
      {stars.map((s) => (
        <li key={s.id}>
          <button className="sky-fallback-item" onClick={() => onPlay(s)}>
            <span className="sky-fallback-glyph" aria-hidden="true">{s.glyph}</span>
            <span className="sky-fallback-name">{s.name}</span>
            <span className="sky-fallback-count">{s.players || 0} playing</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
