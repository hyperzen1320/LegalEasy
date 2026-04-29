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
      <div className="flex min-h-screen flex-col">
        <Topbar />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
