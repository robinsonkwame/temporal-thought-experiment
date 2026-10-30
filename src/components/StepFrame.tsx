import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { STEPS } from '../steps/meta';
import { stepFindings, type Finding } from '../lib/checks';
import { isStale, markChecked } from '../lib/deps';
import { Tag } from './Tag';
import { Banner } from './Banner';
import { useRun } from './RunContext';

const SEVERITY_WORD: Record<Finding['severity'], string> = { missing: 'To do', error: 'Needs attention', warning: 'Note' };

export function FindingList({ findings, linkSteps }: { findings: Finding[]; linkSteps?: boolean }) {
  const { base } = useRun();
  if (!findings.length) return null;
  return (
    <ul className="findings">
      {findings.map((f, i) => (
        <li key={i} className={`finding finding-${f.severity}`}>
          <span className="finding-word">{SEVERITY_WORD[f.severity]}</span>
          {linkSteps && <> <Link to={`${base}/${f.step}`}>Step {f.step}</Link>:</>} {f.message}
        </li>
      ))}
    </ul>
  );
}

function StepNav({ step, where }: { step: number; where: 'top' | 'bottom' }) {
  const { base } = useRun();
  return (
    <div className={`step-nav step-nav-${where}`}>
      {step > 0 ? <Link className="button secondary" to={`${base}/${step - 1}`}>Back</Link> : <span />}
      {step < STEPS.length - 1 ? <Link className="button secondary" to={`${base}/${step + 1}`}>Next</Link> : <span />}
    </div>
  );
}

export function StepFrame({ step, children, showFindings = true }: { step: number; children: ReactNode; showFindings?: boolean }) {
  const { run, editable, update } = useRun();
  const meta = STEPS[step];
  const findings = showFindings ? stepFindings(run, step) : [];
  const stale = isStale(run, step);
  return (
    <article className={`step ${meta.tag === 'M' ? 'step-m' : 'step-h'}`} aria-labelledby="step-heading">
      <StepNav step={step} where="top" />
      <header className="step-head">
        <p className="step-num">Step {step}{meta.phase !== 'Start' ? ` · ${meta.phase}` : ''}</p>
        <h1 id="step-heading" tabIndex={-1}>{meta.heading}</h1>
        <Tag kind={meta.tag} />
      </header>
      <p className="why"><strong>Why this step.</strong> {meta.why}</p>
      <p className="what"><strong>What you do.</strong> {meta.what}</p>
      {stale && (
        <Banner kind="warn">
          An earlier step changed after this one was done. Check it, and copy any prompt again before you run it.{' '}
          {editable && (
            <button type="button" className="button secondary small" onClick={() => update(step, (d) => Object.assign(d, markChecked(d, step)), 'none')}>
              Mark as checked
            </button>
          )}
        </Banner>
      )}
      <FindingList findings={findings} />
      <div className="work">{children}</div>
      <StepNav step={step} where="bottom" />
    </article>
  );
}
