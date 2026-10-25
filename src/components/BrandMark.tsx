import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export const BrandMark = ({ children }: { children?: ReactNode }) => (
  <div className="flex items-center space-x-3">
    <Link to="/" className="flex items-center space-x-2">
      <img src="/brand/veritas-mark.png" alt="" className="h-8 w-8 rounded-md object-cover" />
      <span className="font-heading text-xl font-semibold text-foreground hover:text-primary transition-colors">
        Veritas Vector Garden
      </span>
    </Link>
    {children}
  </div>
);
