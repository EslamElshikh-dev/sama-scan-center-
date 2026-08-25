import Image from "next/image";
import Link from "next/link";

type BrandProps = {
  priority?: boolean;
};

export function Brand({ priority = false }: BrandProps) {
  return (
    <Link href="/" className="brand" aria-label="مركز سما سكان - الرئيسية">
      <Image
        className="brand-logo"
        src="/sama-scan-logo.png"
        alt="شعار مركز سما سكان للأشعة"
        width={367}
        height={341}
        sizes="(max-width: 640px) 56px, 68px"
        priority={priority}
      />
      <span className="brand-copy">
        <b>مركز سما سكان</b>
        <small>RADIOLOGY CENTER · RIYADH</small>
      </span>
    </Link>
  );
}
