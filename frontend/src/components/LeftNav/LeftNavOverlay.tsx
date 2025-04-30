import Logo from "../Logo";
import LeftNavContent from "./LeftNavContent";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Collection } from "@/interfaces/index";

interface LeftNavOverlayProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  ownedCollections: Collection[];
  sharedCollections: Collection[];
  isLoading: boolean;
  error: string | null;
  currentUser: { username: string } | null;
}

const LeftNavOverlay = ({
  isOpen,
  onOpenChange,
  ownedCollections,
  sharedCollections,
  isLoading,
  error,
  currentUser,
}: LeftNavOverlayProps) => {
  console.log("LeftNavOverlay: Rendering with isOpen =", isOpen);
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="dark p-0 text-slate-50">
        <SheetHeader>
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <Logo />
        </SheetHeader>

        <div className="px-4">
          <LeftNavContent
            ownedCollections={ownedCollections}
            sharedCollections={sharedCollections}
            isLoading={isLoading}
            error={error}
            currentUser={currentUser}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default LeftNavOverlay;
