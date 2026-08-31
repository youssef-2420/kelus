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
        <Icon name="lock" size={18} />
        <div>
          <b>Sign in to sync alerts across devices</b>
          <p>Tracked products stay on this browser until you sign in. Kelus can then check prices in the background.</p>
        </div>
      </div>
      <SignInDialog label="Sign in" className="guest-sync-banner-action" />
    </div>
  );
}
