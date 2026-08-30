import { Package, ShoppingBag, PartyPopper, HelpCircle, BookOpenCheck, BriefcaseBusiness, Palette } from "lucide-react";

export const TASK_CATEGORIES = [
  {
    id: "moveout",
    label: "Move-Out & Storage",
    icon: Package,
    blurb: "Packing, boxing, transportation, long-term storage",
  },
  {
    id: "errand",
    label: "Errands & Pickups",
    icon: ShoppingBag,
    blurb: "Laundry, groceries, package pickup, line-standing",
  },
  {
    id: "event",
    label: "Event Setup",
    icon: PartyPopper,
    blurb: "Formal setup, breakdown, staffing",
  },
  {
    id: "other",
    label: "Something Else",
    icon: HelpCircle,
    blurb: "Anything that does not fit the other ticket types",
  },
];

export const TUTORING_CATEGORIES = [
  {
    id: "academic",
    label: "Academic",
    icon: BookOpenCheck,
    blurb: "Course help (CHEM0330, ECON0110), test prep (MCAT/LSAT)",
  },
  {
    id: "careers",
    label: "Careers",
    icon: BriefcaseBusiness,
    blurb: "Interview prep, resume reviews, networking, coding help, proofreading",
  },
  {
    id: "creative",
    label: "Creative",
    icon: Palette,
    blurb: "Graphic design, photography, video editing, web projects, music lessons",
  },
  {
    id: "other",
    label: "Something Else",
    icon: HelpCircle,
    blurb: "Long-term storage, unusual requests, or anything else (can be normal services!)",
  },
];

export const CATEGORIES = TASK_CATEGORIES;

export function taskCatMeta(id) {
  return TASK_CATEGORIES.find((c) => c.id === id) || TASK_CATEGORIES[0];
}

export function tutoringCatMeta(id) {
  return TUTORING_CATEGORIES.find((c) => c.id === id) || TUTORING_CATEGORIES[0];
}

export function catMeta(id) {
  return taskCatMeta(id);
}
