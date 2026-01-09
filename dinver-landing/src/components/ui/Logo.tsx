import Image from "next/image";

interface LogoProps {
  className?: string;
  variant?: "light" | "dark";
  size?: "sm" | "md" | "lg";
}

export default function Logo({
  className = "",
  variant = "dark",
  size = "md",
}: LogoProps) {
  const logoSrc = variant === "light" ? "/logo_long_y.png" : "/logo_long_g.png";

  const sizeClasses = {
    sm: { height: 20, width: 78 },
    md: { height: 26, width: 102 },
    lg: { height: 36, width: 141 },
  };

  const currentSize = sizeClasses[size];

  return (
    <div className={`flex items-center ${className}`}>
      <Image
        src={logoSrc}
        alt="Dinver"
        width={currentSize.width}
        height={currentSize.height}
        className="shrink-0"
        priority
      />
    </div>
  );
}
