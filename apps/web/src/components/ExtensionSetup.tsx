import { getErrorMessage } from "../lib/errors.js";
import { useEffect, useState } from "react";
import type { ExtensionSetupCode } from "@leettarget/shared";
import { getGithubLink } from "../lib/api.js";
import { supabase } from "../lib/supabaseClient.js";

interface Props {
  userId: string;
}

/** Generates a one-paste setup code for the extension's options page —
 * Supabase URL/anon key, this session's access + refresh token, and the
 * repo mapping. Replaces copying ~7 fields by hand (several of which
 * used to be a short-lived access token with no way to refresh it) with
 * one copy on the site and one paste in the extension. The GitHub PAT
 * itself is deliberately never included — it's never sent to or stored in
 * Supabase, only ever local to the extension. */
export function ExtensionSetup({ userId }: Props) {
  const [code, setCode] = useState<string>();
  const [error, setError] = useState<string>();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    generate().catch((err) => setError(getErrorMessage(err)));

    async function generate() {
      const [{ data: sessionData }, githubLink] = await Promise.all([
        supabase!.auth.getSession(),
        getGithubLink(userId),
      ]);

      const session = sessionData.session;
      if (!session) {
        setError("No active session — try signing out and back in.");
        return;
      }

      const setup: ExtensionSetupCode = {
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
        supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        leetTargetUserId: userId,
        supabaseAccessToken: session.access_token,
        supabaseRefreshToken: session.refresh_token,
        githubOwner: githubLink?.owner,
        githubRepo: githubLink?.repo,
        githubBranch: githubLink?.branch,
        pathTemplate: githubLink?.pathTemplate,
      };

      setCode(JSON.stringify(setup, null, 2));
    }
  }, [userId]);

  async function handleCopy() {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <h3 className="font-semibold text-slate-900">Extension setup</h3>
      <p className="mt-1 text-sm text-slate-500">
        Copy this into the extension's options page ("Paste setup code from site") to wire it up to
        this account — it fills in your repo mapping too, so all that's left is your GitHub personal
        access token.
      </p>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {code && (
        <>
          <textarea
            readOnly
            value={code}
            rows={8}
            className="mt-3 w-full rounded border border-slate-300 bg-slate-50 p-2 font-mono text-xs"
            onFocus={(e) => e.currentTarget.select()}
          />
          <button
            onClick={handleCopy}
            className="mt-2 rounded bg-slate-900 px-3 py-1.5 text-sm font-medium text-white"
          >
            {copied ? "Copied!" : "Copy setup code"}
          </button>
          <p className="mt-2 text-xs text-slate-400">
            Contains a live access token — treat it like a password, and re-copy a fresh one if you
            think it leaked (signing out and back in rotates it).
          </p>
        </>
      )}
    </div>
  );
}
