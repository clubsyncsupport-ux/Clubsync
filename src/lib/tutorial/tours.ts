export type TourRole = "student" | "teacher" | "admin";

export type TourStep = {
  title: string;
  body: string;
  /** `data-tour` id(s) of the thing to spotlight; the first one that's
   * actually on screen wins (a sidebar link on desktop, a different one on a
   * phone). Leave out for a plain centred card. */
  target?: string | string[];
  /** Go to this page first (the target lives there). */
  route?: string;
};

export type Tour = {
  id: string;
  kind: "basic" | "chapter";
  audience: TourRole[];
  /** Only offered to people who lead a club (director / officer). */
  leadersOnly?: boolean;
  title: string;
  blurb: string;
  /** Where the lesson begins. `{clubId}` / `{schoolId}` are filled in at launch. */
  startRoute: string;
  steps: TourStep[];
};

export const TOURS: Tour[] = [
  // ───────────────────────── Students ─────────────────────────
  {
    id: "student-basic",
    kind: "basic",
    audience: ["student"],
    title: "Quick tour",
    blurb: "The main parts of ClubSync in about a minute.",
    startRoute: "/home",
    steps: [
      {
        title: "Welcome to ClubSync",
        body: "This is where you find clubs, see what's happening at school, sign up for events and track your service hours. The tour takes about a minute, and you can skip it any time.",
      },
      {
        title: "Home",
        body: "Your day at a glance: today's bell schedule, school announcements, your next event and your service-hour progress.",
        target: "nav-home",
      },
      {
        title: "Your clubs",
        body: "The clubs you've joined live here. Open one to see its events, who's in it, and its chat.",
        target: "nav-clubs",
      },
      {
        title: "Discover",
        body: "Looking for something new? Browse every club at your school and join with one tap.",
        target: "nav-discover",
      },
      {
        title: "Calendar",
        body: "Every club event, school date and class block in one calendar. If an event happens during class, it shows which blocks you'd miss.",
        target: "nav-calendar",
      },
      {
        title: "Chats",
        body: "All your club chats in one inbox, with school announcements pinned at the top. The round chat button gets you here from any page.",
        target: ["nav-chats", "chat-fab"],
      },
      {
        title: "Service hours",
        body: "Track your volunteer hours, set a goal, and print a verified report when you need one.",
        target: "nav-hours",
      },
      {
        title: "Alerts",
        body: "Reminders, sign-up confirmations and new messages show up here.",
        target: ["nav-alerts", "notification-bell"],
      },
    ],
  },
  {
    id: "student-clubs",
    kind: "chapter",
    audience: ["student"],
    title: "Finding and joining clubs",
    blurb: "Search, filter, join, and apply for club positions.",
    startRoute: "/discover",
    steps: [
      {
        title: "Search and filter",
        body: "Type a club's name, or use the category buttons to narrow things down — Arts, Sports, Volunteer and more.",
        route: "/discover",
        target: "discover-search",
      },
      {
        title: "Join with one tap",
        body: "Open a club to read about it, then press Join. Some clubs ask a teacher to approve you first, and some are limited to certain grades.",
        route: "/discover",
      },
      {
        title: "Your clubs",
        body: "Everything you've joined is collected here, with your role in each one.",
        route: "/my-clubs",
        target: "nav-clubs",
      },
      {
        title: "Positions are separate from events",
        body: "Clubs can also post open positions (like treasurer or photographer). You apply with a few short answers, and the club's leaders accept or decline — that's different from signing up for a single event.",
        route: "/my-clubs",
      },
    ],
  },
  {
    id: "student-events",
    kind: "chapter",
    audience: ["student"],
    title: "Events and roles",
    blurb: "Sign up, pick a role, and see if an event cuts into class.",
    startRoute: "/home",
    steps: [
      {
        title: "Upcoming events",
        body: "Your next events are on Home, and every club's events are on its page. Open one to see the when, where and who.",
        route: "/home",
        target: "home-events",
      },
      {
        title: "Roles",
        body: "Some events need specific people — referees, setup crew, scorekeepers. Pick the role you want when you sign up. A role can show a pay amount if it's paid, and it closes once it's full.",
      },
      {
        title: "During class?",
        body: "If an event happens during school, you'll see exactly which blocks it overlaps (like \"Block B, Block C\") on the event page and in the calendar. It's allowed — it's just so you know what you'd miss and can plan ahead.",
        route: "/calendar",
        target: "calendar-views",
      },
    ],
  },
  {
    id: "student-calendar",
    kind: "chapter",
    audience: ["student"],
    title: "Using the calendar",
    blurb: "Views, filters, the bell schedule, and your own events.",
    startRoute: "/calendar",
    steps: [
      {
        title: "Four ways to look",
        body: "Switch between Month, Week, Day and Agenda. Day shows your bell schedule with events placed inside it.",
        route: "/calendar",
        target: "calendar-views",
      },
      {
        title: "Show and hide",
        body: "Tap a club, or the Bell Schedule, to hide it from the calendar. Tap again to bring it back — it's only your view, nobody else is affected.",
        route: "/calendar",
        target: "calendar-legend",
      },
      {
        title: "Add your own",
        body: "Put a test, a game or a dentist appointment on your calendar so everything is in one place. These are private to you.",
        route: "/calendar",
        target: "calendar-add",
      },
    ],
  },
  {
    id: "student-chats",
    kind: "chapter",
    audience: ["student"],
    title: "Chats and announcements",
    blurb: "Club chats, direct messages, and school-wide news.",
    startRoute: "/chats",
    steps: [
      {
        title: "One inbox",
        body: "Every channel from every club you're in, newest activity first. Tap one to open it — no digging through club pages.",
        route: "/chats",
        target: "chats-list",
      },
      {
        title: "School announcements",
        body: "Teachers and admins post school-wide news here — events, tryouts, sales. Everyone sees it, and only staff can post.",
        route: "/chats",
        target: "chats-announcements",
      },
      {
        title: "Chatting",
        body: "Your messages are on the right in blue and everyone else's are on the left. Tap a message to react. Messages are logged and visible to your club's sponsor teacher, so keep it friendly.",
        route: "/chats",
      },
    ],
  },
  {
    id: "student-hours",
    kind: "chapter",
    audience: ["student"],
    title: "Service hours",
    blurb: "Earning, tracking and printing your hours.",
    startRoute: "/service-hours",
    steps: [
      {
        title: "Your progress",
        body: "Hours from events your club leaders verify add up here toward your goal. Change the goal any time in Settings.",
        route: "/service-hours",
        target: "hours-summary",
      },
      {
        title: "A report you can hand in",
        body: "When you need proof for a graduation requirement or an application, open the report page and print it.",
        route: "/service-hours",
      },
    ],
  },

  // ───────────────────────── Teachers ─────────────────────────
  {
    id: "teacher-basic",
    kind: "basic",
    audience: ["teacher"],
    title: "Quick tour",
    blurb: "The main parts of ClubSync for teachers in about a minute.",
    startRoute: "/teacher",
    steps: [
      {
        title: "Welcome to ClubSync",
        body: "This is where you run your clubs, staff your events and reach the whole school. The tour takes about a minute, and you can skip it any time.",
      },
      {
        title: "Dashboard",
        body: "The clubs you run. Open one to manage its events, members, positions and chat.",
        target: "nav-dashboard",
      },
      {
        title: "Staffing board",
        body: "Every upcoming event across your clubs and which roles still need people. Fully staffed events turn green.",
        target: "nav-staffing-board",
      },
      {
        title: "Calendar",
        body: "All your clubs' events together, so you can spot clashes at a glance.",
        target: "nav-calendar",
      },
      {
        title: "Chats",
        body: "Every club chat you're in, in one inbox.",
        target: "nav-chats",
      },
      {
        title: "School feed",
        body: "Post an announcement to the whole school — a sale, tryouts, an event. Students read it; only staff can post.",
        target: "nav-school-feed",
      },
    ],
  },
  {
    id: "teacher-club-management",
    kind: "chapter",
    audience: ["teacher", "student"],
    leadersOnly: true,
    title: "Running a club",
    blurb: "Events, roles and pay, attendance, members and chat.",
    startRoute: "/director/{clubId}/events",
    steps: [
      {
        title: "Events and roles",
        body: "Create events here. Add roles with how many people you need, and an optional pay amount for each. Save a role once and reuse it on future events — and copy a whole event to run it again.",
        route: "/director/{clubId}/events",
        target: "nav-events",
      },
      {
        title: "Who's still missing",
        body: "The staffing board shows which upcoming events still need people. Fully staffed ones turn green.",
        route: "/director/{clubId}/events",
        target: "events-staffing",
      },
      {
        title: "Attendance and hours",
        body: "After an event, mark who came. Service hours are awarded once you verify them.",
        route: "/director/{clubId}/events",
        target: "nav-attendance",
      },
      {
        title: "Members",
        body: "Approve join requests, promote officers, add a co-sponsor teacher, and organize people into groups.",
        route: "/director/{clubId}/events",
        target: "nav-members",
      },
      {
        title: "Chat",
        body: "Create channels, keep them open or invite-only, and message your members. Everything is logged and visible to you as the sponsor.",
        route: "/director/{clubId}/events",
        target: "nav-chat",
      },
    ],
  },
  {
    id: "teacher-school",
    kind: "chapter",
    audience: ["teacher"],
    title: "School feed and staffing",
    blurb: "Reach the whole school and see who's missing.",
    startRoute: "/teacher/school-feed",
    steps: [
      {
        title: "Post to everyone",
        body: "Write an announcement, attach a poster, and promote one of your upcoming events. Everyone at the school gets a notification.",
        route: "/teacher/school-feed",
        target: "feed-composer",
      },
      {
        title: "Staffing board",
        body: "Pick 7, 14 or 30 days. Events that need people are called out with exactly which roles are open.",
        route: "/teacher/coverage",
        target: "coverage-range",
      },
    ],
  },

  // ───────────────────────── School admins ─────────────────────────
  {
    id: "admin-basic",
    kind: "basic",
    audience: ["admin"],
    title: "Quick tour",
    blurb: "The main parts of ClubSync for school administrators.",
    startRoute: "/school-admin/{schoolId}",
    steps: [
      {
        title: "Welcome to ClubSync",
        body: "This is your school's control room: approvals, clubs, teachers and school-wide announcements. The tour takes about a minute, and you can skip it any time.",
      },
      {
        title: "Dashboard",
        body: "A snapshot of clubs, students and activity at your school.",
        target: "nav-dashboard",
      },
      {
        title: "Approvals",
        body: "Event proposals and club registrations wait here for your sign-off after the sponsor teacher approves.",
        target: "nav-approvals",
      },
      {
        title: "Students and teachers",
        body: "See everyone at your school, and approve new teacher accounts.",
        target: ["nav-teachers", "nav-students"],
      },
      {
        title: "Clubs",
        body: "Every club at your school, with tools to review or step in when needed.",
        target: "nav-clubs",
      },
      {
        title: "Staffing board",
        body: "Every upcoming event across the school and which roles are still unfilled.",
        target: "nav-staffing-board",
      },
      {
        title: "School feed",
        body: "Post school-wide announcements that every student and teacher sees.",
        target: "nav-school-feed",
      },
      {
        title: "Settings",
        body: "Your school's details and preferences live here.",
        target: "nav-settings",
      },
    ],
  },
];

export function toursForRole(role: TourRole, opts: { isClubLeader: boolean }): Tour[] {
  return TOURS.filter((t) => t.audience.includes(role) && (!t.leadersOnly || opts.isClubLeader));
}

export function basicTourFor(role: TourRole): Tour | undefined {
  return TOURS.find((t) => t.kind === "basic" && t.audience.includes(role));
}

export function getTour(id: string): Tour | undefined {
  return TOURS.find((t) => t.id === id);
}

// Shown after someone skips or declines the in-depth lessons, so they know
// where to find them again. Admins have no profile menu, so theirs points at
// the Settings page in the sidebar.
export function settingsHint(role: TourRole): TourStep {
  return role === "admin"
    ? {
        title: "Find the lessons any time",
        body: "Open Settings in the sidebar and scroll to Tutorial. You can replay the quick tour or take the in-depth lessons whenever you like.",
        target: "nav-settings",
      }
    : {
        title: "Find the lessons any time",
        body: "Open your profile menu, then Settings, and scroll to Tutorial. You can replay the quick tour or take the in-depth lessons whenever you like.",
        target: "profile-menu",
      };
}
