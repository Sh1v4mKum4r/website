import './SkyOverlay.css';

export default function SkyOverlay({ star, onPlay, onClose }) {
  if (!star) return null;
  return (
    <div className="sky-capsule" role="dialog" aria-label={`${star.name} details`}>
      <button className="sky-capsule-close" onClick={onClose} aria-label="Close">×</button>
      <div className="sky-capsule-head">
        <span className="sky-capsule-glyph">{star.glyph}</span>
        <div>
          <h3>{star.name}</h3>
          <p>{star.players || 0} playing now</p>
        </div>
      </div>
      <button className="sky-capsule-play" onClick={() => onPlay(star)}>⚡ Play</button>
    </div>
  );
}
