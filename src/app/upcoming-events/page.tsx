'use client';

import {
  useCallback,
  useEffect,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  collection,
  getDocs,
} from 'firebase/firestore';
import {
  Calendar,
  Loader2,
  Sparkles,
  TriangleAlert,
} from 'lucide-react';
import {
  Imperial_Script,
  Outfit,
} from 'next/font/google';

import {
  getUpcomingEventsStyleAdviceAction,
} from '@/app/actions/get-calendar-data';
import UpcomingEventAdviceCard from '@/components/UpcomingEventAdviceCard';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  auth,
  firestore,
} from '@/lib/firebase';
import type {
  CalendarEventInput,
} from '@/lib/calendar-event-style';

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['300', '400', '700'],
});

const imperial = Imperial_Script({
  subsets: ['latin'],
  weight: ['400'],
});

type EventLoadState =
  | 'loading'
  | 'ready'
  | 'empty'
  | 'disconnected'
  | 'error';

type CalendarEventsPayload = {
  connected?: boolean;
  reconnectRequired?: boolean;
  events?: CalendarEventInput[];
  error?: string;
};

async function readJsonResponse(
  response: Response,
): Promise<CalendarEventsPayload> {
  try {
    return (
      await response.json()
    ) as CalendarEventsPayload;
  } catch {
    return {};
  }
}

