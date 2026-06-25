export async function uploadWardrobeImage(file: File, userId: string): Promise<string> {
  if (!file) {
    throw new Error("No file object provided to uploadWardrobeImage.");
  }

  const imageBase64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;

    reader.readAsDataURL(file);
  });

  const response = await fetch("/api/storage-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      imageBase64,
      fileName: file.name || `wardrobe_${Date.now()}.jpg`,
      userId,
    }),
  });

  const text = await response.text();

  if (!response.ok) {
    console.error("Wardrobe backend upload failed:", response.status, text);
    throw new Error(`Wardrobe backend upload failed: ${response.status}`);
  }

  const result = JSON.parse(text);

  if (!result.imageUrl) {
    throw new Error("Storage upload completed, but no imageUrl was returned.");
  }

  return result.imageUrl;
}
