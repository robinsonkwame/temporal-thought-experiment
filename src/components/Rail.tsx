import { Link } from 'react-router-dom';
import { PHASES, STEPS } from '../steps/meta';
import { stepState } from '../lib/checks';
import { useRun } from './RunContext';

export function Rail({ current }: { current: number }) {
  const { run, base } = useRun();
  return (
    <nav className="rail" aria-label="Steps">
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
