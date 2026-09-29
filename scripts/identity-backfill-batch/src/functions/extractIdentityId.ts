export function extractIdentityId(body: string): string | null {
	const match = body.match(/identity\s*id[^"]*"\s*:\s*"([^"]+)"/i);
	return match?.[1] ?? null;
}
