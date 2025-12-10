import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { domain } = await request.json();

    if (!domain) {
      return NextResponse.json(
        { valid: false, error: "Domain is required" },
        { status: 400 }
      );
    }

    // Clean the domain - remove protocol if present and extract hostname
    let cleanDomain = domain.trim().toLowerCase();

    // Remove common protocols
    cleanDomain = cleanDomain.replace(/^https?:\/\//, "");

    // Remove trailing slashes and paths
    cleanDomain = cleanDomain.split("/")[0];

    // Remove www. prefix for validation
    const domainForValidation = cleanDomain.replace(/^www\./, "");

    // Basic domain format validation
    const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/;
    if (!domainRegex.test(domainForValidation)) {
      return NextResponse.json(
        {
          valid: false,
          error: `Domain '${domain}' does not exist or cannot be resolved`,
        },
        { status: 200 }
      );
    }

    // Try to resolve the domain using DNS lookup
    try {
      // Use a simple fetch to check if the domain resolves
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`https://${cleanDomain}`, {
        method: "HEAD",
        signal: controller.signal,
        redirect: "follow",
      });

      clearTimeout(timeoutId);

      // Domain is valid if we get any response (even 404, 403, etc.)
      return NextResponse.json({
        valid: true,
        domain: cleanDomain,
        normalized: domainForValidation,
      });
    } catch (fetchError) {
      // Try with www if it doesn't have it
      if (!cleanDomain.startsWith("www.")) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);

          await fetch(`https://www.${cleanDomain}`, {
            method: "HEAD",
            signal: controller.signal,
            redirect: "follow",
          });

          clearTimeout(timeoutId);

          return NextResponse.json({
            valid: true,
            domain: `www.${cleanDomain}`,
            normalized: domainForValidation,
          });
        } catch {
          // Fall through to error
        }
      }

      return NextResponse.json(
        {
          valid: false,
          error: `Domain '${domain}' does not exist or cannot be resolved`,
        },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error("[validate-domain] Error:", error);
    return NextResponse.json(
      { valid: false, error: "Failed to validate domain" },
      { status: 500 }
    );
  }
}
