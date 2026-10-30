import { useEffect, useState } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import { Home } from './routes/Home';
import { RunEditor } from './routes/RunEditor';
import { Example } from './routes/Example';
import { NotFound } from './routes/NotFound';
import { Banner } from './components/Banner';
import { setLiveRegion } from './components/announce';
import { onCookieFull } from './lib/cookie';

export function App() {
  const [cookieFull, setCookieFull] = useState(false);
  useEffect(() => {
    onCookieFull(() => setCookieFull(true));
    return () => onCookieFull(null);
  }, []);
  return (
    <>
      <a className="skip-link" href="#main">Skip to the content</a>
      <header className="site-header">
        <Link to="/" className="site-name">Temporal thought experiment</Link>
        <nav aria-label="Site"><Link to="/">My runs</Link> <Link to="/example/utaut2/0">Worked example</Link></nav>
      </header>
      {cookieFull && (
        <Banner kind="warn">Your list of runs on this device is full. The oldest runs were removed from the list. They still exist at their links.</Banner>
      )}
      <main id="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/run/:id/:step?" element={<RunEditor />} />
          <Route path="/example/utaut2/:step?" element={<Example />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <footer className="site-footer">
        <p>Runs are stored on Netlify. Anyone with a run's link can read it. Your browser keeps the list of your runs and the keys to edit them in a cookie. Do not enter personal or confidential data.</p>
        <p className="muted">Workbench {__APP_VERSION__}. Prompt templates 2.4 and 2.5.</p>
      </footer>
      <div className="visually-hidden" aria-live="polite" ref={setLiveRegion} />
    </>
  );
}
