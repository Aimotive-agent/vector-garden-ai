import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export const SignOutButton = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        await signOut();
        navigate("/auth", { replace: true });
      }}
    >
      <LogOut className="h-4 w-4 mr-2" />
      Sign Out
    </Button>
  );
};
