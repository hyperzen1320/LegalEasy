import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import { Partner } from "@/models/Partner";
import AppShell from "./components/AppShell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.userType === "global_admin") redirect("/admin");

  // Pull the partner so we can show their chambers name in the sidebar
  let partnerName = "Your Chambers";
  if (session.user.partnerId) {
    await connectDB();
    const partner = await Partner.findById(session.user.partnerId)
      .select("name")
      .lean();
    if (partner) partnerName = partner.name;
  }

  const user = {
    firstName: session.user.firstName ?? "",
    lastName: session.user.lastName ?? "",
    email: session.user.email ?? "",
  };
  const isAdmin = session.user.userType === "partner_admin";

  return (
    <AppShell partnerName={partnerName} user={user} isAdmin={isAdmin}>
      {children}
    </AppShell>
  );
}
