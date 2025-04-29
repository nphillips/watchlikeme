import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import NewColModal from "./NewColModal";
import { useState } from "react";

const NewColTrigger = () => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create Collection</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <NewColModal onOpenChange={setOpen} />
      </DialogContent>
    </Dialog>
  );
};

export default NewColTrigger;
