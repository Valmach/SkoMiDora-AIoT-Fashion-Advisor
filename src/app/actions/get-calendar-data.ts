'use server';

export async function getCalendarDataAction(wardrobeItems: any[]) {
  // RESTORED HERO ITEMS
  const heroClothing = {
    itemName: "LOEWE Single-Breasted Blazer",
    imageUrl: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=800&auto=format&fit=crop"
  };

  const heroFootwear = {
    itemName: "Stuart Weitzman 5050 Over-The-Knee Boots",
    imageUrl: "https://images.unsplash.com/photo-1608256246200-53e635b5b65f?q=80&w=800&auto=format&fit=crop"
  };

  const mockEvents = [
    { title: "London Design Week", location: "London, UK", pref: "Blazer" },
    { title: "Vogue Fashion Night", location: "Soho, London", pref: "Boots" }
  ];

  return mockEvents.map((event, idx) => {
    // Try to find in your 108 items, otherwise fallback
    const clothingMatch = wardrobeItems.find(i => i.itemName?.includes(event.pref)) || heroClothing;
    
    return {
      title: event.title,
      location: event.location,
      temp: 18,
      condition: "Cloudy",
      clothingName: clothingMatch.itemName,
      clothingImageUrl: clothingMatch.imageUrl || "", 
      footwearName: heroFootwear.itemName,
      footwearImageUrl: heroFootwear.imageUrl,
      reasoning: `The ${clothingMatch.itemName} paired with ${heroFootwear.itemName} creates a sophisticated silhouette.`
    };
  });
}