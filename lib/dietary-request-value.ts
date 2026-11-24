// A structured dietary value may start with a significant newline. Never trim
// its transport or rewrite saved restrictions; only truly empty input needs the
// explicit no-preference value required by the generation request schema.
export function dietForGeneration(value: string) {
  return value.trim() ? value : "No preference";
}
