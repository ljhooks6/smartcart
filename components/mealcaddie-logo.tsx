import Image from "next/image";

type MealCaddieLogoProps = { subtitle?: string };

export function MealCaddieLogo({ subtitle }: MealCaddieLogoProps) {
  return (
    <div className="inline-flex min-w-0 items-center gap-2.5">
      <Image src="/app-icon.png" alt="" width={40} height={40} className="shrink-0 rounded-xl" />
      <div className="min-w-0">
        <p className="font-display text-xl font-semibold leading-6 text-pine">MealCaddie</p>
        {subtitle ? <h1 className="text-xs font-semibold leading-4 text-pine/65">{subtitle}</h1> : null}
      </div>
    </div>
  );
}
