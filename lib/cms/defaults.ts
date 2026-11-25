import type { PageKey, QuickLink, SitePage } from "./types";

// Built-in copy shown whenever no published row exists, so a modal can never be blank.
// TODO(committee): replace the demonstration wording and have UTM review it before launch.
export const defaultPages: Record<PageKey, Omit<SitePage, "key" | "isDefault">> = {
  contact: {
    title: "Contact the ISC",
    heading: "Start with your community.",
    body:
      "Your buddy and the ISC committee can help with everyday campus questions.\n\n" +
      "For official contacts, find the current ISC or Student Affairs details through UTM's official website.\n\n" +
      "For anything personal or sensitive, the welfare channel is the right place.",
    linkLabel: "Find official UTM contacts",
    linkUrl: "https://www.utm.ac.mu/",
  },
  about: {
    title: "About ISC Connect",
    heading: "One calm place for international students.",
    body:
      "ISC Connect brings arrival guidance, checked housing, buddy support, club notices and a dedicated welfare route together for international students at the University of Technology, Mauritius.\n\n" +
      "Official notices are shown as approved only after the University has signed them off.",
  },
  privacy: {
    title: "Privacy",
    heading: "Only what's needed. Only for the right people.",
    body:
      "ISC Connect follows data-minimisation principles under the Mauritius Data Protection Act 2017, with welfare access kept separate from club administration.\n\n" +
      "The app shell may be cached for offline access, but welfare pages and submitted welfare information are never saved to browser storage.",
    linkLabel: "Mauritius Data Protection Office",
    linkUrl: "https://dataprotection.govmu.org/",
  },
};

export const defaultLinks: QuickLink[] = [{ id: 0, label: "UTM official website", url: "https://www.utm.ac.mu/" }];
