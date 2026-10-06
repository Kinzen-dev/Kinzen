import { DoodleFrame } from "../doodles/doodle-frame";
import { artManifest, type ArtName } from "./manifest.generated";

export type { ArtName };

/**
 * v3 scene illustration (hand-drawn ink, same hand as the doodles). The path data is NOT inlined:
 * `<use>` pulls it from /art/<name>.svg (one cached request), so only pages that show a scene pay
 * for it. Recoloured with currentColor and boiled like every doodle. Decorative (aria-hidden via
 * DoodleFrame). Size it with a width or height; the aspect ratio comes from the manifest.
 */
export function Art({ name, className }: { name: ArtName; className?: string }) {
  const art = artManifest[name];
  return (
    <DoodleFrame w={art.w} h={art.h} className={className}>
      <use href={`/art/${name}.svg#p`} />
    </DoodleFrame>
  );
}