export default function UpcomingEventsPage() {
  const [events, setEvents] =
    useState<any[]>([]);

  const [
    closetItems,
    setClosetItems,
  ] = useState<any[]>([]);

  const [
    loadState,
    setLoadState,
  ] = useState<EventLoadState>(
    'loading',
  );

  const [
    loadMessage,
    setLoadMessage,
  ] = useState('');

  const { toast } = useToast();
  const router = useRouter();

  const fetchData = useCallback(
    async () => {
      setLoadState('loading');
      setLoadMessage('');

      try {
        await auth.authStateReady();

        const user =
          auth.currentUser;

        if (!user) {
          setEvents([]);
          setLoadState(
            'disconnected',
          );
          setLoadMessage(
            'Sign in and connect Google Calendar in Settings to load your agenda.',
          );
          return;
        }

        let items: any[] = [];

        try {
          const snapshot =
            await getDocs(
              collection(
                firestore,
                'publicWardrobeItems',
              ),
            );

          items =
            snapshot.docs.map(document => {
              const data =
                document.data();

              return {
                id: document.id,
                ...data,
                createdAt:
                  data.createdAt
                    ?.toDate
                    ? data.createdAt
                        .toDate()
                        .toISOString()
                    : null,
                updatedAt:
                  data.updatedAt
                    ?.toDate
                    ? data.updatedAt
                        .toDate()
                        .toISOString()
                    : null,
              };
            });

          setClosetItems(items);
        } catch (error) {
          console.warn(
            'Wardrobe context could not be loaded for Calendar styling:',
            error instanceof Error
              ? error.message
              : 'Unknown wardrobe error',
          );

          setClosetItems([]);
        }

        const idToken =
          await user.getIdToken();

        const calendarResponse =
          await fetch(
            '/api/google-calendar/events?days=365&maxResults=100',
            {
              headers: {
                Authorization:
                  `Bearer ${idToken}`,
              },
              cache: 'no-store',
            },
          );

        const payload =
          await readJsonResponse(
            calendarResponse,
          );

        if (
          calendarResponse.status ===
            401 ||
          calendarResponse.status ===
            409
        ) {
          setEvents([]);
          setLoadState(
            'disconnected',
          );
          setLoadMessage(
            payload.error ||
              'Connect Google Calendar in Settings to load your agenda.',
          );
          return;
        }

        if (!calendarResponse.ok) {
          throw new Error(
            payload.error ||
              'Unable to load Google Calendar events.',
          );
        }

        const calendarEvents =
          Array.isArray(payload.events)
            ? payload.events
            : [];

        if (
          calendarEvents.length === 0
        ) {
          setEvents([]);
          setLoadState('empty');
          return;
        }

        const advice =
          await getUpcomingEventsStyleAdviceAction(
            items,
            calendarEvents,
          );

        setEvents(advice);
        setLoadState(
          advice.length > 0
            ? 'ready'
            : 'empty',
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unable to load Google Calendar events.';

        console.error(
          'Calendar event loading failed:',
          message,
        );

        setEvents([]);
        setLoadState('error');
        setLoadMessage(message);

        toast({
          title:
            'Unable to load agenda',
          description: message,
          variant: 'destructive',
        });
      }
    },
    [toast],
  );

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return (
    <div
      className={`min-h-screen bg-black p-6 text-white md:p-12 ${outfit.className}`}
    >
      <div className="mx-auto mb-12 flex max-w-7xl flex-col items-end justify-between gap-6 border-b border-zinc-900 pb-8 md:flex-row">
        <div>
          <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
            <span className="text-[#9A1B22]">
              ●
            </span>
            Synced Agenda
          </div>

          <div className="flex items-center gap-4">
            <Calendar className="h-8 w-8 text-[#9A1B22] md:h-10 md:w-10" />
            <h1
              className={`text-5xl font-normal tracking-wide md:text-6xl ${imperial.className}`}
            >
              <span className="text-white">
                Your Google Calendar{' '}
              </span>
              <span className="text-[#9A1B22]">
                Events
              </span>
            </h1>
          </div>
        </div>

        <Button
          onClick={() => {
            void fetchData();
          }}
          variant="outline"
          className="rounded-none border-zinc-800 text-xs uppercase tracking-[0.15em] hover:bg-zinc-900 hover:text-white"
          disabled={
            loadState === 'loading'
          }
        >
          {loadState === 'loading' ? (
            <Loader2 className="mr-3 h-4 w-4 animate-spin" />
          ) : (
            'Refresh Agenda'
          )}
        </Button>
      </div>

      <div className="mx-auto max-w-7xl">
        {loadState === 'loading' && (
          <div className="flex flex-col items-center justify-center space-y-4 py-32">
            <Loader2 className="h-10 w-10 animate-spin text-[#9A1B22]" />
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
              Loading Calendar Events...
            </p>
          </div>
        )}

        {loadState ===
          'disconnected' && (
          <div className="flex flex-col items-center justify-center space-y-6 border border-zinc-900 bg-zinc-950/30 py-32">
            <Calendar className="h-12 w-12 text-zinc-700" />
            <div className="space-y-2 text-center">
              <h3 className="font-serif text-xl text-white">
                Google Calendar Is Not Connected
              </h3>
              <p className="mx-auto max-w-md text-sm text-zinc-500">
                {loadMessage}
              </p>
            </div>
            <Button
              onClick={() =>
                router.push(
                  '/settings',
                )
              }
              className="rounded-none bg-[#9A1B22] px-8 text-xs font-bold uppercase tracking-[0.15em] text-white hover:bg-[#7A151B]"
            >
              Open Settings
            </Button>
          </div>
        )}

        {loadState === 'error' && (
          <div className="flex flex-col items-center justify-center space-y-6 border border-[#9A1B22]/40 bg-[#9A1B22]/5 py-32">
            <TriangleAlert className="h-12 w-12 text-[#9A1B22]" />
            <div className="space-y-2 text-center">
              <h3 className="font-serif text-xl text-white">
                Unable to Load Events
              </h3>
              <p className="mx-auto max-w-md text-sm text-zinc-400">
                {loadMessage ||
                  'The Calendar service could not be reached. Your agenda has not been reported as empty.'}
              </p>
            </div>
            <Button
              onClick={() => {
                void fetchData();
              }}
              variant="outline"
              className="rounded-none border-zinc-700 px-8 text-xs font-bold uppercase tracking-[0.15em] text-white hover:bg-zinc-900"
            >
              Try Again
            </Button>
          </div>
        )}

        {loadState === 'empty' && (
          <div className="flex flex-col items-center justify-center space-y-6 border border-zinc-900 bg-zinc-950/30 py-32">
            <Calendar className="h-12 w-12 text-zinc-800" />
            <div className="space-y-2 text-center">
              <h3 className="font-serif text-xl text-white">
                No Upcoming Events Found
              </h3>
              <p className="mx-auto max-w-md text-sm text-zinc-500">
                Google Calendar loaded successfully, but the next 365 days contain no upcoming events.
              </p>
            </div>
          </div>
        )}

        {loadState === 'ready' && (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {events.map(
              (event, index) => {
                const currentEventName =
                  event.eventName ||
                  event.summary ||
                  event.title ||
                  'Upcoming Event';

                const currentWeather =
                  event.weatherForecast ||
                  'Weather data unavailable';

                return (
                  <div
                    key={
                      event.id ||
                      `${currentEventName}-${index}`
                    }
                    className="group flex h-full flex-col space-y-4"
                  >
                    <div className="flex-grow">
                      <UpcomingEventAdviceCard
                        eventAdvice={
                          event
                        }
                        analyzedItems={
                          closetItems
                        }
                        cardIndex={
                          index
                        }
                      />
                    </div>

                    <Button
                      onClick={() => {
                        router.push(
                          `/stylist?event=${encodeURIComponent(currentEventName)}&weather=${encodeURIComponent(currentWeather)}`,
                        );
                      }}
                      className="flex w-full items-center justify-center gap-3 rounded-none bg-[#9A1B22] py-7 text-[11px] font-bold uppercase tracking-[0.2em] text-white shadow-lg transition-all hover:bg-[#7A151B] group-hover:shadow-[0_0_20px_rgba(154,27,34,0.2)]"
                    >
                      <Sparkles className="h-4 w-4" />
                      Style This Event
                    </Button>
                  </div>
                );
              },
            )}
          </div>
        )}
      </div>
    </div>
  );
}
