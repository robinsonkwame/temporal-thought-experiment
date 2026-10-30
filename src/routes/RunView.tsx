import { useEffect, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { Rail } from '../components/Rail';
import { RunContext, type RunCtx } from '../components/RunContext';
import { STEP_COMPONENTS } from '../steps';
import { RunToolbar } from './RunToolbar';
import { DebugPanel } from '../components/DebugPanel';
import { isDebug } from '../lib/debug';

export function RunView({ ctx, banner, status }: { ctx: RunCtx; banner?: ReactNode; status?: ReactNode }) {
  const params = useParams();
  const raw = Number(params.step ?? '0');
  const step = Number.isInteger(raw) && raw >= 0 && raw <= 14 ? raw : 0;
  const Step = STEP_COMPONENTS[step];

  useEffect(() => {
    window.scrollTo(0, 0);
    document.getElementById('step-heading')?.focus({ preventScroll: true });
  }, [step]);

  return (
    <RunContext.Provider value={ctx}>
      <RunToolbar status={status} />
      {banner}
      <div className="run-layout">
        <Rail current={step} />
        <div className="run-main">
          <Step />
        </div>
      </div>
      {isDebug() && <DebugPanel />}
    </RunContext.Provider>
  );
}
