import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "./ui/button";

interface MobilePageHeaderProps {
  title: string;
}

const MobilePageHeader = ({ title }: MobilePageHeaderProps) => {
  const navigate = useNavigate();

  return (
    <header className="md:hidden flex items-center h-16 px-4 bg-primary text-primary-foreground sticky top-0 z-10">
      <Button variant="ghost" size="icon" className="-ml-2" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-6 w-6" />
      </Button>
      <h1 className="text-xl font-bold mx-auto pr-8">{title}</h1>
    </header>
  );
};

export default MobilePageHeader;