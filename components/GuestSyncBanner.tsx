"use client";

import { Icon } from "@/components/Icon";
import { SignInDialog } from "@/components/SignInDialog";
import { useAuth } from "@/components/AuthProvider";

export function GuestSyncBanner() {
  const { loading, user } = useAuth();
  if (loading || user) return null;

  return (
    <div className="guest-sync-banner" role="status">
      <div className="guest-sync-banner-copy">
        <Icon name="bell" size={18} />
        <div>
          <b>Guest alerts work on this device</b>
          <p>Create up to a few price alerts without signing in. Sign in when you want email notifications and background price checks across devices.</p>
        </div>
      </div>
      <SignInDialog label="Sign in for email alerts" className="guest-sync-banner-action" />
    </div>
  );
}
