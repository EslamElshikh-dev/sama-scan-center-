import type { SVGProps } from "react";

export type IconName =
  | "arrow"
  | "call"
  | "check"
  | "clock"
  | "cube"
  | "flow"
  | "map"
  | "menu"
  | "scan"
  | "shield"
  | "ultrasound"
  | "whatsapp";

type Props = SVGProps<SVGSVGElement> & { name: IconName };

export function Icon({ name, ...props }: Props) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    focusable: false,
    ...props,
  };

  if (name === "call") {
    return (
      <svg {...common}>
        <path d="M8.2 3.5 5.8 4.6c-1 .5-1.5 1.6-1.2 2.7 1.6 6 6.3 10.7 12.3 12.3 1.1.3 2.2-.2 2.7-1.2l1-2.3a1.5 1.5 0 0 0-.5-1.8l-3-2.2a1.5 1.5 0 0 0-1.9.1l-1.5 1.4a12.2 12.2 0 0 1-3.3-3.3l1.4-1.5a1.5 1.5 0 0 0 .1-1.9l-2-2.9a1.5 1.5 0 0 0-1.7-.5Z" />
      </svg>
    );
  }

  if (name === "whatsapp") {
    return (
      <svg {...common} fill="currentColor" stroke="none">
        <path d="M12.04 2a9.84 9.84 0 0 0-8.53 14.73L2 22l5.4-1.42A9.96 9.96 0 1 0 12.04 2Zm0 18.18a8.14 8.14 0 0 1-4.15-1.13l-.3-.18-3.2.84.86-3.12-.2-.32a8.16 8.16 0 1 1 6.99 3.91Zm4.48-6.1c-.25-.12-1.46-.72-1.69-.8-.23-.09-.4-.13-.57.12-.16.25-.63.8-.78.97-.14.16-.29.18-.53.06-.25-.13-1.04-.39-1.98-1.22a7.4 7.4 0 0 1-1.37-1.7c-.14-.25-.01-.38.11-.5.11-.1.25-.28.37-.43.12-.14.16-.24.24-.4.09-.17.04-.31-.02-.44-.06-.12-.55-1.32-.75-1.8-.2-.48-.4-.42-.57-.42h-.48c-.16 0-.43.06-.65.3-.23.25-.86.84-.86 2.04s.88 2.37 1 2.53c.12.17 1.73 2.64 4.19 3.7.58.25 1.04.4 1.4.51.58.19 1.11.16 1.53.1.47-.07 1.46-.6 1.66-1.17.21-.58.21-1.08.15-1.18-.06-.1-.22-.17-.47-.29Z" />
      </svg>
    );
  }

  if (name === "map") {
    return (
      <svg {...common}>
        <path d="M20 10c0 4.7-8 11-8 11s-8-6.3-8-11a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
    );
  }

  if (name === "clock") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }

  if (name === "arrow") {
    return (
      <svg {...common}>
        <path d="m14 6-6 6 6 6" />
      </svg>
    );
  }

  if (name === "menu") {
    return (
      <svg {...common}>
        <path d="M4 7h16M4 12h16M4 17h16" />
      </svg>
    );
  }

  if (name === "check") {
    return (
      <svg {...common}>
        <path d="m5 12 4 4L19 6" />
      </svg>
    );
  }

  if (name === "shield") {
    return (
      <svg {...common}>
        <path d="M12 3 5 6v5c0 4.7 3 8.1 7 10 4-1.9 7-5.3 7-10V6l-7-3Z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    );
  }

  if (name === "scan") {
    return (
      <svg {...common}>
        <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" />
        <circle cx="12" cy="12" r="4" />
        <path d="M6 12h12" />
      </svg>
    );
  }

  if (name === "ultrasound") {
    return (
      <svg {...common}>
        <path d="M4 15c2-5 4-7 7-7 4 0 4 6 7 6 1 0 1.7-.5 2-1" />
        <path d="M4 19c2-3 4-4 6-4 3 0 4 3 7 3 1.2 0 2.2-.5 3-1.4" />
        <path d="M5 5h4l2 3" />
      </svg>
    );
  }

  if (name === "flow") {
    return (
      <svg {...common}>
        <path d="M4 8c3-4 5-4 8 0s5 4 8 0M4 16c3-4 5-4 8 0s5 4 8 0" />
        <path d="m17 5 3 3-3 3M7 13l-3 3 3 3" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="m12 2 8 4.5v9L12 22l-8-6.5v-9L12 2Z" />
      <path d="m4 6.5 8 5 8-5M12 11.5V22" />
    </svg>
  );
}
