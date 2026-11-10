import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateExtensionRequest, extensionError } from "@/lib/extension-auth";
import { getGenerateFlashcardFromSelectionUseCase } from "@/lib/container";
import { SUPPORTED_LANGUAGES } from "@/lib/extension-prompts";
import { MAX_CONTEXT_LENGTH, MAX_SELECTION_LENGTH } from "@/core/useCases/extension";
import { toExtensionFlashcard } from "@/lib/extension-dto";

export const maxDuration = 60;

const BodySchema = z.object({
  text: z.string().min(1).max(MAX_SELECTION_LENGTH * 2),
  // Context is trimmed server-side; accept a bit more so long paragraphs don't fail validation.
  context: z.string().max(MAX_CONTEXT_LENGTH * 4).optional(),
  learningLanguage: z.enum(SUPPORTED_LANGUAGES),
  nativeLanguage: z.enum(SUPPORTED_LANGUAGES),
  level: z.enum(["easy", "advanced"]).default("easy"),
});

/** Creates a single flashcard from text selected on a web page (pinned extension category). */
export async function POST(req: Request) {
  try {
    const session = await authenticateExtensionRequest(req);
    if (!session) return extensionError("unauthorized", "Invalid or revoked extension token");

    const parsed = BodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return extensionError("invalid_input", "Invalid request body");

    const result = await getGenerateFlashcardFromSelectionUseCase().execute({
      userId: session.userId,
      ...parsed.data,
    });

    if (!result.success) return extensionError(result.code, result.error);

    return NextResponse.json({
      duplicate: result.duplicate,
      flashcard: toExtensionFlashcard(result.flashcard),
    });
  } catch (error) {
    console.error("Extension flashcard route error:", error);
    return extensionError("server_error", "Unexpected error");
  }
}
