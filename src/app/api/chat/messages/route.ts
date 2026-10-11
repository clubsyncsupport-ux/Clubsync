import { getCurrentUser } from "@/lib/auth/session";
import { getChannelMessages } from "@/lib/chat-messages";

// Chat polling lives here rather than in a Server Action: actions run one at a
// time per browser tab, so every poll used to queue in front of (and behind)
// the user's own Send. A plain GET runs alongside it.
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ messages: [] }, { status: 401 });

  const params = new URL(req.url).searchParams;
  const channelId = params.get("channelId");
  if (!channelId) return Response.json({ messages: [] }, { status: 400 });

  const messages = await getChannelMessages(user.id, channelId, { since: params.get("since"), before: params.get("before") });
  return Response.json({ messages }, { headers: { "Cache-Control": "no-store" } });
}
