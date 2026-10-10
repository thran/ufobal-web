import { isRouteErrorResponse, Link, useRouteError } from 'react-router';

export default function RouteError() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Neznámá chyba';
  return (
    <div role="alert" className="callout callout-alert m-4">
      <h2 className="text-white">Něco se pokazilo</h2>
      <p>{message}</p>
      <Link className="text-white underline" to="/">
        Zpět na úvod
      </Link>
    </div>
  );
}
