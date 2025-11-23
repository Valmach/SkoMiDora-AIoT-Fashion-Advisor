#!/bin/bash
set -e

FILE="src/app/actions.ts"

echo "🔧 Fixing the header of $FILE..."

# Remove the first 30 lines (where the corruption is)
sed -i '1,30d' "$FILE"

# Write a clean correct header at the top
sed -i '1i \
"use server";\
\
import { getAdmin } from "@/lib/firebase-admin-loader";\
import { revalidatePath } from "next/cache";\
import { SingleOutfitOutputType } from "@/ai/types/style-types";\
import { GoogleCalendarEvent } from "@/ai/types/calendar-types";\
import { AccuWeatherSchema } from "@/ai/types/weather-types";\
import { OutfitForFeedbackAction, EventDetailsForFeedbackAction, UpcomingEventStyleAdvice } from "@/ai/types/advice-types";\
' "$FILE"

echo "🎉 actions.ts header repaired!"
