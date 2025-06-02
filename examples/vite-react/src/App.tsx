import { useState, useCallback } from "react";
import { createWalletClient, custom } from "viem";
import { baseSepolia } from "viem/chains";
import { wrapBrowserFetchWithPayment } from "../../../dist";
import "viem/window";
import "./App.css";

function App() {
	const [account, setAccount] = useState<`0x${string}` | null>(null);
	const [fetchWithPayment, setFetchWithPayment] = useState<
		((input: RequestInfo, init?: RequestInit) => Promise<Response>) | null
	>(null);
	const [status, setStatus] = useState<string>("");
	const [apiResponse, setApiResponse] = useState<string>("");
	const [apiUrl, setApiUrl] = useState(
		"http://localhost:3000/v1/chat/completions",
	); // Your API endpoint

	const connectWallet = useCallback(async () => {
		setStatus("Connecting to wallet...");

		try {
			if (!window.ethereum) {
				throw new Error("No wallet found. Install MetaMask.");
			}

			// Get accounts
			const accounts = (await window.ethereum.request({
				method: "eth_requestAccounts",
			})) as `0x${string}`[];

			const selectedAccount = accounts[0];

			// Create Viem wallet client
			const walletClient = createWalletClient({
				account: selectedAccount,
				chain: baseSepolia,
				transport: custom(window.ethereum),
			});

			// Create signTypedData function for x402
			const signTypedData = async (typedData: any): Promise<`0x${string}`> => {
				return await walletClient.signTypedData({
					account: selectedAccount,
					...typedData,
				});
			};

			// Create x402 fetch function
			const fetchFn = wrapBrowserFetchWithPayment(
				selectedAccount,
				signTypedData,
				BigInt(100000), // Max 0.1 USDC
			);

			setAccount(selectedAccount);
			setFetchWithPayment(() => fetchFn);
			setStatus(
				`Connected: ${selectedAccount.slice(0, 6)}...${selectedAccount.slice(-4)}`,
			);
		} catch (error) {
			setStatus(
				`Error: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}, []);

	const makeRequest = useCallback(async () => {
		if (!fetchWithPayment) {
			setStatus("Connect wallet first");
			return;
		}

		setStatus("Making request...");
		setApiResponse("");

		try {
			const response = await fetchWithPayment(apiUrl, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					model: "llama3.2",
					messages: [
						{
							role: "user",
							content: "Write a one-sentence bedtime story about a unicorn.",
						},
					],
				}),
			});

			const text = await response.text();
			setApiResponse(`Status: ${response.status}\n\n${text}`);
			setStatus("Success");
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			setStatus(`Error: ${errorMessage}`);
			setApiResponse(`Error: ${errorMessage}`);
		}
	}, [fetchWithPayment, apiUrl]);

	return (
		<div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
			<h1>x402 Demo</h1>

			{/* Wallet */}
			<div style={{ marginBottom: "20px" }}>
				{!account ? (
					<button onClick={connectWallet} style={{ padding: "10px 20px" }}>
						Connect Wallet
					</button>
				) : (
					<div>
						<p>Connected: {account}</p>
						<button
							onClick={() => {
								setAccount(null);
								setFetchWithPayment(null);
							}}
						>
							Disconnect
						</button>
					</div>
				)}
			</div>

			{/* API */}
			<div style={{ marginBottom: "20px" }}>
				<input
					type="text"
					value={apiUrl}
					onChange={(e) => setApiUrl(e.target.value)}
					placeholder="API URL"
					style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
				/>
				<button
					onClick={makeRequest}
					disabled={!account}
					style={{ padding: "10px 20px" }}
				>
					Make Request
				</button>
			</div>

			{/* Status */}
			{status && <div style={{ marginBottom: "20px" }}>Status: {status}</div>}

			{/* Response */}
			{apiResponse && (
				<pre
					style={{
						padding: "10px",
						overflow: "auto",
						whiteSpace: "pre-wrap",
					}}
				>
					{apiResponse}
				</pre>
			)}
		</div>
	);
}

export default App;
