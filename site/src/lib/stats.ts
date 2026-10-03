/**
 * Impact stats, split into a numeric target and its surrounding text so the
 * page can count up to the number (see scripts/motion.ts) while the HTML still
 * carries the exact final value. Used by the home and About stat lists.
 */

const format = new Intl.NumberFormat('en-US').format;

export interface Stat {
  label: string;
  /** The final value exactly as shown: prefix, grouped number, suffix. */
  text: string;
  /** Integer the figure counts up to. Absent when the value cannot count up
   *  and still end on exactly `text`; it is then shown as written. */
  count?: number;
  prefix: string;
  suffix: string;
}

const countable = (n: number) => Number.isSafeInteger(n) && n >= 0;

/** A stat from a Keystatic integer, with an optional suffix such as "+". */
export function statFromNumber(n: number, label: string, suffix = ''): Stat {
  const text = `${format(n)}${suffix}`;
  return countable(n) ? { label, text, count: n, prefix: '', suffix } : { label, text, prefix: '', suffix: '' };
}

/** A stat from free text such as "900,000+". Only a value that is a grouped
 *  integer with non-numeric text around it counts up; anything else ("2.5M",
 *  "3122", "10 to 12") is shown as written, never reformatted. */
export function statFromText(value: string, label: string): Stat {
  const text = value.trim();
  const match = /^(\D*?)(\d+(?:,\d{3})*)(\D*)$/.exec(text);
  if (match) {
    const [, prefix, digits, suffix] = match;
    const n = Number(digits.replaceAll(',', ''));
    if (countable(n) && format(n) === digits) return { label, text, count: n, prefix, suffix };
  }
  return { label, text, prefix: '', suffix: '' };
}
