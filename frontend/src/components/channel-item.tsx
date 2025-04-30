"use client";

// Remove unused imports from @radix-ui/react-icons
/*
import {
  FaceIcon,
  ImageIcon,
  SunIcon,
  ChevronDownIcon,
} from "@radix-ui/react-icons";
*/

import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface ChannelItemProps {
  id: string;
  title: string;
  children?: React.ReactNode;
}

export function ChannelItem({ id, title, children }: ChannelItemProps) {
  return (
    <Accordion type="multiple">
      <AccordionItem value={id}>
        <div className={cn("flex items-start gap-2 px-4")}>
          <div className="flex flex-1">
            <AccordionTrigger className="gap-1 p-0 text-lg font-semibold [&_svg]:h-6 [&_svg]:w-6">
              {title}
            </AccordionTrigger>
          </div>
        </div>

        <AccordionContent className="px-4 pt-0 pb-4">
          {children}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
