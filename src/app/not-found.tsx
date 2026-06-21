export const runtime = 'edge';

export default function NotFound() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h2>404 - Page Not Found</h2>
      <p>The page you are looking for could not be found.</p>
      <a href="/" style={{ color: 'blue', textDecoration: 'underline' }}>Go back home</a>
    </div>
  );
}
