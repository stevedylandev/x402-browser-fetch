import { randomBytes } from "@noble/hashes/utils";

export function createNonce(): `0x${string}` {
	const bytes = randomBytes(32);
	return `0x${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

export function safeBase64Encode(data: string): string {
	const bytes = new TextEncoder().encode(data);
	const binaryString = Array.from(bytes, (byte) =>
		String.fromCharCode(byte),
	).join("");
	return btoa(binaryString);
}
