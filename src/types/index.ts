export interface PaymentRequirements {
	scheme: "exact";
	network: "base-sepolia" | "base";
	maxAmountRequired: string;
	resource: string;
	description: string;
	mimeType: string;
	payTo: `0x${string}`;
	maxTimeoutSeconds: number;
	asset: `0x${string}`;
	extra?: {
		name: string;
		version: string;
	};
}

export interface X402Response {
	error: string;
	accepts: PaymentRequirements[];
	x402Version: number;
}

export interface PaymentPayload {
	x402Version: number;
	scheme: "exact";
	network: string;
	payload: {
		signature: `0x${string}`;
		authorization: {
			from: `0x${string}`;
			to: `0x${string}`;
			value: string;
			validAfter: string;
			validBefore: string;
			nonce: `0x${string}`;
		};
	};
}
