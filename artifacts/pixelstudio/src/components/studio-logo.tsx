import { cn } from "@/lib/utils";
import logoImage from "@/gbsmlogo.jpg";

type StudioLogoProps = {
  className?: string;
  alt?: string;
};

export function StudioLogo({ className = "", alt = "GBSM Photography Studio logo" }: StudioLogoProps) {
  return (
    <img
      src={logoImage}
      alt={alt}
      draggable={false}
      className={cn("select-none shrink-0 object-contain", className)}
    />
  );
}

export function StudioLogoIcon({ className = "" }: StudioLogoProps) {
  return (
    <StudioLogo
      className={className}
      alt=""
    />
  );
}
