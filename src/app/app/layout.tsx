import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import { Partner } from "@/models/Partner";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";

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

  return (
    <div
      className="app-shell grid min-h-screen"
      style={{ gridTemplateColumns: "260px 1fr" }}
    >
      <Sidebar partnerName={partnerName} user={user} />
      {/* min-w-0 is the load-bearing class here. A CSS grid track's
          implicit min-width is `auto` — meaning "as wide as content".
          Without min-w-0 a wide child (the Case Vault table, the
          Attendance grid) would push the 1fr column past the viewport
          and the whole page would scroll horizontally instead of just
          the inner container. Forcing min-w-0 + overflow-x-hidden on
          this branch keeps the layout's bounds honest so internal
          overflow-x-auto wrappers can actually do their job. */}
      <div className="flex min-h-screen min-w-0 flex-col overflow-x-hidden">
        <Topbar />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
