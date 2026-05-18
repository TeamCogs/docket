"use client";

interface Props {
  verbose?: boolean;
}

export default function NetworkBadge({ verbose = false }: Props) {
  return (
    <span className="netbadge">
      <span className="netbadge-dot" aria-hidden />
      {verbose ? "0 bytes sent · offline" : "offline · local only"}
    </span>
  );
}
