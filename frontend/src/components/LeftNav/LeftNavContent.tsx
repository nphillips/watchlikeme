"use client";

import CollectionsList from "../CollectionsList";
import { Collection } from "@/interfaces/index";

interface LeftNavContentProps {
  ownedCollections: Collection[];
  sharedCollections: Collection[];
  isLoading: boolean;
  error: string | null;
  currentUser: { username: string } | null;
}

const LeftNavContent = (props: LeftNavContentProps) => {
  return <CollectionsList {...props} />;
};

export default LeftNavContent;
