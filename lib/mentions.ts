// Detects "@Full Name" mentions in a message/comment body (matched against
// real team member names) and inserts a notification for each mentioned
// person. Uses the service-role client since it needs to write
// notifications for users other than the author.
export async function notifyMentions({
  admin,
  body,
  authorId,
  authorName,
  excludeUserIds = [],
  notifBody,
  link = "/",
}: {
  admin: any;
  body: string;
  authorId: string;
  authorName: string;
  excludeUserIds?: string[];
  notifBody: (mentionedName: string) => string;
  link?: string;
}) {
  const { data: profiles } = await admin.from("profiles").select("id, full_name");
  if (!profiles?.length) return;

  const mentioned = profiles.filter(
    (p: any) =>
      p.full_name &&
      p.id !== authorId &&
      !excludeUserIds.includes(p.id) &&
      body.includes(`@${p.full_name}`)
  );

  if (mentioned.length === 0) return;

  await admin.from("notifications").insert(
    mentioned.map((p: any) => ({
      user_id: p.id,
      type: "mentioned",
      body: notifBody(authorName),
      link,
    }))
  );
}
