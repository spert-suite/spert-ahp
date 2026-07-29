import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

export interface ProfileInfo {
  displayName: string;
  email: string;
}

/**
 * Fetches display profiles for a list of user IDs from spertahp_profiles.
 * Uses the current auth user's data directly to avoid an extra Firestore read.
 * Returns a stable map that updates when userIds change.
 */
export function useProfiles(userIds: string[]): Record<string, ProfileInfo> {
  const { user } = useAuth();
  const [profileMap, setProfileMap] = useState<Record<string, ProfileInfo>>({});

  useEffect(() => {
    if (!db || userIds.length === 0) {
      setProfileMap({});
      return;
    }
    let cancelled = false;

    async function fetchProfiles() {
      const map: Record<string, ProfileInfo> = {};
      await Promise.all(
        userIds.map(async (uid) => {
          // Use auth context for the current user to avoid an extra read
          if (user && uid === user.uid) {
            map[uid] = {
              displayName: user.displayName ?? '',
              email: user.email ?? '',
            };
            return;
          }
          try {
            let snap = await getDoc(doc(db!, 'spertahp_profiles', uid));
            if (!snap.exists()) {
              // Fall back to the suite-wide mirror. spertahp_profiles is
              // written on THIS app's sign-in, but the cross-app invitation
              // Cloud Function resolves an invitee BY their spertsuite_profiles
              // doc and then writes only members.{uid} — it never seeds a
              // per-app profile. A collaborator who has used another SPERT app
              // but never opened AHP therefore has no spertahp_profiles doc,
              // and SharingSection falls through to a truncated raw Auth UID.
              snap = await getDoc(doc(db!, 'spertsuite_profiles', uid));
            }
            if (snap.exists()) {
              const data = snap.data() as { displayName?: string; email?: string };
              map[uid] = {
                displayName: data.displayName ?? '',
                email: data.email ?? '',
              };
            }
          } catch {
            // Profile fetch failed — caller will fall back to truncated UID
          }
        }),
      );
      if (!cancelled) setProfileMap(map);
    }

    void fetchProfiles();
    return () => { cancelled = true; };
  }, [userIds.join(','), user]);

  return profileMap;
}
