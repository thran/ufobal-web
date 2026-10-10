import { Link } from 'react-router';

export default function NotFound() {
  return (
    <div className="callout">
      <h2>Stránka nenalezena</h2>
      <Link to="/">Zpět na úvod</Link>
    </div>
  );
}
