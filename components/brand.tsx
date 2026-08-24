import Link from "next/link";

export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="مركز سما سكان - الرئيسية">
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 52 52" role="img">
          <circle cx="26" cy="26" r="22" />
          <circle cx="26" cy="26" r="13" />
          <path d="M13 27h7l3-7 5 14 3-7h8" />
        </svg>
      </span>
      <span className="brand-copy">
        <b>مركز سما سكان</b>
        <small>SAMA SCAN · RIYADH</small>
      </span>
    </Link>
  );
}
