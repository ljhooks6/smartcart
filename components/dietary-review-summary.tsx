import { dietarySummary } from "../lib/dietary-summary";

export function DietaryReviewSummary({ value }: { value: string }) {
  const { rows, warning } = dietarySummary(value);
  return <div className="space-y-1 break-words">
    {rows.map((row, index) => <p key={index}>{row}</p>)}
    {warning ? <p role="alert" className="text-berry">{warning}</p> : null}
  </div>;
}
