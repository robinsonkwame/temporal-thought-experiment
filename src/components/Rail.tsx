import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { PHASES, STEPS } from '../steps/meta';
import { stepState } from '../lib/checks';
import { useRun } from './RunContext';

export function Rail({ current }: { current: number }) {
  const { run, base } = useRun();
  const ref = useRef<HTMLElement>(null);
  // On a narrow screen the rail is a strip that scrolls sideways: keep the current step in view.
  useEffect(() => {
    const nav = ref.current;
    const cur = nav?.querySelector<HTMLElement>('[aria-current="step"]');
    if (nav && cur && nav.scrollWidth > nav.clientWidth) nav.scrollLeft = cur.offsetLeft - nav.clientWidth / 2 + cur.clientWidth / 2;
  }, [current]);
  return (
    <nav className="rail" aria-label="Steps" ref={ref}>
      {PHASES.map((phase) => (
        <div key={phase} className="rail-phase">
          {phase !== 'Start' && <p className="rail-phase-name">{phase.toUpperCase()}</p>}
          <ol>
            {STEPS.filter((s) => s.phase === phase).map((s) => {
              const state = stepState(run, s.id);
              return (
                <li key={s.id} className={`rail-item state-${state.replace(/ /g, '-')} ${s.tag === 'M' ? 'is-model' : ''}`}>
                  <Link to={`${base}/${s.id}`} aria-current={s.id === current ? 'step' : undefined}>
                    <span className="rail-num">{s.id}</span>
                    <span className="rail-title">{s.title}</span>
                    <span className="rail-state">{state}</span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>
      ))}
    </nav>
  );
}
