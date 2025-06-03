import {
	networkConfig,
	authorizationTypes,
	createNonce,
	safeBase64Encode,
} from "../utils";
import type {
	PaymentPayload,
	PaymentRequirements,
	X402Response,
} from "../types";

// Core payment functions
async function signPaymentAuthorization(
	account: `0x${string}`,
	signTypedData: (data: any) => Promise<`0x${string}`>,
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

// Main fetch wrapper
export function wrapBrowserFetchWithPayment(
	account: `0x${string}`,
	signTypedData: (data: any) => Promise<`0x${string}`>,
	maxPaymentAmount: bigint = BigInt(100000), // 0.1 USDC in base units
) {
	return async function fetchWithPayment(
		url: string,
		init?: RequestInit,
	): Promise<Response> {
		// Make initial request
		const response = await fetch(url, init);

		// If not 402, return original response
		if (response.status !== 402) {
			return response;
		}

		// Parse 402 response
		const x402Response = (await response.json()) as X402Response;

		if (!x402Response.accepts || x402Response.accepts.length === 0) {
			throw new Error("No payment options available");
		}

		// Select first available payment requirement
		const paymentRequirements = x402Response.accepts[0];

		if (!paymentRequirements) {
			throw new Error("Payment requirements undefined");
		}

		// Check if payment amount is within allowed limit
		if (BigInt(paymentRequirements.maxAmountRequired) > maxPaymentAmount) {
			throw new Error(
				`Payment amount (${paymentRequirements.maxAmountRequired}) exceeds maximum allowed (${maxPaymentAmount})`,
			);
		}

		try {
			// Create signed payment
			const signedPayment = await signPaymentAuthorization(
				account,
				signTypedData,
				paymentRequirements,
			);

			// Encode payment header
			const paymentHeader = safeBase64Encode(JSON.stringify(signedPayment));

			// Retry request with payment header
			const retryInit = {
				...init,
				headers: {
					...(init?.headers || {}),
					"X-PAYMENT": paymentHeader,
					"Access-Control-Expose-Headers": "X-PAYMENT-RESPONSE",
				},
			};

			const retryResponse = await fetch(url, retryInit);

			if (retryResponse.status === 402) {
				// Payment failed, try to get error details
				const errorResponse = (await retryResponse.json()) as {
					error?: string;
				};
				throw new Error(
					`Payment failed: ${errorResponse.error || "Unknown error"}`,
				);
			}

			return retryResponse;
		} catch (error) {
			if (error instanceof Error) {
				// Handle common payment errors
				if (error.message.includes("insufficient")) {
					throw new Error("Insufficient USDC balance to make payment");
				}
				throw error;
			}
			throw new Error("Failed to process payment");
		}
	};
}
