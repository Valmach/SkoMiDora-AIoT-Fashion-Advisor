import { NextResponse } from 'next/server';

interface ClosetItem {
  id: string;
  itemName: string;
  category: string;
  color?: string;
  material?: string;
}

// 1. EMBEDDED PROMPT BUILDER FUNCTION
function generateStylingPrompt(entireCloset: ClosetItem[], previousSelections: string[] = []) {
  // Compress the entire closet matrix to keep token count small while maximizing layout visibility
  const serializedCloset = entireCloset.reduce((acc, item) => {
    const cat = (item.category || 'other').toLowerCase();
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push({
      name: item.itemName,
      color: item.color || 'Unspecified',
      material: item.material || 'Unspecified'
    });
    return acc;
  }, {} as Record<string, Array<{ name: string; color: string; material: string }>>);

  // Compile blacklisted items to force wardrobe rotation
  const exclusionList = previousSelections.length > 0 
    ? `\nRECENTLY USED STYLES (PENALIZE SELECTION): \n- ${previousSelections.join('\n- ')}` 
    : '';

  return `
You are the elite concierge fashion director for SkoMiDora. Your task is to generate a highly curated, weather-appropriate outfit recommendation for our global events itinerary.

USER CLOSET INVENTORY MATRIX:
${JSON.stringify(serializedCloset, null, 2)}
${exclusionList}

STRICT ARCHITECTURAL CONSTRAINTS:
1. GLOBAL DIVERSITY MANDATE: You must explore a wide variety of global fashion capitals and regional climates (e.g., Tokyo, Milan, St. Moritz, Paris, Kyoto, New York, Ibiza, London). Do NOT repeat the same location profile.
2. EXTENSIVE CLOSET ROTATION: You must dig deep into the user's closet inventory. Actively look for creative pairings. For every card generated, at least 50% of the selected pieces must be items NOT listed in the "RECENTLY USED STYLES" list above. Rotate through the closet inventory completely.
3. IMMUTABILITY COMPLIANCE: Do NOT alter, hallucinate, or modify the colors, fabrics, or names of the items provided in the user's inventory. You must use the item names exactly as they are listed. No creative renaming (e.g., if an item is "Watermelon Silk", do not rename it to "Stone Blue").
4. RESPONSE SCHEMA: Return a strictly formatted JSON object representing a single outfit recommendation. Do not wrap it in an array.
`;
}

// 2. MULTI-PASS GENERATION ROUTE
export async function POST(request: Request) {
  try {
    const { entireCloset, targetCardCount = 3 } = await request.json();
    
    if (!entireCloset || entireCloset.length === 0) {
      return NextResponse.json({ error: 'Closet inventory is empty' }, { status: 400 });
    }

    const compiledOutfits: any[] = [];
    const trackingExclusionList: string[] = [];

    // Multi-Pass Generation Loop: Separately requests each card and appends chosen items to the next iteration's blacklist
    for (let currentPass = 0; currentPass < targetCardCount; currentPass++) {
      
      const systemPrompt = generateStylingPrompt(entireCloset, trackingExclusionList);
      
      const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt}\nGenerate exactly ONE unique outfit card object targeting a new global location.` }] }],
          generationConfig: {
            temperature: 0.85,          // Higher values drive deeper styling variety
            responseMimeType: "application/json",
            frequencyPenalty: 0.4,       // Discourages token reuse (same garments)
            presencePenalty: 0.3         // Forces introduction of new clothing choices
          }
        })
      });

      if (!aiResponse.ok) throw new Error("Gemini Content Generation Failure");
      const result = await aiResponse.json();
      
      const generatedText = result.candidates[0].content.parts[0].text;
      const outfitCard = JSON.parse(generatedText);

      // Append items used in this pass to our global exclusion tracker
      if (outfitCard.items && Array.isArray(outfitCard.items)) {
        trackingExclusionList.push(...outfitCard.items);
      }

      compiledOutfits.push(outfitCard);
    }

    return NextResponse.json({ outfits: compiledOutfits });

  } catch (error) {
    console.error('Multi-Pass Execution Failure:', error);
    return NextResponse.json({ error: 'Failed to fully explore wardrobe matrix' }, { status: 500 });
  }
}