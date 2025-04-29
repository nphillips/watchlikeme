import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { mutate } from "swr";
import { createCollection } from "@/lib/api/collections";
import { useAuth } from "@/hooks/useAuth";

const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-");
};

interface NewColModalProps {
  onOpenChange?: (open: boolean) => void;
}

const NewColModal = ({ onOpenChange }: NewColModalProps) => {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    setSlug(generateSlug(name));
  }, [name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !slug || isLoading || !user) return;

    setIsLoading(true);
    setError(null);

    try {
      console.log("Submitting new collection:", { name, slug });
      const newCollection = await createCollection(name, slug);
      console.log("Collection created:", newCollection);

      await mutate("/api/collections");

      router.push(`/${newCollection.userSlug}/${newCollection.slug}`);

      onOpenChange?.(false);
    } catch (err: any) {
      console.error("Failed to create collection:", err);
      const message = err.message || "An unexpected error occurred.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>Create New Collection</DialogTitle>
        <DialogDescription>
          Give your new collection a name. A URL-friendly slug will be generated
          automatically.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="name" className="text-right">
            Name
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="col-span-3"
            required
            disabled={isLoading}
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="slug" className="text-right">
            Slug
          </Label>
          <Input
            id="slug"
            value={slug}
            className="bg-muted col-span-3"
            readOnly
            disabled
            aria-describedby={
              error?.includes("(Field: slug)") ? "slug-error" : undefined
            }
          />
        </div>
        {error && (
          <p
            id="slug-error"
            className="col-span-4 text-center text-sm text-red-500"
          >
            {error}
          </p>
        )}
      </div>
      <DialogFooter>
        <Button type="submit" disabled={isLoading || !name || !slug}>
          {isLoading ? "Creating..." : "Create Collection"}
        </Button>
      </DialogFooter>
    </form>
  );
};

export default NewColModal;
