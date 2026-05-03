import type { TFunction } from "i18next";

export type Stage = "regular" | "cuartos" | "semifinal" | "final";
export type Leg = "single" | "ida" | "vuelta";

export interface JornadaLike {
  jornada_number: number;
  stage?: Stage | string | null;
  leg?: Leg | string | null;
}

/**
 * Format a jornada label.
 * - Regular season → "Jornada 17" (uses fallbackLabel translation)
 * - Playoff → "Cuartos — Ida"
 */
export function formatJornadaLabel(
  t: TFunction,
  jornada: JornadaLike,
  fallbackKey = "league.jornadaLabel",
): string {
  const stage = (jornada.stage ?? "regular") as Stage;
  const leg = (jornada.leg ?? "single") as Leg;

  if (stage === "regular") {
    return t(fallbackKey, { number: jornada.jornada_number });
  }
  const stageLabel = t(`stage.${stage}`);
  if (leg === "single") return stageLabel;
  return `${stageLabel} — ${t(`leg.${leg}`)}`;
}
