"use client";

import {
  FaceIcon,
  ImageIcon,
  SunIcon,
  ChevronDownIcon,
} from "@radix-ui/react-icons";

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
        <div className={cn("flex items-start px-4 gap-2")}>
          <div className="flex-1 flex">
            <AccordionTrigger className="p-0 gap-1 text-lg font-semibold [&_svg]:w-6 [&_svg]:h-6">
              {title}
            </AccordionTrigger>
          </div>
        </div>

        <AccordionContent className="px-4 pb-4 pt-0">
          {children}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
