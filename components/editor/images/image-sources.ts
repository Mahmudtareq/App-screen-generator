import type { ComponentType } from "react";
import { Images, Shapes, Upload, type LucideIcon } from "lucide-react";

import type { ImagePick } from "@/lib/editor/image-picks";
import type { AssetKey } from "@/lib/editor/types";

import { LibrarySource } from "./sources/library-source";
import { ProjectSource } from "./sources/project-source";
import { UploadSource } from "./sources/upload-source";

/**
 * The image picker's tabs.
 *
 * Every source gets the same two props and hands back the same `ImagePick`, so the
 * dialog never learns what any of them do — adding a tab is one component and one
 * line in the array below, and removing one is a deleted line. That is the whole
 * reason the indirection exists: the sources worth having next (a stock library, a
 * search API behind a key) differ from these only in where the bytes come from.
 */
export interface ImageSourceProps {
  /** The slot being filled, so a source can leave it out of what it offers. */
  assetKey: AssetKey;
  onPick: (pick: ImagePick) => void;
}

export interface ImageSource {
  id: string;
  label: string;
  icon: LucideIcon;
  Panel: ComponentType<ImageSourceProps>;
}

export const IMAGE_SOURCES = [
  {
    id: "upload",
    label: "Upload",
    icon: Upload,
    Panel: UploadSource,
  },
  {
    id: "library",
    label: "Library",
    icon: Shapes,
    Panel: LibrarySource,
  },
  {
    id: "project",
    label: "Your images",
    icon: Images,
    Panel: ProjectSource,
  },
] as const satisfies readonly ImageSource[];

export const DEFAULT_IMAGE_SOURCE_ID = IMAGE_SOURCES[0].id;
