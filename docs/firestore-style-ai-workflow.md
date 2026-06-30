# SkoMiDora Firestore-Grounded AI Styling Workflow

Firestore metadata should ground the AI recommendations at runtime. The app should not retrain the model. It should send structured closet, event, weather, and feedback context into the styling action every time recommendations are generated.

## Collections

### publicWardrobeItems

Stores closet item metadata.

Fields:
- brand
- designer
- type
- category
- color
- material
- season
- weatherSuitability
- eventCategory
- formality
- locationWorn
- lastWorn
- comfortLevel
- imageUrl
- tags

### styleEvents

Stores destination, event, occasion, and weather context.

Fields:
- eventName
- eventDate
- city
- country
- venue
- weatherSummary
- temperature
- occasion
- dressCode
- travelContext

### styleFeedback

Stores user preference signals so the system can improve recommendations without retraining the model.

Fields:
- outfitId
- liked
- dislikedReason
- userNote
- timestamp
- eventContext
- itemIds

## Runtime Flow

publicWardrobeItems + styleEvents + styleFeedback + weather runtime data
→ Style Context Builder
→ getDailyOutfitsAction
→ AI grounded prompt
→ Outfit recommendations
→ OutfitCard UI
→ User feedback
→ styleFeedback

## Required AI Output

Each outfit recommendation should include:

- title
- destinationName
- destinationImageQuery
- destinationReason
- weatherTag
- itemIds
- reasoning
