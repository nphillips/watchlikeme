import LeftNavContent from "./LeftNavContent";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

// Define props
interface LeftNavOverlayProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const LeftNavOverlay = ({ isOpen, onOpenChange }: LeftNavOverlayProps) => {
  console.log("LeftNavOverlay: Rendering with isOpen =", isOpen);
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="dark p-0 text-slate-50">
        <SheetHeader>
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
        </SheetHeader>
        <LeftNavContent
          ownedCollections={[]}
          sharedCollections={[]}
          isLoading={false}
          error={null}
          currentUser={null}
        />
      </SheetContent>
    </Sheet>
  );
};

export default LeftNavOverlay;
