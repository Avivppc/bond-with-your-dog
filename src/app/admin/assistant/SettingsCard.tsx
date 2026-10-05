import { describeProvider, readProviderConfig } from "@/lib/assistant/llm";
import { EXTRA_INSTRUCTIONS_MAX_CHARS, type AssistantSettings } from "@/lib/assistant/types";
import { BTN_PRIMARY, Card, INPUT, LABEL, MUTED, StatusPill } from "../_components/ui";
import { saveAssistantSettings } from "./actions";

/** Which model answers, in words the owner understands (never the keys). */
function ProviderStatus() {
  const summary = describeProvider(readProviderConfig());
  if (summary.kind === "local") {
    return (
      <p className="text-[14px]">
        <StatusPill tone="published">Your model at {summary.host}</StatusPill>{" "}
        <span className={MUTED}>{summary.hasFallback ? "Claude Haiku answers when your model is off or slow." : "No backup: when your model is off, the assistant can't answer."}</span>
      </p>
    );
  }
  if (summary.kind === "anthropic") {
    return (
      <p className="text-[14px]">
        <StatusPill tone="info">Claude Haiku</StatusPill> <span className={MUTED}>Set ASSISTANT_LOCAL_URL to answer with your own model first.</span>
      </p>
    );
  }
  return (
    <p className="text-[14px]">
      <StatusPill tone="warning">Not set up</StatusPill>{" "}
      <span className={MUTED}>Add ASSISTANT_LOCAL_URL (your model) or ANTHROPIC_API_KEY (Claude Haiku) to the server settings.</span>
    </p>
  );
}

function Toggle({ name, label, hint, checked }: { name: string; label: string; hint: string; checked: boolean }) {
  return (
    <label className="flex items-start gap-3">
      <input type="checkbox" name={name} defaultChecked={checked} className="mt-1 h-4 w-4 accent-[#343332]" />
      <span className="flex flex-col">
        <span className={LABEL}>{label}</span>
        <span className={`text-[12px] ${MUTED}`}>{hint}</span>
      </span>
    </label>
  );
}

export function SettingsCard({ settings }: { settings: AssistantSettings }) {
  return (
    <Card title="Settings" description="Answers come only from your chapters. Members' questions it can't answer go to Roni.">
      <div className="mb-5">
        <ProviderStatus />
      </div>
      <form action={saveAssistantSettings} className="flex max-w-xl flex-col gap-5">
        <Toggle
          name="members_enabled"
          label="Members: “Ask about this lesson”"
          hint="A chat on every lesson page, answering from the chapters the member has."
          checked={settings.membersEnabled}
        />
        <Toggle
          name="sales_enabled"
          label="Sales pages: “Questions? Ask us”"
          hint="A chat button on the home, chapters and checkout pages, answering from chapter overviews and prices."
          checked={settings.salesEnabled}
        />
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>Tone and extra instructions (optional)</span>
          <textarea
            name="extra_instructions"
            rows={4}
            className={INPUT}
            maxLength={EXTRA_INSTRUCTIONS_MAX_CHARS}
            defaultValue={settings.extraInstructions ?? ""}
            placeholder="Sound like Roni: playful, short sentences. Call dogs 'pups'."
          />
          <span className={`text-[12px] ${MUTED}`}>
            Style notes for the assistant. Safety rules always come first, and it never makes up prices or lesson content.
          </span>
        </label>
        <div>
          <button type="submit" className={BTN_PRIMARY}>
            Save
          </button>
        </div>
      </form>
    </Card>
  );
}
