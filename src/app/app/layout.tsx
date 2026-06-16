import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import { Partner } from "@/models/Partner";
import { User } from "@/models/User";
import AppShell from "./components/AppShell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.userType === "global_admin") redirect("/admin");

  // Pull the chambers name and the user's own current name fresh from the DB,
  // so a name change in global admin / My Profile shows in the sidebar right
  // away rather than only after the next login.
  let partnerName = "Your Chambers";
  let freshFirst = session.user.firstName ?? "";
  let freshLast = session.user.lastName ?? "";
  await connectDB();
  if (session.user.partnerId) {
    const partner = await Partner.findById(session.user.partnerId)
      .select("name")
      .lean();
    if (partner) partnerName = partner.name;
  }
  if (session.user.email) {
    const me = await User.findOne({ email: session.user.email })
      .select("firstName lastName")
      .lean();
    if (me) {
      freshFirst = me.firstName ?? "";
      freshLast = me.lastName ?? "";
    }
  }

  const user = {
    firstName: freshFirst,
    lastName: freshLast,
    email: session.user.email ?? "",
  };
  const isAdmin = session.user.userType === "partner_admin";

  return (
    <AppShell partnerName={partnerName} user={user} isAdmin={isAdmin}>
      {children}
    </AppShell>
  );
}
