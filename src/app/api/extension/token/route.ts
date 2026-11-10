import { NextResponse } from "next/server";
import { authenticateExtensionRequest, extensionError } from "@/lib/extension-auth";
import { getRevokeExtensionTokenUseCase } from "@/lib/container";

/** Called by the extension on "disconnect" — revokes the token used for the request. */
export async function DELETE(req: Request) {
  try {
    const session = await authenticateExtensionRequest(req);
    if (!session) return extensionError("unauthorized", "Invalid or revoked extension token");

    await getRevokeExtensionTokenUseCase().execute(session.tokenId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Extension token route error:", error);
    return extensionError("server_error", "Unexpected error");
  }
}
