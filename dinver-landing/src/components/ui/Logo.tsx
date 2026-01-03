import Image from "next/image";

interface LogoProps {
  className?: string;
  showText?: boolean;
  variant?: "light" | "dark";
  size?: "sm" | "md" | "lg";
}

export default function Logo({
  className = "",
  showText = true,
  variant = "dark",
  size = "md",
}: LogoProps) {
  const textColor =
    variant === "dark" ? "text-dinver-dark" : "text-dinver-cream";

  const sizeClasses = {
    sm: { logo: 32, text: "text-xl" },
    md: { logo: 40, text: "text-2xl" },
    lg: { logo: 56, text: "text-3xl" },
  };

  const currentSize = sizeClasses[size];

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Official Dinver Logo */}
      <Image
        src="/logo2.png"
        alt="Dinver"
        width={currentSize.logo}
        height={currentSize.logo}
        className="flex-shrink-0 rounded-xl"
        priority
      />
      {showText && (
        <span
          className={`${currentSize.text} font-bold tracking-tight ${textColor}`}
        >
          Dinver
        </span>
      )}
    </div>
  );
}
