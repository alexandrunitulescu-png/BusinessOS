/**
 * Plain GET form — submitting navigates to `?q=…` on the current route, no
 * client JS required. List pages read the term from `searchParams`.
 */
export function SearchBar({
  defaultValue,
  placeholder = "Caută…",
}: {
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <form className="w-full max-w-xs">
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
      />
    </form>
  );
}
