import { Link } from 'react-router';

export default function Footer() {
  return (
    <footer className="absolute bottom-0 w-full border-t border-gray-300 p-2.5 text-center text-sm">
      Vytvořil <a href="mailto:thran@centrum.cz">Thran</a> &amp; Wizy
      <span className="inline-block w-8" />
      <Link to="/privacy-policy">Privacy policy</Link>
      <span className="inline-block w-8" />
      <a href="/old/">stará verze</a>
    </footer>
  );
}
