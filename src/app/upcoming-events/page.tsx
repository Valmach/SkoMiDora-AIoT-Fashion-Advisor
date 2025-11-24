
'use client';

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";


import { useState, useEffect, useTransition, useCallback } from 'react';
import {
 Card,
 CardHeader,
 CardTitle,
 CardDescription,
 CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
 CalendarDays,
 RotateCcw,
 Loader2,
 AlertTriangle,
 Link as LinkIcon,
 Mic,
 PlayCircle,
 Sun,
 Cloud,
 CloudRain,
 CloudSnow,
 Wind,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import UpcomingEventAdviceCard from '@/components/UpcomingEventAdviceCard';
import { mockAnalyzeStyleDNAInput } from '@/lib/mockData';
import type { UpcomingEventStyleAdvice, AnalyzedItem } from '@/types';
import { safeToMillis } from '@/types';
import { generateEventStyleAdvice } from '@/ai/flows/generate-event-style-advice';
import { Input } from '@/components/ui/input';
import { getWeatherAndAdvice } from '@/ai/flows/get-weather-and-advice';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import type { DocumentData } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import { generateSpeechFromTextAction } from '@/app/actions';

export default function UpcomingEventsPage() {
 const firebase = useFirebase();
 const [upcomingEventsAdvice, setUpcomingEventsAdvice] = useState<
 UpcomingEventStyleAdvice[]
 >([]);
 const [isLoadingEventsAdvice, startLoadingEventsAdviceTransition] =
 useTransition();
 const [wardrobeItems, setWardrobeItems] = useState<AnalyzedItem[]>([]);
 const [isDataLoading, setIsDataLoading] = useState(true);
 const [generationError, setGenerationError] = useState<string | null>(null);
 const { toast } = useToast();

 const [city, setCity] = useState('');
 const [isFetchingWeatherAdvice, startFetchingWeatherAdvice] = useTransition();
 const [weatherAdvice, setWeatherAdvice] = useState<{
 advice: string;
 temp: number;
 condition: string;
 } | null>(null);
 const [audioDataUri, setAudioDataUri] = useState<string | null>(null);

 useEffect(() => {
 if (!firebase) {
 setIsDataLoading(false);
 setGenerationError("Failed to load wardrobe data. Firebase is not available.");
 return;
 }
 setIsDataLoading(true);
 const itemsCollectionRef = collection(firebase.firestore, 'publicWardrobeItems');
 const q = query(itemsCollectionRef, orderBy('createdAt', 'desc'));

 const unsubscribe = onSnapshot(
 q,
 (snapshot) => {
 const items: AnalyzedItem[] = [];
 snapshot.forEach((doc: DocumentData) => {
 const data = doc.data();
 if (data && data.itemName && data.imageUrl) {
 items.push({
 id: doc.id,
 ...data,
 createdAt: safeToMillis(data.createdAt), // Use safe conversion
 } as AnalyzedItem);
 }
 });
 setWardrobeItems(items);
 setIsDataLoading(false);
 },
 (err) => {
 console.error('Error fetching wardrobe for events page:', err);
 setGenerationError(
 'Failed to load wardrobe data. Shoe suggestions may be placeholders.',
 );
 setIsDataLoading(false);
 },
 );

 return () => unsubscribe();
 }, [firebase]);

 const fetchUpcomingEventsAdvice = useCallback(() => {
 startLoadingEventsAdviceTransition(async () => {
 setGenerationError(null);
 setUpcomingEventsAdvice([]);
 toast({
 title: 'Fetching Event Advice...',
 description: 'Getting personalized style tips for your events.',
 });

 try {
 const eventsToProcess =
 mockAnalyzeStyleDNAInput?.googleCalendarEvents?.slice(0, 6) || [];
 const weatherInfo = mockAnalyzeStyleDNAInput.accuWeatherInfo;

 if (eventsToProcess.length === 0) {
 toast({
 title: 'No Events',
 description: 'No mock events found to generate advice for.',
 variant: 'default',
 });
 return;
 }

 const advicePromises = eventsToProcess.map((event) =>
 generateEventStyleAdvice({ event, weather: weatherInfo })
 .then((result) => ({
 eventName: event.eventName || 'Unnamed event',
 eventStartDateTime: event.eventStartDateTime || '',
 eventEndDateTime: event.eventEndDateTime || '',
 eventType: event.eventType || 'General',
 eventLocation: event.eventLocation,
 advice: result.advice,
 temperature: weatherInfo.temperature,
 weatherCondition: weatherInfo.condition,
 }))
 .catch((e) => {
 console.error(
 `Failed to get advice for event: ${event.eventName}`,
 e,
 );
 return {
 eventName: event.eventName || 'Unnamed event',
 eventStartDateTime: event.eventStartDateTime || '',
 eventEndDateTime: event.eventEndDateTime || '',
 eventType: event.eventType || 'General',
 eventLocation: event.eventLocation,
 advice: 'Could not generate style advice for this event.',
 temperature: weatherInfo.temperature,
 weatherCondition: 'Unavailable',
 };
 }),
 );

 const adviceResults = await Promise.all(advicePromises);
 setUpcomingEventsAdvice(adviceResults);
 toast({
 title: 'Event Style Advice Updated',
 description: `Fresh style advice for ${adviceResults.length} events.`,
 });
 } catch (e: any) {
 const errorMessage = `Event Advice System Error: ${e.message || 'Failed to fetch upcoming events style advice.'}`;
 setGenerationError(errorMessage);
 setUpcomingEventsAdvice([]);
 toast({
 title: 'Event Advice System Error',
 description: e.message || 'Could not fetch advice.',
 variant: 'destructive',
 });
 }
 });
 }, [toast]);

 useEffect(() => {
 if (upcomingEventsAdvice.length === 0) {
 fetchUpcomingEventsAdvice();
 }
 }, [upcomingEventsAdvice.length, fetchUpcomingEventsAdvice]);

 const handleGetWeatherAndAdvice = useCallback(async () => {
 if (!city) {
 toast({
 title: 'City Required',
 description: 'Please enter a city name.',
 variant: 'destructive',
 });
 return;
 }
 startFetchingWeatherAdvice(async () => {
 setWeatherAdvice(null);
 setAudioDataUri(null);
 toast({
 title: 'Fetching Weather & Advice...',
 description: `Getting style tips for ${city}.`,
 });
 try {
 const adviceResult = await getWeatherAndAdvice(city);
 setWeatherAdvice(adviceResult);

 if (adviceResult.advice) {
 toast({
 title: 'Generating Audio...',
 description: 'Converting advice to speech.',
 });
 const speechResult = await generateSpeechFromTextAction(
 adviceResult.advice,
 );
 if (speechResult.media) {
 setAudioDataUri(speechResult.media);
 toast({
 title: 'Ready to Play!',
 description: 'Audio advice is ready.',
 });
 } else {
 toast({
 title: 'Audio Generation Failed',
 description: speechResult.error || 'Could not convert text to speech.',
 variant: 'destructive',
 });
 }
 }
 } catch (e: any) {
 toast({
 title: 'Error',
 description: e.message || 'Failed to get weather advice.',
 variant: 'destructive',
 });
 }
 });
 }, [city, toast]);

 const getWeatherIcon = (condition: string) => {
 const lowerCondition = condition.toLowerCase();
 if (lowerCondition.includes('sun') || lowerCondition.includes('clear'))
 return <Sun className="h-6 w-6 text-yellow-400" />;
 if (lowerCondition.includes('cloud'))
 return <Cloud className="h-6 w-6 text-gray-400" />;
 if (lowerCondition.includes('rain') || lowerCondition.includes('shower'))
 return <CloudRain className="h-6 w-6 text-blue-400" />;
 if (lowerCondition.includes('snow'))
 return <CloudSnow className="h-6 w-6 text-white" />;
 return <Wind className="h-6 w-6 text-gray-500" />;
 };

 const RefreshIcon = isLoadingEventsAdvice ? Loader2 : RotateCcw;
 const isLoading = isLoadingEventsAdvice || isDataLoading;
 const error = generationError;

 return (
 <div className="container mx-auto space-y-8">
 <Card className="shadow-lg">
 <CardHeader>
 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
 <div className="flex items-center space-x-3">
 <CalendarDays className="h-8 w-8 text-accent" />
 <div>
 <CardTitle className="text-2xl font-bold text-foreground font-calligraphy">
 Upcoming Events & Style Advice
 </CardTitle>
 <CardDescription className="text-muted-foreground">
 AI-powered style tips for your calendar events, considering
 weather forecasts for each.
 </CardDescription>
 </div>
 </div>
 <div className="flex w-full sm:w-auto gap-2">
 <Button
 onClick={() =>
 toast({
 title: 'Feature Coming Soon',
 description:
 'Connecting to Google Calendar is under development.',
 })
 }
 variant="destructive"
 size="sm"
 className="flex-1 sm:flex-initial"
 >
 <LinkIcon className="mr-2 h-4 w-4" /> Connect Google Calendar
 </Button>
 <Button
 onClick={fetchUpcomingEventsAdvice}
 variant="outline"
 size="sm"
 disabled={isLoadingEventsAdvice}
 className="flex-1 sm:flex-initial"
 >
 <RefreshIcon
 className={`mr-2 h-4 w-4 ${isLoadingEventsAdvice ? 'animate-spin' : ''}`}
 />
 {isLoadingEventsAdvice ? 'Loading...' : 'Refresh Advice'}
 </Button>
 </div>
 </div>
 </CardHeader>
 <CardContent>
 {isLoading && upcomingEventsAdvice.length === 0 && (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {[...Array(6)].map((_, i) => (
 <Card
 key={`skeleton-event-page-${i}`}
 className="animate-pulse"
 >
 <CardHeader>
 <div className="h-6 bg-muted rounded w-3/4"></div>
 </CardHeader>
 <CardContent>
 <div className="h-20 bg-muted rounded"></div>
 <div className="h-4 bg-muted rounded w-1/2 mt-2"></div>
 </CardContent>
 </Card>
 ))}
 </div>
 )}

 {error && upcomingEventsAdvice.length === 0 && (
 <Card className="bg-destructive/10 border-destructive text-destructive-foreground p-4 mt-6">
 <CardHeader>
 <div className="flex items-center">
 <AlertTriangle className="h-5 w-5 mr-2" />
 <CardTitle>An Error Occurred</CardTitle>
 </div>
 </CardHeader>
 <CardContent>
 <p>{error}</p>
 </CardContent>
 </Card>
 )}

 {!isLoading && upcomingEventsAdvice.length > 0 && (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {upcomingEventsAdvice.map((adviceItem, index) => (
                <UpcomingEventAdviceCard key={`advice-${index}-${adviceItem.eventStartDateTime}`}
                  event={adviceItem}
                  advice={adviceItem}
                  index={index}
                  
                />
 ))}
 </div>
 )}

 {!isLoadingEventsAdvice &&
 upcomingEventsAdvice.length === 0 &&
 !error && (
 <p className="text-center text-muted-foreground py-4">
 No upcoming event advice to display currently. Click
 &quot;Refresh Advice&quot; to fetch.
 </p>
 )}
 </CardContent>
 </Card>

 <Card className="shadow-lg">
 <CardHeader>
 <div className="flex items-center space-x-3">
 <Mic className="h-8 w-8 text-accent" />
 <div>
 <CardTitle className="text-2xl font-bold text-foreground font-calligraphy">
 Live Weather Style Advisor
 </CardTitle>
 <CardDescription className="text-muted-foreground">
 Enter any city to get live weather conditions and spoken style
 advice.
 </CardDescription>
 </div>
 </div>
 </CardHeader>
 <CardContent>
 <div className="flex flex-col sm:flex-row items-center gap-4">
 <Input
 placeholder="E.g., London, Paris, New York"
 value={city}
 onChange={(e) => setCity(e.target.value)}
 className="flex-grow"
 />
 <Button
 onClick={handleGetWeatherAndAdvice}
 disabled={isFetchingWeatherAdvice || !city}
 className="w-full sm:w-auto"
 >
 {isFetchingWeatherAdvice ? (
 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
 ) : (
 <PlayCircle className="mr-2 h-4 w-4" />
 )}
 {isFetchingWeatherAdvice
 ? 'Getting Advice...'
 : 'Get Advice & Read Aloud'}
 </Button>
 </div>
 {weatherAdvice && (
 <div className="mt-6 p-4 border rounded-lg bg-muted/30 space-y-4">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-4">
 {getWeatherIcon(weatherAdvice.condition)}
 <div>
 <p className="font-bold text-lg text-foreground">
 {weatherAdvice.condition}
 </p>
 <p className="text-sm text-muted-foreground">
 Temperature: {weatherAdvice.temp}°C
 </p>
 </div>
 </div>
 {audioDataUri && (
 <audio controls src={audioDataUri} autoPlay>
 Your browser does not support the audio element.
 </audio>
 )}
 </div>
 <p className="text-foreground">{weatherAdvice.advice}</p>
 </div>
 )}
 </CardContent>
 </Card>
 </div>
 );
}
