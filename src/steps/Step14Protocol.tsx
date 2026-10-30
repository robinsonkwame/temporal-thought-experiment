import { StepFrame } from '../components/StepFrame';
import { useRun } from '../components/RunContext';
import { ExportButtons } from '../routes/RunToolbar';

export function Step14Protocol() {
  const { run } = useRun();
  const p = run.provoke;
  const replies = (p.slot?.attempts.filter((a) => a.replyText !== undefined).length ?? 0)
    + (p.stage1?.exchange.replyText ? 1 : 0)
    + (p.stage2?.drafts.filter((d) => d.replyText !== undefined).length ?? 0)
    + (p.cutoff?.exchange.replyText ? 1 : 0);
  return (
    <StepFrame step={14}>
      <ExportButtons primary />
      <ul className="summary">
        <li>{run.draw.picks.length} pick{run.draw.picks.length === 1 ? '' : 's'}.</li>
        <li>{replies} repl{replies === 1 ? 'y' : 'ies'} received.</li>
        <li>{p.stage2?.edits.length ?? 0} edit{(p.stage2?.edits.length ?? 0) === 1 ? '' : 's'} to the accounts and tables.</li>
        <li>{run.log?.length ?? 0} entr{(run.log?.length ?? 0) === 1 ? 'y' : 'ies'} in the log.</li>
      </ul>
    </StepFrame>
  );
}
