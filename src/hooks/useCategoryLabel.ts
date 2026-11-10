"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { isExtensionCategory } from "@/lib/extension-category";

/** Display name for a category — maps the reserved extension category key to its localized name. */
export function useCategoryLabel() {
  const t = useTranslations("Extension");
  return useCallback(
    (category: string) => (isExtensionCategory(category) ? t("categoryName") : category),
    [t]
  );
}
