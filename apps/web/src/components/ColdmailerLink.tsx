import { ArrowUpRight, Send } from "lucide-react";
import { Button, Card, SectionHeader } from "../ui/index.js";

const COLDMAILER_URL = "https://coldmailer-gray.vercel.app/index.html";

/** A plain link out to Coldmailer, a separate cold-email tool — its own app,
 * own auth, own Supabase project. Not worth pulling into this codebase (it's
 * Flask, not Node), so this is just a door to it once you've solved enough
 * to start applying. */
export function ColdmailerLink() {
  return (
    <Card className="flex flex-col gap-3 p-4">
      <SectionHeader
        title="Cold outreach"
        description="Send job-application or professor-outreach emails from your own Gmail, in bulk, on a schedule."
        icon={<Send className="h-4 w-4 text-text-muted" aria-hidden />}
      />
      <div>
        <a href={COLDMAILER_URL} target="_blank" rel="noreferrer">
          <Button variant="secondary" size="sm">
            Open Coldmailer
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </Button>
        </a>
      </div>
    </Card>
  );
}
