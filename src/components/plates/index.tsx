import type { Locale } from "@/content/schema";
import type { Dictionary } from "@/i18n/dictionaries";
import { getPlateSpec } from "./data";
import { profile, t } from "@/content";
import { Plate, type PlateLabels } from "./plate";

/** Title-block signature: initial + family name in English, the full Thai name on /th. */
function author(locale: Locale) {
  if (locale === "th") return t(profile.displayName, locale);
  const [first, ...rest] = profile.name.split(" ");
  return `${first[0]}. ${rest.join(" ")}`;
}

export { getPlateSpec } from "./data";
export type { PlateSpec } from "./types";

export function plateLabels(dict: Dictionary): PlateLabels {
  const w = dict.work;
  return {
    region: w.plateRegion,
    hint: w.plateHint,
    flow: w.plateFlow,
    constraints: w.plateConstraints,
    to: w.plateTo,
    drawing: w.titleBlock.drawing,
    scale: w.titleBlock.scale,
    notToScale: w.titleBlock.notToScale,
    revision: w.titleBlock.revision,
    drawnBy: w.titleBlock.drawnBy,
  };
}

/** The plate for a project, or null when the project has none (it then renders without one). */
export function ProjectPlate({
  projectId,
  projectName,
  locale,
  dict,
  idPrefix,
}: {
  projectId: string;
  projectName: string;
  locale: Locale;
  dict: Dictionary;
  idPrefix: string;
}) {
  const spec = getPlateSpec(projectId);
  if (!spec) return null;
  return (
    <Plate
      spec={spec}
      locale={locale}
      labels={plateLabels(dict)}
      projectName={projectName}
      author={author(locale)}
      idPrefix={idPrefix}
    />
  );
}
