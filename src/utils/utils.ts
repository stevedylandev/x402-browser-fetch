import { randomBytes } from "@noble/hashes/utils";
import type {
	EIP712TypedData,
	PaymentRequirements,
	PaymentPayload,
} from "../types";
import { networkConfig, authorizationTypes } from "./constants";

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

export async function signPaymentAuthorization(
	account: `0x${string}`,
	signTypedData: (data: EIP712TypedData) => Promise<`0x${string}`>,
	paymentRequirements: PaymentRequirements,
): Promise<PaymentPayload> {
	const network = paymentRequirements.network as keyof typeof networkConfig;
	const config = networkConfig[network];

	if (!config) {
		throw new Error(`Unsupported network: ${network}`);
	}

	const nonce = createNonce();
	const currentTime = Math.floor(Date.now() / 1000);
	const validAfter = (currentTime - 600).toString(); // 10 minutes before
	const validBefore = (
		currentTime + paymentRequirements.maxTimeoutSeconds
	).toString();

	const authorization = {
		from: account,
		to: paymentRequirements.payTo,
		value: paymentRequirements.maxAmountRequired,
		validAfter,
		validBefore,
		nonce,
	};

	const typedData = {
		types: authorizationTypes,
		primaryType: "TransferWithAuthorization" as const,
		domain: {
			name: paymentRequirements.extra?.name || config.usdcName,
			version: paymentRequirements.extra?.version || "2",
			chainId: config.chainId,
			verifyingContract: paymentRequirements.asset,
		},
		message: authorization,
	};

	const signature = await signTypedData(typedData);

	return {
		x402Version: 1,
		scheme: "exact",
		network: paymentRequirements.network,
		payload: {
			signature,
			authorization,
		},
	};
}
