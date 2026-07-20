// Shared across the admin ratio picker (BoardItemEditor/board-items action)
// and the public IndexTab layout — kept as a plain string-literal union
// (matching how BoardKind is already used elsewhere) instead of importing
// the generated Prisma enum into client components.
export const INDEX_IMAGE_RATIOS = ["RATIO_3_7", "RATIO_4_6", "RATIO_5_5", "RATIO_6_4", "RATIO_7_3"] as const;

export type IndexImageRatio = (typeof INDEX_IMAGE_RATIOS)[number];

export const INDEX_IMAGE_RATIO_LABELS: Record<IndexImageRatio, string> = {
  RATIO_3_7: "3:7",
  RATIO_4_6: "4:6",
  RATIO_5_5: "5:5",
  RATIO_6_4: "6:4",
  RATIO_7_3: "7:3",
};

/** [imageWeight, textWeight] — first number is the image column, matching
 * the "이미지:텍스트" order the ratio option is labelled with. */
const INDEX_IMAGE_RATIO_WEIGHTS: Record<IndexImageRatio, [number, number]> = {
  RATIO_3_7: [3, 7],
  RATIO_4_6: [4, 6],
  RATIO_5_5: [5, 5],
  RATIO_6_4: [6, 4],
  RATIO_7_3: [7, 3],
};

export function isIndexImageRatio(value: string): value is IndexImageRatio {
  return (INDEX_IMAGE_RATIOS as readonly string[]).includes(value);
}

export function indexImageRatioWeights(ratio: IndexImageRatio): [number, number] {
  return INDEX_IMAGE_RATIO_WEIGHTS[ratio];
}
