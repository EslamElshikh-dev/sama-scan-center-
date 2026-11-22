import Image from "next/image";
import Link from "next/link";

type BrandProps = {
  eager?: boolean;
};

export function Brand({ eager = false }: BrandProps) {
  return (
    <Link href="/" className="brand" aria-label="مركز سما سكان - الرئيسية">
      <Image
        className="brand-logo"
        src="/sama-scan-logo.png"
        alt="شعار مركز سما سكان للأشعة"
        width={367}
        height={341}
        sizes="(max-width: 640px) 52px, 64px"
        loading={eager ? "eager" : undefined}
      />
      <span className="brand-copy">
        <b>مركز سما سكان</b>
        <small>RADIOLOGY CENTER · RIYADH</small>
      </span>
    </Link>
  );
}
