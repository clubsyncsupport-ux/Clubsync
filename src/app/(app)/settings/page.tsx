import type { Metadata } from "next";
import { getViewer } from "@/lib/viewer";
import { logoutAction } from "@/app/actions/auth";
import { ProfileForm } from "./profile-form";
import { ThemeSelector } from "./theme-selector";
import { CalendarPrefsForm } from "./calendar-prefs-form";
import { GoogleCalendarCard } from "./google-calendar-card";
import { ServiceHourGoalForm } from "./service-hour-goal-form";
import { ChangePasswordForm } from "./change-password-form";
import { DeleteAccountForm } from "./delete-account-form";
import { InstallAppCard } from "./install-app-card";
import { BackButton } from "@/components/ui/back-button";
import type { ThemePref } from "@/lib/constants";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const viewer = await getViewer();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-6 animate-fade-in">
      <div>
        <BackButton fallbackHref="/home" />
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-text-primary">Settings</h1>
      </div>

      <ProfileForm
        firstName={viewer.firstName}
        lastName={viewer.lastName}
        email={viewer.email}
        bio={viewer.bio}
        avatarUrl={viewer.avatarUrl}
      />
      <ThemeSelector initial={viewer.theme as ThemePref} />
      <CalendarPrefsForm
        calendarView={viewer.calendarView}
        weekStartsOn={viewer.weekStartsOn}
        timeFormat={viewer.timeFormat}
        reminderOffsets={viewer.reminderOffsets}
      />
      <GoogleCalendarCard connected={!!viewer.googleCalendarConnectedAt} />
      <ServiceHourGoalForm current={viewer.serviceHourGoal} />
      <ChangePasswordForm />
      <InstallAppCard />
      <DeleteAccountForm />

      <form action={logoutAction}>
        <button type="submit" className="w-full rounded-xl border border-danger/30 bg-danger-soft py-3 text-center font-medium text-danger">
          Sign Out
        </button>
      </form>

      <p className="pb-4 text-center text-xs text-text-muted">ClubSync v1.0</p>
    </div>
  );
}
