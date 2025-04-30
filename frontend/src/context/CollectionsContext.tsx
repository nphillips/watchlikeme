"use client";

import { createContext, useContext } from "react";
import { Collection } from "@/interfaces/index";

interface CollectionsContextType {
  ownedCollections: Collection[];
  sharedCollections: Collection[];
  isLoading: boolean;
  error: string | null;
  currentUser: { username: string } | null;
}

const CollectionsContext = createContext<CollectionsContextType | undefined>(
  undefined,
);

export const useCollections = () => {
  const context = useContext(CollectionsContext);
  if (context === undefined) {
    throw new Error("useCollections must be used within a CollectionsProvider");
  }
  return context;
};

// Provider component definition (though we might wrap directly in AppLayout)
// interface CollectionsProviderProps {
//   children: ReactNode;
//   value: CollectionsContextType;
// }
// export const CollectionsProvider = ({ children, value }: CollectionsProviderProps) => {
//   return (
//     <CollectionsContext.Provider value={value}>
//       {children}
//     </CollectionsContext.Provider>
//   );
// };

// Export the context itself if needed for direct provider usage
export { CollectionsContext };
