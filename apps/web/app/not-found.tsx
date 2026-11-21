import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto mt-10 max-w-md rounded-lg border border-line bg-paper p-6 text-center">
      <h1 className="text-lg font-semibold">Page not found</h1>
      <p className="mt-1 text-[13px] text-muted">That address does not exist in Threadline. Use the menu to pick a page, or start from the Overview.</p>
      <Link href="/" className="mt-4 inline-block rounded-md bg-navy px-3 py-1.5 text-[13px] font-medium text-white">Go to Overview</Link>
    </div>
  );
}
