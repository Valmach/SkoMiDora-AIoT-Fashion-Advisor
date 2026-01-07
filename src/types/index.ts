'use server';

export async function generateOutfitForEventAction({ wardrobeItems }: { wardrobeItems: any[] }) {
  // 1. Define the Hero Wardrobe (Fallback)
  const heroClothing = [
    {
      itemName: "LOEWE Single-Breasted Blazer",
      imageUrl: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=800&auto=format&fit=crop",
      itemType: "Blazer"
    },
    {
      itemName: "Floral Print Puff-Sleeve Shirtdress",
      imageUrl: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?q=80&w=800&auto=format&fit=crop",
      itemType: "Dress"
    }
  ];

  const heroFootwear = [
    {
      itemName: "Stuart Weitzman 5050 Over-The-Knee Boots",
      imageUrl: "https://images.unsplash.com/photo-1608256246200-53e635b5b65f?q=80&w=800&auto=format&fit=crop",
      itemType: "Boots"
    }
  ];

  // 2. Map Events to Outfits
  const events = [
    { title: "London Design Week", location: "London, UK", pref: "Blazer", shoe: "Boots" },
    { title: "Vogue Fashion Night", location: "Soho", pref: "Dress", shoe: "Boots" }
  ];

  const recommendations = events.map((event, index) => {
    // Try to find in your 108 items, otherwise use Hero items
    const matchedClothing = wardrobeItems.find(i => i.itemName?.includes(event.pref)) || heroClothing[index % heroClothing.length];
    const matchedShoe = wardrobeItems.find(i => i.itemName?.includes(event.shoe)) || heroFootwear[0];

    return {
      title: event.title,
      location: event.location,
      temp: 18,
      condition: "Partly Cloudy",
      clothingName: matchedClothing.itemName,
      clothingImageUrl: matchedClothing.imageUrl, // <--- Ensure this is not empty!
      footwearName: matchedShoe.itemName,
      footwearImageUrl: matchedShoe.imageUrl,
      reasoning: `The ${matchedClothing.itemName} paired with ${matchedShoe.itemName} is a classic silhouette for ${event.title}.`
    };
  });

  return { recommendations };
}