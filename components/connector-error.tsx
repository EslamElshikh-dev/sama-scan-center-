export function ConnectorError({ error, reconnectHref }: { error: { status: string; message: string }; connectorName: string; reconnectHref: string }) {
  return <div role="alert"><p>{error.message}</p><a className="text-link" href={reconnectHref}>تسجيل الدخول من جديد</a></div>;
}
