'use client';

import {
  useCallback,
  useEffect,
  useState,
} from 'react';
import {
  AlertTriangle,
  BatteryMedium,
  Calendar,
  Check,
  ChevronRight,
  Cpu,
  Download,
  Loader2,
  LockKeyhole,
  RefreshCw,
  Save,
  Settings2,
  Thermometer,
  Unlink,
  User,
  Volume2,
  Wifi,
} from 'lucide-react';
import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  Imperial_Script,
  Outfit,
} from 'next/font/google';

import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

const outfit = Outfit({
  subsets: ['latin'],
  weight: [
    '300',
    '400',
    '500',
    '600',
    '700',
  ],
});

const imperial = Imperial_Script({
  subsets: ['latin'],
  weight: ['400'],
});

type SettingsSection =
  | 'profile'
  | 'integrations'
  | 'hardware'
  | 'advanced';

type TemperatureUnit =
  | 'celsius'
  | 'fahrenheit';

type VoicePreference =
  | 'british-female'
  | 'british-male'
  | 'american-female';

type CalendarStatus =
  | 'loading'
  | 'connected'
  | 'disconnected'
  | 'error';

type SavedPreferences = {
  temperatureUnit: TemperatureUnit;
  voice: VoicePreference;
  theme: 'dark';
};

const PREFERENCE_STORAGE_KEY =
  'skomidora.settings.v1';

const DEFAULT_PREFERENCES: SavedPreferences = {
  temperatureUnit: 'celsius',
  voice: 'british-female',
  theme: 'dark',
};

const SETTINGS_CATEGORIES = [
  {
    id: 'profile' as const,
    icon: User,
    label: 'Profile & Preferences',
    description:
      'Identity and styling options',
  },
  {
    id: 'integrations' as const,
    icon: Calendar,
    label: 'Connected Accounts',
    description:
      'Calendar and account access',
  },
  {
    id: 'hardware' as const,
    icon: Cpu,
    label: 'Wardrobe Hardware',
    description:
      'SkoBox and closet modules',
  },
  {
    id: 'advanced' as const,
    icon: Settings2,
    label: 'Advanced Diagnostics',
    description:
      'Sync, export, and maintenance',
  },
];

