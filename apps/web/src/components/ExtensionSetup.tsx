import { useEffect, useState } from "react";
import { Check, Copy, Puzzle } from "lucide-react";
import type { ExtensionSetupCode } from "@leettarget/shared";
import { getErrorMessage } from "../lib/errors.js";
import { getGithubLink } from "../lib/api.js";
import { supabase } from "../lib/supabaseClient.js";
import { Button, Card, ErrorNote, SectionHeader, Textarea } from "../ui/index.js";

interface Props {
  userId: string;
}

/** Generates a one-paste setup code for the extension's options page:
 * Supabase URL/anon key, this session's access + refresh token, and the repo
 * mapping. The GitHub PAT is deliberately never included — it's never sent to
 * or stored in Supabase, only ever local to the extension. */
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
    <Card className="flex flex-col gap-4 p-4">
      <SectionHeader
        title="Browser extension"
        description={`Paste this into the extension's options page to wire it up to this account.`}
        icon={<Puzzle className="h-4 w-4 text-text-muted" aria-hidden />}
      />

      {error && <ErrorNote>{error}</ErrorNote>}

      {code && (
        <>
          <Textarea
            readOnly
            value={code}
            rows={7}
            aria-label="Extension setup code"
            className="bg-surface font-mono text-[11px] leading-relaxed"
            onFocus={(e) => e.currentTarget.select()}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" onClick={handleCopy}>
              {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
              {copied ? "Copied" : "Copy setup code"}
            </Button>
            <p className="text-[12px] text-warning">
              Contains a live access token — treat it like a password.
            </p>
          </div>
        </>
      )}
    </Card>
  );
}
