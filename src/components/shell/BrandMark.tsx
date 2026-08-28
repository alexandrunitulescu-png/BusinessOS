/**
 * BusinessPuls lockup for the sidebar header.
 *
 * Placeholder mark until the real logo lands: drop `logo.svg` into `public/` and
 * swap the `<span>` tile below for `<img src="/logo.svg" alt="" className="h-7 w-7" />`.
 * The blue tile + cyan pulse underline approximates the brand in the meantime.
 */
export function BrandMark() {
  return (
    <span className="flex items-center gap-2">
      <span className="grid h-7 w-7 place-items-center rounded-md bg-brand text-xs font-bold text-text-on-brand">
        B
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-sm font-semibold text-text">BusinessPuls</span>
        <span className="mt-1 h-px w-full bg-gradient-to-r from-accent to-transparent" />
      </span>
    </span>
  );
}
