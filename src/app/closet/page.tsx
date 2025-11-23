
"use client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";


import { useEffect, useState, useCallback, useRef, useTransition } from "react";
import Image from "next/image";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  type QueryDocumentSnapshot,
  type DocumentData,
} from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Upload,
  Trash2,
  AlertCircle,
  Tag,
  Palette,
  Sparkles,
  Wand2,
  FileText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

import {
  analyzeAndSaveClothingItem,
  deleteClothingItem,
} from "@/app/actions";
import type { AnalyzedItem } from "@/types";
import { safeToMillis } from "@/types";
import { useFirebase } from "@/firebase/provider";

export default function ClosetPage() {
  const firebase = useFirebase();
  const [items, setItems] = useState<AnalyzedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "analyzing"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [isAnalyzing, startAnalyzingTransition] = useTransition();

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!file) return;
      setError(null);

      const formData = new FormData();
      formData.append('file', file);

      startAnalyzingTransition(async () => {
        setUploadStatus("analyzing");
        toast({
          title: "Uploading & Analyzing...",
          description: "Your item is being uploaded and analyzed by the AI. This may take a moment.",
        });

        try {
          const result = await analyzeAndSaveClothingItem(formData);
          
          if ('error' in result) {
            throw new Error(result.error);
          }

          toast({
            title: "Item Added!",
            description: `"${result.itemName}" is now in your closet.`,
          });
        } catch (e: any) {
          console.error("Single-step upload and analyze failed:", e);
          const errorMessage = e.message || "An unknown error occurred during the process.";
          setError(errorMessage);
          toast({
            title: "Upload Failed",
            description: errorMessage,
            variant: "destructive",
          });
        } finally {
          setUploadStatus("idle");
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        }
      });
    },
    [toast],
  );

  const onDelete = useCallback(
    async (item: AnalyzedItem) => {
      if (!item.id) {
        toast({
          title: "Deletion Error",
          description: "Item has no ID.",
          variant: "destructive",
        });
        return;
      }

      try {
        const result = await deleteClothingItem(item.id, item.imagePath);
        if ("error" in result) {
          toast({
            title: "Deletion Failed",
            description: result.error,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Item Deleted",
            description: `"${item.itemName}" has been removed.`,
          });
        }
      } catch (e: any) {
        toast({
          title: "Deletion Failed",
          description: e.message || "An unexpected error occurred.",
          variant: "destructive",
        });
        console.error("Delete failed on client:", e);
      }
    },
    [toast],
  );

  useEffect(() => {
    if (!firebase) {
        setLoading(false);
        setError("Firebase is not connected. Please check your configuration.");
        return;
    }
    setLoading(true);
    const colRef = collection(firebase.firestore, "publicWardrobeItems");
    const q = query(colRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedItems = snapshot.docs.map(
          (d: QueryDocumentSnapshot<DocumentData>) => {
            const data = d.data();
            const item: AnalyzedItem = {
              id: d.id,
              imageUrl: data.imageUrl,
              imagePath: data.imagePath,
              itemName: data.itemName,
              itemType: data.itemType,
              color: data.color,
              styleKeywords: data.styleKeywords || [],
              narrativeDescription: data.narrativeDescription,
              detailedSpecifications: data.detailedSpecifications,
              designerName: data.designerName,
              generalMaterial: data.generalMaterial || "unknown",
              createdAt: safeToMillis(data.createdAt),
            };
            return item;
          },
        );

        setItems(fetchedItems);
        setError(null);
        setLoading(false);
      },
      (err) => {
        console.error("Closet listener error:", err);
        setError(
          "Failed to connect to the closet. Please check your connection and refresh.",
        );
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [firebase]);

  const isProcessing = uploadStatus !== "idle" || isAnalyzing;
  const getButtonContent = () => {
    if (isProcessing) {
        return (
          <>
            <Wand2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...
          </>
        );
    }
    return (
      <>
        <Upload className="mr-2 h-4 w-4" /> Add Item
      </>
    );
  };

  return (
    <div className="container mx-auto space-y-8">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold font-calligraphy">Digital Closet</h1>
              <p className="text-muted-foreground">
                Add and manage the items in your virtual wardrobe.
              </p>
            </div>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
            >
              {getButtonContent()}
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleFileSelect(file);
                }
              }}
            />
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive-foreground">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="ml-4 text-muted-foreground">Loading your closet...</p>
        </div>
      ) : items.length === 0 && !error ? (
        <Card>
          <CardContent className="py-20 text-center">
            <h3 className="text-lg font-medium text-muted-foreground">
              Your Digital Closet is empty.
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Click &quot;Add Item&quot; to start building your collection.
            </p>
          </CardContent>
        </Card>
      ) : items.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {items.map((item) => (
            <div key={item.id} className="group flex flex-col space-y-3">
              <h2 className="font-semibold text-lg truncate text-center">
                {item.itemName || "Unnamed Item"}
              </h2>
              <div className="relative aspect-square w-full bg-muted rounded-lg overflow-hidden shadow-md">
                {item.imageUrl && (
                  <Image
                    src={item.imageUrl}
                    alt={item.itemName || "wardrobe item"}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-contain transition-transform duration-300 group-hover:scale-105"
                  />
                )}
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => onDelete(item)}
                    aria-label="Delete item"
                    className="h-8 w-8"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-4 pt-2">
                <div className="flex items-center space-x-3">
                  <Tag className="h-5 w-5 text-accent flex-shrink-0" />
                  <span className="font-semibold text-sm">Type:</span>
                  <Badge variant="secondary" className="capitalize">
                    {item.itemType || "Uncategorized"}
                  </Badge>
                </div>
                <div className="flex items-center space-x-3">
                  <Palette className="h-5 w-5 text-accent flex-shrink-0" />
                  <span className="font-semibold text-sm">Colour:</span>
                  <span className="text-sm text-muted-foreground">
                    {item.color || "Not specified"}
                  </span>
                </div>
                {item.narrativeDescription && (
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-accent flex-shrink-0" />
                      <span className="font-semibold text-sm">Description</span>
                    </div>
                    <p className="text-sm text-muted-foreground pl-8 leading-relaxed">
                      {item.narrativeDescription}
                    </p>
                  </div>
                )}
                {item.styleKeywords && item.styleKeywords.length > 0 && (
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center space-x-3">
                      <Sparkles className="h-5 w-5 text-accent flex-shrink-0" />
                      <span className="font-semibold text-sm">
                        Style Keywords
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 pl-8">
                      {item.styleKeywords.map((keyword) => (
                        <Badge
                          key={keyword}
                          variant="destructive"
                          className="capitalize"
                        >
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : null }
    </div>
  );
}
