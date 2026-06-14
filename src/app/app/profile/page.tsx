import mongoose from "mongoose";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { Partner } from "@/models/Partner";
import { DEFAULT_NOTICE_TEMPLATE } from "@/lib/notice-template";
import MyProfileClient, { type ProfileData } from "./MyProfileClient";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await auth();
  let profile: ProfileData | null = null;
  let noticeTemplate = DEFAULT_NOTICE_TEMPLATE;
  const isAdmin = session?.user?.userType === "partner_admin";

  if (session?.user?.id) {
    await connectDB();
    const [user, partner] = await Promise.all([
      User.findById(new mongoose.Types.ObjectId(session.user.id)).lean(),
      session.user.partnerId
        ? Partner.findById(
            new mongoose.Types.ObjectId(session.user.partnerId)
          )
            .select("noticeTemplate")
            .lean()
        : null,
    ]);
    if (partner?.noticeTemplate) noticeTemplate = partner.noticeTemplate;
    if (user) {
      profile = {
        id: String(user._id),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        name: `${user.firstName} ${user.lastName}`.trim(),
        phone: user.phone || "",
        state: user.state || "",
        country: user.country || "India",
        officeAddress: user.officeAddress || "",
        barEnrolmentNo: user.barEnrolmentNo || "",
        designation: user.designation || "",
        profilePhoto: user.profilePhoto || "",
      };
    }
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <div className="mx-auto max-w-[1280px]">
        <div>
          <h2
            className="text-[30px] font-semibold tracking-tight leading-[1.1] sm:text-[40px]"
            style={{
              fontFamily: "var(--font-crimson), Georgia, serif",
              color: "var(--color-app-ink)",
            }}
          >
            My Profile
          </h2>
          <p
            className="mt-2 text-[13px]"
            style={{
              fontFamily: "var(--font-manrope), sans-serif",
              color: "var(--color-app-fg-muted)",
            }}
          >
            Personal and office identity.
          </p>
        </div>

        {profile ? (
          <MyProfileClient
            initialProfile={profile}
            noticeTemplate={noticeTemplate}
            isAdmin={isAdmin}
          />
        ) : null}
      </div>
    </div>
  );
}
