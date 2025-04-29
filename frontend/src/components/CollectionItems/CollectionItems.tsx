import { PopulatedCollectionItem } from "@/interfaces";
import CollectionItem from "./CollectionItem";

interface CollectionItemsProps {
  items: PopulatedCollectionItem[];
  isOwner: boolean;
  onRemoveItem: (itemId: string) => void;
  removingItemId: string | null;
  isLoading: boolean;
}

const CollectionItems = ({
  items,
  isOwner,
  onRemoveItem,
  removingItemId,
  isLoading,
}: CollectionItemsProps) => {
  if (isLoading && items.length === 0) {
    return (
      <div className="flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isLoading && items.length === 0) {
    return (
      <div className="text-center text-gray-500">
        No items in this collection yet.
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] [grid-template-rows:repeat(2,min-content)] gap-2">
      {items.map((item) => (
        <CollectionItem
          key={item.id}
          item={item}
          isOwner={isOwner}
          onRemove={() => onRemoveItem(item.id)}
          isRemoving={removingItemId === item.id}
        />
      ))}
    </ul>
  );
};

export default CollectionItems;
