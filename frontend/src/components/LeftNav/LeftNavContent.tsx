"use client"; // May need to be client if it uses hooks later, but for now just passing props

import CollectionsList from "../CollectionsList";
import { Collection } from "@/interfaces/index";

// Define props mirroring CollectionsListProps, plus the user type
interface LeftNavContentProps {
  ownedCollections: Collection[];
  sharedCollections: Collection[];
  isLoading: boolean;
  error: string | null;
  currentUser: { username: string } | null;
}

const LeftNavContent = (props: LeftNavContentProps) => {
  // Pass all received props down to CollectionsList
  return <CollectionsList {...props} />;
};

export default LeftNavContent;
