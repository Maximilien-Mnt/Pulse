// Temporary helper: copy source files to numbered .txt dumps for clean reading.
const fs = require("fs");

const files = [
  ["app/(tabs)/clubs/[clubId].tsx", "_d1.txt"],
  ["app/(tabs)/events/[eventId].tsx", "_d2.txt"],
  ["app/(tabs)/create/index.tsx", "_d3.txt"],
  ["app/(tabs)/discover/index.tsx", "_d4.txt"],
  ["app/(tabs)/events/index.tsx", "_d5.txt"],
  ["app/(tabs)/explore/index.tsx", "_d6.txt"],
  ["app/(tabs)/conversations/index.tsx", "_d7.txt"],
  ["app/(tabs)/profile/accepted-events.tsx", "_d8.txt"],
  ["app/(tabs)/profile/events.tsx", "_d9.txt"],
  ["app/(tabs)/profile/notifications.tsx", "_d10.txt"],
  ["app/(tabs)/profile/edit-profile.tsx", "_d11.txt"],
  ["app/(tabs)/profile/edit-public.tsx", "_d12.txt"],
  ["app/(tabs)/profile/clubs.tsx", "_d13.txt"],
  ["app/(tabs)/profile/index.tsx", "_d14.txt"],
  ["app/(tabs)/profile/settings.tsx", "_d15.txt"],
  ["app/(tabs)/profile/user-posts.tsx", "_d16.txt"],
  ["app/(tabs)/profile/public.tsx", "_d17.txt"],
  ["app/(tabs)/conversations/[conversationId].tsx", "_d18.txt"],
];

for (const [f, o] of files) {
  fs.writeFileSync(o, fs.readFileSync(f, "utf8"));
}
console.log("done " + files.length);