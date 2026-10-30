export function Tag({ kind }: { kind: 'H' | 'M' }) {
  return (
    <span className={`tag tag-${kind}`} title={kind === 'M' ? 'Model step' : 'Researcher step'}>
      {kind}
      <span className="visually-hidden">{kind === 'M' ? ' (model step)' : ' (researcher step)'}</span>
    </span>
  );
}
