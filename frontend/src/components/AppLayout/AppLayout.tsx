"use client";

import { useState, useEffect } from "react";
import Nav from "@/components/Nav/Nav";
import LeftNavOverlay from "@/components/LeftNav/LeftNavOverlay";

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Log state changes
  useEffect(() => {
    console.log("AppLayout: isSheetOpen state changed to:", isSheetOpen);
  }, [isSheetOpen]);

  const handleMenuClick = () => {
    console.log(
      "AppLayout: handleMenuClick called, setting isSheetOpen to true",
    );
    setIsSheetOpen(true);
  };

  return (
    <>
      {/* Render Nav, passing the sheet toggle function */}
      <Nav onMenuClick={handleMenuClick} />

      {/* Render LeftNavOverlay (Mobile Sheet), controlled by state */}
      <LeftNavOverlay isOpen={isSheetOpen} onOpenChange={setIsSheetOpen} />

      {/* Main content area with appropriate padding */}
      <main data-container="main" className="pt-[var(--height-nav)]">
        {children}
      </main>
    </>
  );
};

export default AppLayout;