function loadSavedPreferences(): SavedPreferences {
  if (typeof window === 'undefined') {
    return DEFAULT_PREFERENCES;
  }

  try {
    const saved =
      window.localStorage.getItem(
        PREFERENCE_STORAGE_KEY,
      );

    if (!saved) {
      return DEFAULT_PREFERENCES;
    }

    const parsed =
      JSON.parse(
        saved,
      ) as Partial<SavedPreferences>;

    const voice: VoicePreference =
      parsed.voice === 'british-male' ||
      parsed.voice === 'american-female'
        ? parsed.voice
        : 'british-female';

    return {
      temperatureUnit:
        parsed.temperatureUnit ===
        'fahrenheit'
          ? 'fahrenheit'
          : 'celsius',
      voice,
      theme: 'dark',
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export default function SettingsMenu() {
  const [
    activeTab,
    setActiveTab,
  ] = useState<SettingsSection>(
    'profile',
  );

  const [
    firebaseUser,
    setFirebaseUser,
  ] = useState<FirebaseUser | null>(
    null,
  );

  const [
    authLoading,
    setAuthLoading,
  ] = useState(true);

  const [
    displayName,
    setDisplayName,
  ] = useState('');

  const [
    preferences,
    setPreferences,
  ] = useState<SavedPreferences>(
    DEFAULT_PREFERENCES,
  );

  const [
    calendarStatus,
    setCalendarStatus,
  ] = useState<CalendarStatus>(
    'loading',
  );

  const [
    calendarActionLoading,
    setCalendarActionLoading,
  ] = useState(false);

  const [
    profileActionLoading,
    setProfileActionLoading,
  ] = useState(false);

  const [
    pairingOpen,
    setPairingOpen,
  ] = useState(false);

  const { toast } = useToast();

  const checkCalendarStatus =
    useCallback(
      async (
        user: FirebaseUser | null =
          auth.currentUser,
      ) => {
        if (!user) {
          setCalendarStatus(
            'disconnected',
          );
          return;
        }

        setCalendarStatus('loading');

        try {
          const idToken =
            await user.getIdToken();

          const response =
            await fetch(
              '/api/google-calendar/events?days=1&maxResults=1',
              {
                headers: {
                  Authorization:
                    `Bearer ${idToken}`,
                },
                cache: 'no-store',
              },
            );

          if (response.ok) {
            setCalendarStatus(
              'connected',
            );
            return;
          }

          if (
            response.status === 401 ||
            response.status === 409
          ) {
            setCalendarStatus(
              'disconnected',
            );
            return;
          }

          setCalendarStatus('error');
        } catch (error) {
          console.error(
            'Calendar status check failed:',
            error,
          );

          setCalendarStatus('error');
        }
      },
      [],
    );

  useEffect(() => {
    setPreferences(
      loadSavedPreferences(),
    );

    const unsubscribe =
      onAuthStateChanged(
        auth,
        user => {
          setFirebaseUser(user);
          setDisplayName(
            user?.displayName || '',
          );
          setAuthLoading(false);

          void checkCalendarStatus(
            user,
          );
        },
      );

    return unsubscribe;
  }, [checkCalendarStatus]);

  function savePreferences() {
    window.localStorage.setItem(
      PREFERENCE_STORAGE_KEY,
      JSON.stringify(preferences),
    );

    window.dispatchEvent(
      new CustomEvent(
        'skomidora:settings-changed',
        {
          detail: preferences,
        },
      ),
    );

    toast({
      title: 'Preferences saved',
      description:
        'Your temperature and voice preferences were saved on this device.',
    });
  }

  async function saveProfile() {
    if (!firebaseUser) {
      toast({
        title: 'Sign-in required',
        description:
          'Sign in before updating your profile.',
        variant: 'destructive',
      });
      return;
    }

    setProfileActionLoading(true);

    try {
      await updateProfile(
        firebaseUser,
        {
          displayName:
            displayName.trim() ||
            null,
        },
      );

      toast({
        title: 'Profile updated',
        description:
          'Your display name was saved.',
      });
    } catch (error) {
      console.error(
        'Profile update failed:',
        error,
      );

      toast({
        title:
          'Profile update failed',
        description:
          'Your name could not be updated.',
        variant: 'destructive',
      });
    } finally {
      setProfileActionLoading(
        false,
      );
    }
  }

  async function sendPasswordReset() {
    const email =
      firebaseUser?.email;

    if (!email) {
      toast({
        title: 'Email unavailable',
        description:
          'No email address is associated with this account.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await sendPasswordResetEmail(
        auth,
        email,
      );

      toast({
        title:
          'Password email sent',
        description:
          `Password-management instructions were sent to ${email}.`,
      });
    } catch (error) {
      console.error(
        'Password reset failed:',
        error,
      );

      toast({
        title:
          'Password request failed',
        description:
          'The password-management email could not be sent.',
        variant: 'destructive',
      });
    }
  }

  async function connectGoogleCalendar() {
    const user =
      auth.currentUser;

    if (!user) {
      toast({
        title: 'Sign-in required',
        description:
          'Sign in before connecting Google Calendar.',
        variant: 'destructive',
      });
      return;
    }

    setCalendarActionLoading(
      true,
    );

    try {
      const idToken =
        await user.getIdToken();

      const response =
        await fetch(
          '/api/google-calendar/auth',
          {
            headers: {
              Authorization:
                `Bearer ${idToken}`,
            },
            cache: 'no-store',
          },
        );

      const payload =
        await response.json();

      if (
        !response.ok ||
        !payload.authUrl
      ) {
        throw new Error(
          payload.error ||
            'Authorization URL unavailable.',
        );
      }

      window.location.assign(
        payload.authUrl,
      );
    } catch (error) {
      console.error(
        'Calendar connection failed:',
        error,
      );

      setCalendarActionLoading(
        false,
      );

      toast({
        title: 'Connection failed',
        description:
          error instanceof Error
            ? error.message
            : 'Google Calendar could not be connected.',
        variant: 'destructive',
      });
    }
  }

  async function disconnectGoogleCalendar() {
    const user =
      auth.currentUser;

    if (!user) {
      toast({
        title: 'Sign-in required',
        description:
          'Sign in before disconnecting Google Calendar.',
        variant: 'destructive',
      });
      return;
    }

    const confirmed =
      window.confirm(
        'Disconnect Google Calendar from SkoMiDora?',
      );

    if (!confirmed) {
      return;
    }

    setCalendarActionLoading(
      true,
    );

    try {
      const idToken =
        await user.getIdToken();

      const response =
        await fetch(
          '/api/google-calendar/disconnect',
          {
            method: 'DELETE',
            headers: {
              Authorization:
                `Bearer ${idToken}`,
            },
            cache: 'no-store',
          },
        );

      const payload =
        await response.json();

      if (!response.ok) {
        throw new Error(
          payload.error ||
            'Unable to disconnect Google Calendar.',
        );
      }

      setCalendarStatus(
        'disconnected',
      );

      toast({
        title:
          'Calendar disconnected',
        description:
          'SkoMiDora will no longer read your Google Calendar.',
      });
    } catch (error) {
      console.error(
        'Calendar disconnect failed:',
        error,
      );

      toast({
        title: 'Disconnect failed',
        description:
          error instanceof Error
            ? error.message
            : 'Google Calendar could not be disconnected.',
        variant: 'destructive',
      });
    } finally {
      setCalendarActionLoading(
        false,
      );
    }
  }

  function exportSettings() {
    const exportPayload = {
      exportedAt:
        new Date().toISOString(),
      profile: {
        displayName:
          firebaseUser?.displayName ||
          '',
        email:
          firebaseUser?.email || '',
      },
      preferences,
      integrations: {
        googleCalendar:
          calendarStatus,
      },
    };

    const blob = new Blob(
      [
        JSON.stringify(
          exportPayload,
          null,
          2,
        ),
      ],
      {
        type: 'application/json',
      },
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement('a');

    link.href = url;
    link.download =
      'skomidora-settings.json';

    document.body.appendChild(
      link,
    );

    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  const currentCategory =
    SETTINGS_CATEGORIES.find(
      category =>
        category.id ===
        activeTab,
    );

  return (
    <div
      className={`${outfit.className} min-h-screen bg-black px-5 py-8 text-white md:px-10 lg:px-14`}
    >
      <div className="mx-auto max-w-7xl">
        <header className="mb-10 border-b border-zinc-900 pb-8">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.28em] text-[#9A1B22]">
            Account Control
          </p>

          <h1
            className={`${imperial.className} text-6xl font-normal md:text-7xl`}
          >
            Settings
          </h1>
        </header>

        <div className="grid gap-8 lg:grid-cols-[290px_minmax(0,1fr)]">
          <nav
            className="space-y-2"
            aria-label="Settings sections"
          >
            {SETTINGS_CATEGORIES.map(
              category => {
                const Icon =
                  category.icon;

                const isActive =
                  activeTab ===
                  category.id;

                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() =>
                      setActiveTab(
                        category.id,
                      )
                    }
                    className={`flex w-full items-center gap-4 border px-4 py-4 text-left transition ${
                      isActive
                        ? 'border-[#9A1B22] bg-[#9A1B22]/15 text-white'
                        : 'border-zinc-900 bg-zinc-950/40 text-zinc-400 hover:border-zinc-700 hover:text-white'
                    }`}
                  >
                    <Icon
                      size={19}
                      className={
                        isActive
                          ? 'text-[#C52531]'
                          : 'text-zinc-600'
                      }
                    />

                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-bold uppercase tracking-[0.15em]">
                        {category.label}
                      </span>

                      <span className="mt-1 block text-[11px] text-zinc-600">
                        {
                          category.description
                        }
                      </span>
                    </span>

                    <ChevronRight
                      size={16}
                      className="shrink-0 opacity-50"
                    />
                  </button>
                );
              },
            )}
          </nav>

          <section className="border border-zinc-900 bg-[#0A0A0C] p-6 md:p-9">
            <div className="mb-8 border-b border-zinc-800 pb-5">
              <h2 className="text-lg font-bold uppercase tracking-[0.16em]">
                {currentCategory?.label ||
                  'Settings'}
              </h2>
            </div>

            {activeTab ===
              'profile' && (
              <div className="space-y-10">
                <div>
                  <h3 className="mb-5 text-xs font-bold uppercase tracking-[0.18em] text-[#C52531]">
                    Personal Details
                  </h3>

                  {authLoading ? (
                    <Loader2 className="animate-spin text-zinc-500" />
                  ) : (
                    <div className="grid gap-5 md:grid-cols-2">
                      <label className="space-y-2">
                        <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-500">
                          Display Name
                        </span>

                        <input
                          value={
                            displayName
                          }
                          onChange={event =>
                            setDisplayName(
                              event.target
                                .value,
                            )
                          }
                          disabled={
                            !firebaseUser
                          }
                          placeholder="Your name"
                          className="w-full border border-zinc-800 bg-black px-4 py-3 text-sm text-white outline-none focus:border-[#9A1B22] disabled:opacity-50"
                        />
                      </label>

                      <label className="space-y-2">
                        <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-500">
                          Email Address
                        </span>

                        <input
                          value={
                            firebaseUser?.email ||
                            'Not signed in'
                          }
                          readOnly
                          className="w-full border border-zinc-800 bg-black px-4 py-3 text-sm text-zinc-400"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={
                          saveProfile
                        }
                        disabled={
                          !firebaseUser ||
                          profileActionLoading
                        }
                        className="flex items-center justify-center gap-2 bg-[#9A1B22] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.16em] transition hover:bg-[#7A151B] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {profileActionLoading ? (
                          <Loader2
                            size={16}
                            className="animate-spin"
                          />
                        ) : (
                          <Save
                            size={16}
                          />
                        )}

                        Save Profile
                      </button>

                      <button
                        type="button"
                        onClick={
                          sendPasswordReset
                        }
                        disabled={
                          !firebaseUser
                        }
                        className="flex items-center justify-center gap-2 border border-zinc-700 px-5 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-300 transition hover:border-white hover:text-white disabled:opacity-40"
                      >
                        <LockKeyhole
                          size={16}
                        />
                        Manage Password
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="mb-5 text-xs font-bold uppercase tracking-[0.18em] text-[#C52531]">
                    App Preferences
                  </h3>

                  <div className="divide-y divide-zinc-900 border-y border-zinc-900">
                    <div className="flex flex-col justify-between gap-4 py-5 sm:flex-row sm:items-center">
                      <div className="flex gap-3">
                        <Thermometer
                          size={18}
                          className="mt-0.5 text-zinc-500"
                        />

                        <div>
                          <p className="text-sm font-semibold">
                            Temperature Format
                          </p>

                          <p className="mt-1 text-xs text-zinc-600">
                            Choose how weather temperatures are displayed.
                          </p>
                        </div>
                      </div>

                      <div className="flex">
                        <button
                          type="button"
                          aria-pressed={
                            preferences.temperatureUnit ===
                            'celsius'
                          }
                          onClick={() =>
                            setPreferences(
                              current => ({
                                ...current,
                                temperatureUnit:
                                  'celsius',
                              }),
                            )
                          }
                          className={`border px-5 py-2 text-xs font-bold ${
                            preferences.temperatureUnit ===
                            'celsius'
                              ? 'border-[#9A1B22] bg-[#9A1B22] text-white'
                              : 'border-zinc-800 bg-black text-zinc-500'
                          }`}
                        >
                          °C
                        </button>

                        <button
                          type="button"
                          aria-pressed={
                            preferences.temperatureUnit ===
                            'fahrenheit'
                          }
                          onClick={() =>
                            setPreferences(
                              current => ({
                                ...current,
                                temperatureUnit:
                                  'fahrenheit',
                              }),
                            )
                          }
                          className={`border px-5 py-2 text-xs font-bold ${
                            preferences.temperatureUnit ===
                            'fahrenheit'
                              ? 'border-[#9A1B22] bg-[#9A1B22] text-white'
                              : 'border-zinc-800 bg-black text-zinc-500'
                          }`}
                        >
                          °F
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col justify-between gap-4 py-5 sm:flex-row sm:items-center">
                      <div className="flex gap-3">
                        <Volume2
                          size={18}
                          className="mt-0.5 text-zinc-500"
                        />

                        <div>
                          <p className="text-sm font-semibold">
                            Stylist Voice
                          </p>

                          <p className="mt-1 text-xs text-zinc-600">
                            Preferred narration voice for event briefings.
                          </p>
                        </div>
                      </div>

                      <select
                        value={
                          preferences.voice
                        }
                        onChange={event =>
                          setPreferences(
                            current => ({
                              ...current,
                              voice:
                                event.target
                                  .value as VoicePreference,
                            }),
                          )
                        }
                        className="border border-zinc-800 bg-black px-4 py-3 text-xs text-white outline-none focus:border-[#9A1B22]"
                      >
                        <option value="british-female">
                          UK English — Female
                        </option>

                        <option value="british-male">
                          UK English — Male
                        </option>

                        <option value="american-female">
                          US English — Female
                        </option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between gap-4 py-5">
                      <div>
                        <p className="text-sm font-semibold">
                          Appearance
                        </p>

                        <p className="mt-1 text-xs text-zinc-600">
                          SkoMiDora currently uses its signature dark presentation.
                        </p>
                      </div>

                      <span className="border border-zinc-800 bg-black px-4 py-2 text-xs uppercase tracking-[0.15em] text-zinc-400">
                        Dark
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={
                      savePreferences
                    }
                    className="mt-6 flex items-center gap-2 bg-[#9A1B22] px-6 py-3 text-[11px] font-bold uppercase tracking-[0.16em] hover:bg-[#7A151B]"
                  >
                    <Save size={16} />
                    Save Preferences
                  </button>
                </div>
              </div>
            )}

            {activeTab ===
              'integrations' && (
              <div className="space-y-8">
                <div className="flex flex-col justify-between gap-6 border border-zinc-800 bg-black p-5 sm:flex-row sm:items-center">
                  <div className="flex gap-4">
                    <div
                      className={`flex h-11 w-11 items-center justify-center border ${
                        calendarStatus ===
                        'connected'
                          ? 'border-emerald-900 bg-emerald-950/30 text-emerald-400'
                          : 'border-zinc-800 text-zinc-500'
                      }`}
                    >
                      <Calendar
                        size={20}
                      />
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold">
                        Google Calendar
                      </h3>

                      <p className="mt-1 text-xs text-zinc-600">
                        Supplies event context to the AI stylist.
                      </p>

                      <div className="mt-3 flex items-center gap-2 text-xs">
                        {calendarStatus ===
                          'loading' && (
                          <>
                            <Loader2
                              size={13}
                              className="animate-spin"
                            />
                            Checking connection
                          </>
                        )}

                        {calendarStatus ===
                          'connected' && (
                          <>
                            <Check
                              size={13}
                              className="text-emerald-400"
                            />

                            <span className="text-emerald-400">
                              Connected
                            </span>
                          </>
                        )}

                        {calendarStatus ===
                          'disconnected' && (
                          <span className="text-zinc-500">
                            Not connected
                          </span>
                        )}

                        {calendarStatus ===
                          'error' && (
                          <>
                            <AlertTriangle
                              size={13}
                              className="text-amber-400"
                            />

                            <span className="text-amber-400">
                              Status unavailable
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {calendarStatus ===
                  'connected' ? (
                    <button
                      type="button"
                      onClick={
                        disconnectGoogleCalendar
                      }
                      disabled={
                        calendarActionLoading
                      }
                      className="flex items-center justify-center gap-2 border border-red-950 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.15em] text-red-400 hover:border-red-700 disabled:opacity-40"
                    >
                      {calendarActionLoading ? (
                        <Loader2
                          size={15}
                          className="animate-spin"
                        />
                      ) : (
                        <Unlink
                          size={15}
                        />
                      )}

                      Disconnect
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={
                        connectGoogleCalendar
                      }
                      disabled={
                        calendarActionLoading ||
                        !firebaseUser
                      }
                      className="flex items-center justify-center gap-2 bg-[#9A1B22] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.15em] hover:bg-[#7A151B] disabled:opacity-40"
                    >
                      {calendarActionLoading ? (
                        <Loader2
                          size={15}
                          className="animate-spin"
                        />
                      ) : (
                        <Calendar
                          size={15}
                        />
                      )}

                      Connect
                    </button>
                  )}
                </div>

                <div>
                  <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-[#C52531]">
                    Synced Calendars
                  </h3>

                  <label className="flex items-center gap-3 border border-zinc-900 bg-zinc-950/40 p-4">
                    <input
                      type="checkbox"
                      checked={
                        calendarStatus ===
                        'connected'
                      }
                      readOnly
                      className="accent-[#9A1B22]"
                    />

                    <span>
                      <span className="block text-sm">
                        Primary Calendar
                      </span>

                      <span className="mt-1 block text-xs text-zinc-600">
                        The current integration securely reads the primary calendar only.
                      </span>
                    </span>
                  </label>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    void checkCalendarStatus()
                  }
                  className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-500 hover:text-white"
                >
                  <RefreshCw
                    size={14}
                  />
                  Refresh connection status
                </button>
              </div>
            )}

            {activeTab ===
              'hardware' && (
              <div className="space-y-8">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="border border-zinc-900 bg-black p-5">
                    <Wifi
                      size={18}
                      className="mb-4 text-zinc-600"
                    />

                    <p className="text-2xl font-semibold">
                      0
                    </p>

                    <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-zinc-600">
                      Online modules
                    </p>
                  </div>

                  <div className="border border-zinc-900 bg-black p-5">
                    <BatteryMedium
                      size={18}
                      className="mb-4 text-zinc-600"
                    />

                    <p className="text-2xl font-semibold">
                      —
                    </p>

                    <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-zinc-600">
                      Battery status
                    </p>
                  </div>

                  <div className="border border-zinc-900 bg-black p-5">
                    <Cpu
                      size={18}
                      className="mb-4 text-zinc-600"
                    />

                    <p className="text-2xl font-semibold">
                      —
                    </p>

                    <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-zinc-600">
                      Firmware
                    </p>
                  </div>
                </div>

                <div className="border border-zinc-800 bg-black p-6">
                  <h3 className="text-sm font-semibold">
                    No registered wardrobe modules
                  </h3>

                  <p className="mt-2 max-w-2xl text-xs leading-6 text-zinc-600">
                    Telemetry storage exists, but a secure per-user device registry and pairing service must be connected before modules can safely appear here.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setPairingOpen(
                      current =>
                        !current,
                    )
                  }
                  className="w-full border border-dashed border-zinc-700 px-5 py-4 text-xs font-bold uppercase tracking-[0.16em] text-zinc-400 hover:border-[#9A1B22] hover:text-white"
                >
                  + Add New Wardrobe Device
                </button>

                {pairingOpen && (
                  <div className="border-l-2 border-[#9A1B22] bg-zinc-950 p-6">
                    <h3 className="text-sm font-semibold">
                      Guided Pairing
                    </h3>

                    <ol className="mt-4 space-y-3 text-xs text-zinc-500">
                      <li>
                        1. Power on the SkoBox module.
                      </li>

                      <li>
                        2. Place it in Bluetooth pairing mode.
                      </li>

                      <li>
                        3. Select a secure Wi-Fi network.
                      </li>
                    </ol>

                    <button
                      type="button"
                      disabled
                      className="mt-6 bg-zinc-800 px-5 py-3 text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-500"
                    >
                      Pairing service not connected
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab ===
              'advanced' && (
              <div className="space-y-8">
                <div>
                  <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-[#C52531]">
                    Diagnostics & Sync
                  </h3>

                  <div className="divide-y divide-zinc-900 border-y border-zinc-900">
                    <div className="flex items-center justify-between gap-4 py-5">
                      <div>
                        <p className="text-sm font-semibold">
                          Integration Status
                        </p>

                        <p className="mt-1 text-xs text-zinc-600">
                          Recheck authenticated service connections.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          void checkCalendarStatus()
                        }
                        aria-label="Refresh diagnostics"
                        className="border border-zinc-700 p-3 text-zinc-400 hover:text-white"
                      >
                        <RefreshCw
                          size={16}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-4 py-5">
                      <div>
                        <p className="text-sm font-semibold">
                          Firmware Updates
                        </p>

                        <p className="mt-1 text-xs text-zinc-600">
                          Available after a wardrobe module is securely registered.
                        </p>
                      </div>

                      <span className="text-[10px] uppercase tracking-[0.15em] text-zinc-700">
                        Unavailable
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4 py-5">
                      <div>
                        <p className="text-sm font-semibold">
                          RFID Scanner
                        </p>

                        <p className="mt-1 text-xs text-zinc-600">
                          Manual scanner controls remain disabled without a connected module.
                        </p>
                      </div>

                      <span className="text-[10px] uppercase tracking-[0.15em] text-zinc-700">
                        Unavailable
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-[#C52531]">
                    Data Export
                  </h3>

                  <button
                    type="button"
                    onClick={
                      exportSettings
                    }
                    className="flex items-center gap-2 border border-zinc-700 px-5 py-3 text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-300 hover:border-white hover:text-white"
                  >
                    <Download
                      size={16}
                    />
                    Export Settings
                  </button>

                  <p className="mt-3 text-xs text-zinc-600">
                    Exports profile and preference metadata only. Passwords, OAuth credentials, and wardrobe photographs are never included.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}