import type { Translation } from "vanilla-cookieconsent";

/** Banner and settings copy. Plain and honest: what each cookie does, and what happens if you say no. */
export const CONSENT_TEXT: Translation = {
  consentModal: {
    title: "Cookies on Bonded",
    description:
      "We use analytics cookies to see which lessons and pages help people and their dogs, so we can make them better. You choose. If you say no, we still count visits, anonymously and without cookies.",
    acceptAllBtn: "Accept all",
    acceptNecessaryBtn: "Reject all",
    showPreferencesBtn: "Manage preferences",
    footer: '<a href="/privacy#cookies">Privacy policy</a>',
  },
  preferencesModal: {
    title: "Cookie settings",
    acceptAllBtn: "Accept all",
    acceptNecessaryBtn: "Reject all",
    savePreferencesBtn: "Save my choice",
    closeIconLabel: "Close",
    sections: [
      {
        description:
          "Choose which cookies Bonded may use. You can change this any time from Cookie settings at the bottom of every page.",
      },
      {
        title: "Necessary",
        description: "Keep you signed in, keep checkout secure and remember this choice. Always on.",
        linkedCategory: "necessary",
      },
      {
        title: "Analytics",
        description:
          "PostHog, our analytics tool, sets cookies so we can see how people move through the site and the app (which lessons they finish, where they get stuck). Off means we still count visits, but anonymously and without cookies.",
        linkedCategory: "analytics",
      },
      {
        title: "More information",
        description: 'Read the <a href="/privacy#cookies">privacy policy</a>, or write to us with any question.',
      },
    ],
  },
};
