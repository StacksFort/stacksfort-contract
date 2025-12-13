# Stacks Frontend Integration Guide

A comprehensive guide for building frontend applications that interact with the Stacks blockchain, based on building a mini block explorer.

## Table of Contents

1. [Setting Up Your Development Environment](#setting-up-your-development-environment)
2. [Project Setup with Next.js](#project-setup-with-nextjs)
3. [Understanding Stacks Transaction Types](#understanding-stacks-transaction-types)
4. [Fetching Blockchain Data](#fetching-blockchain-data)
5. [Wallet Integration](#wallet-integration)
6. [Building UI Components](#building-ui-components)
7. [Best Practices](#best-practices)
8. [Common Patterns](#common-patterns)

---

## Setting Up Your Development Environment

### Prerequisites

1. **Node.js** (v18 or higher)
   - Download from: https://nodejs.org/en/download
   - Verify: `node --version`

2. **npm or yarn** (comes with Node.js)
   - Verify: `npm --version`

3. **A Stacks Wallet**
   - [Leather Wallet](https://leather.io/) (formerly Hiro Wallet)
   - [Xverse Wallet](https://www.xverse.app/)

### Required Stacks Libraries

```bash
# Core wallet connection library
npm install --save @stacks/connect

# Transaction utilities and validation
npm install --save @stacks/transactions

# Additional Stacks SDK packages (install as needed)
npm install --save @stacks/blockchain-api-client
npm install --save @stacks/network
```

---

## Project Setup with Next.js

### Initialize Next.js Project

```bash
# Create a new Next.js project with TypeScript and Tailwind
npx create-next-app@latest --typescript --eslint --tailwind --app my-stacks-app

# Navigate to project
cd my-stacks-app

# Install Stacks dependencies
npm install --save @stacks/connect @stacks/transactions

# Install additional UI libraries (optional)
npm install --save lucide-react  # For icons
```

### Project Structure

```
my-stacks-app/
├── app/
│   ├── [address]/
│   │   └── page.tsx          # Dynamic route for address pages
│   ├── layout.tsx            # Root layout
│   ├── page.tsx              # Homepage
│   └── globals.css           # Global styles
├── components/
│   ├── navbar.tsx            # Navigation bar
│   ├── txn-details.tsx       # Transaction detail component
│   └── txns-list.tsx         # Transaction list component
├── hooks/
│   └── use-stacks.ts         # Custom wallet hook
├── lib/
│   ├── fetch-address-transactions.ts  # API functions
│   └── stx-utils.ts          # Utility functions
└── package.json
```

---

## Understanding Stacks Transaction Types

Stacks has five main transaction types:

### 1. **coinbase**
- Block mining rewards
- Generated when new blocks are created

### 2. **token_transfer**
- STX or other token transfers
- Most common transaction type

### 3. **smart_contract**
- Deployment of new smart contracts
- One-time transaction per contract

### 4. **contract_call**
- Function calls to deployed contracts
- Most common for DeFi interactions

### 5. **poison_microblock**
- Microblock production
- Intermediate blocks between Bitcoin blocks

### TypeScript Types for Transactions

```typescript
// Base transaction interface
interface BaseTransaction {
  tx_id: string;
  nonce: number;
  sender_address: string;
  block_hash: string;
  parent_block_hash: string;
  block_height: number;
  block_time: number;
  tx_status: string;
  tx_type:
    | "coinbase"
    | "token_transfer"
    | "smart_contract"
    | "contract_call"
    | "poison_microblock";
}

// Specific transaction types
interface CoinbaseTransaction extends BaseTransaction {
  tx_type: "coinbase";
}

interface TokenTransferTransaction extends BaseTransaction {
  tx_type: "token_transfer";
  token_transfer: {
    recipient_address: string;
    amount: string;  // Amount in micro-STX (divide by 1,000,000 for STX)
  };
}

interface SmartContractTransaction extends BaseTransaction {
  tx_type: "smart_contract";
  smart_contract: {
    clarity_version: number;
    contract_id: string;  // Format: "SP...contract-name"
  };
}

interface ContractCallTransaction extends BaseTransaction {
  tx_type: "contract_call";
  contract_call: {
    contract_id: string;
    function_name: string;
  };
}

interface PoisonMicroblockTransaction extends BaseTransaction {
  tx_type: "poison_microblock";
}

// Union type for all transactions
export type Transaction =
  | CoinbaseTransaction
  | TokenTransferTransaction
  | SmartContractTransaction
  | ContractCallTransaction
  | PoisonMicroblockTransaction;
```

---

## Fetching Blockchain Data

### Using Hiro's Stacks API

Hiro provides powerful APIs for querying blockchain data that can't be directly queried on-chain.

**Base URL:** `https://api.hiro.so`

### Fetching Address Transactions

```typescript
// lib/fetch-address-transactions.ts

interface FetchAddressTransactionsArgs {
  address: string;
  offset?: number;  // For pagination
  limit?: number;   // Number of transactions to fetch (default: 20)
}

export interface FetchAddressTransactionsResponse {
  limit: number;
  offset: number;
  total: number;
  results: Array<{
    tx: Transaction;
    stx_sent: string;
    stx_received: string;
    events: {
      stx: TransactionEvent;
      ft: TransactionEvent;
      nft: TransactionEvent;
    };
  }>;
}

export async function fetchAddressTransactions({
  address,
  offset = 0,
  limit = 20,
}: FetchAddressTransactionsArgs): Promise<FetchAddressTransactionsResponse> {
  const url = `https://api.hiro.so/extended/v2/addresses/${address}/transactions?limit=${limit}&offset=${offset}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Failed to fetch address transactions");
  }

  const data = await response.json();
  return data as FetchAddressTransactionsResponse;
}
```

### Other Useful API Endpoints

```typescript
// Get account balance
async function getAccountBalance(address: string) {
  const response = await fetch(
    `https://api.hiro.so/extended/v2/addresses/${address}/stx`
  );
  const data = await response.json();
  return data;
}

// Get account NFTs
async function getAccountNFTs(address: string) {
  const response = await fetch(
    `https://api.hiro.so/extended/v2/addresses/${address}/nft_events`
  );
  const data = await response.json();
  return data;
}

// Get transaction details
async function getTransactionDetails(txId: string) {
  const response = await fetch(
    `https://api.hiro.so/extended/v2/tx/${txId}`
  );
  const data = await response.json();
  return data;
}

// Get block details
async function getBlockDetails(blockHeight: number) {
  const response = await fetch(
    `https://api.hiro.so/extended/v2/blocks/${blockHeight}`
  );
  const data = await response.json();
  return data;
}
```

### Utility Functions

```typescript
// lib/stx-utils.ts

/**
 * Abbreviate a Stacks address for display
 * ST3P49R8XXQWG69S66MZASYPTTGNDKK0WW32RRJDN -> ST3P4...RJDN
 */
export function abbreviateAddress(address: string): string {
  if (address.length < 10) return address;
  return `${address.substring(0, 5)}...${address.substring(address.length - 5)}`;
}

/**
 * Abbreviate a transaction ID for display
 */
export function abbreviateTxnId(txnId: string): string {
  if (txnId.length < 15) return txnId;
  return `${txnId.substring(0, 5)}...${txnId.substring(txnId.length - 5)}`;
}

/**
 * Convert micro-STX to STX
 * 1000000 micro-STX = 1 STX
 */
export function microStxToStx(microStx: string | number): number {
  const amount = typeof microStx === "string" ? parseFloat(microStx) : microStx;
  return amount / 1_000_000;
}

/**
 * Convert STX to micro-STX
 */
export function stxToMicroStx(stx: number): string {
  return (stx * 1_000_000).toString();
}

/**
 * Format STX amount for display
 */
export function formatStx(amount: string | number, decimals: number = 2): string {
  const stx = microStxToStx(amount);
  return stx.toFixed(decimals);
}
```

---

## Wallet Integration

### Creating a Wallet Connection Hook

```typescript
// hooks/use-stacks.ts

import {
  AppConfig,
  showConnect,
  type UserData,
  UserSession,
} from "@stacks/connect";
import { useEffect, useState } from "react";

export function useStacks() {
  // User data is null when not logged in
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Create application config
  // "store_write" allows storing auth state in localStorage
  const appConfig = new AppConfig(["store_write"]);

  // Create user session
  const userSession = new UserSession({ appConfig });

  /**
   * Connect user's wallet
   */
  function connectWallet() {
    showConnect({
      appDetails: {
        name: "My Stacks App",
        icon: "https://your-app-icon-url.com/icon.png",
      },
      onFinish: () => {
        // Reload page to populate user session from localStorage
        window.location.reload();
      },
      userSession,
    });
  }

  /**
   * Disconnect user's wallet
   */
  function disconnectWallet() {
    userSession.signUserOut();
    setUserData(null);
  }

  /**
   * Get user's mainnet address
   */
  function getMainnetAddress(): string | null {
    return userData?.profile?.stxAddress?.mainnet || null;
  }

  /**
   * Get user's testnet address
   */
  function getTestnetAddress(): string | null {
    return userData?.profile?.stxAddress?.testnet || null;
  }

  /**
   * Check if user is signed in
   */
  function isSignedIn(): boolean {
    return userSession.isUserSignedIn();
  }

  // Initialize on page load
  useEffect(() => {
    if (userSession.isUserSignedIn()) {
      setUserData(userSession.loadUserData());
    } else if (userSession.isSignInPending()) {
      // Handle pending sign-in (user just connected)
      userSession.handlePendingSignIn().then((userData) => {
        setUserData(userData);
      });
    }
    setIsLoading(false);
  }, []);

  return {
    userData,
    connectWallet,
    disconnectWallet,
    getMainnetAddress,
    getTestnetAddress,
    isSignedIn,
    isLoading,
  };
}
```

### Using the Hook in Components

```typescript
"use client";

import { useStacks } from "@/hooks/use-stacks";

export function MyComponent() {
  const { userData, connectWallet, disconnectWallet, isLoading } = useStacks();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!userData) {
    return (
      <button onClick={connectWallet}>
        Connect Wallet
      </button>
    );
  }

  return (
    <div>
      <p>Connected: {userData.profile.stxAddress.mainnet}</p>
      <button onClick={disconnectWallet}>
        Disconnect
      </button>
    </div>
  );
}
```

### Address Validation

```typescript
import { createAddress } from "@stacks/transactions";

/**
 * Validate a Stacks address
 */
export function validateStacksAddress(address: string): boolean {
  try {
    // Must start with SP (mainnet) or ST (testnet)
    if (!address.startsWith("SP") && !address.startsWith("ST")) {
      return false;
    }
    
    // createAddress throws if invalid
    createAddress(address);
    return true;
  } catch (error) {
    return false;
  }
}

// Usage
if (!validateStacksAddress(userInput)) {
  alert("Invalid Stacks address");
}
```

---

## Building UI Components

### Navigation Bar Component

```typescript
// components/navbar.tsx

"use client";

import { useStacks } from "@/hooks/use-stacks";
import { abbreviateAddress } from "@/lib/stx-utils";
import { createAddress } from "@stacks/transactions";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function Navbar() {
  const router = useRouter();
  const [searchAddress, setSearchAddress] = useState("");
  const { userData, connectWallet, disconnectWallet } = useStacks();

  function handleSearch() {
    // Validate address
    if (!searchAddress.startsWith("SP") && !searchAddress.startsWith("ST")) {
      alert("Please enter a valid Stacks address (SP... or ST...)");
      return;
    }

    try {
      createAddress(searchAddress);
    } catch (error) {
      alert(`Invalid Stacks address: ${error}`);
      return;
    }

    // Navigate to address page
    router.push(`/${searchAddress}`);
  }

  return (
    <nav className="flex w-full items-center justify-between gap-4 p-4 h-16 border-b border-gray-500">
      <Link href="/" className="text-2xl font-bold">
        My Stacks App
      </Link>

      <input
        type="text"
        placeholder="SP..."
        className="w-96 rounded-lg bg-gray-700 px-4 py-2 text-sm"
        value={searchAddress}
        onChange={(e) => setSearchAddress(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            handleSearch();
          }
        }}
      />

      <div className="flex items-center gap-2">
        {userData ? (
          <>
            <button
              onClick={() =>
                router.push(`/${userData.profile.stxAddress.mainnet}`)
              }
              className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
            >
              View {abbreviateAddress(userData.profile.stxAddress.mainnet)}
            </button>
            <button
              onClick={disconnectWallet}
              className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
            >
              Disconnect
            </button>
          </>
        ) : (
          <button
            onClick={connectWallet}
            className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
          >
            Connect Wallet
          </button>
        )}
      </div>
    </nav>
  );
}
```

### Transaction Detail Component

```typescript
// components/txn-details.tsx

import type {
  FetchAddressTransactionsResponse,
  Transaction,
} from "@/lib/fetch-address-transactions";
import { abbreviateTxnId, abbreviateAddress, formatStx } from "@/lib/stx-utils";
import {
  ActivityIcon,
  ArrowLeftRightIcon,
  BlocksIcon,
  CodeSquareIcon,
  FunctionSquareIcon,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

interface TransactionDetailProps {
  result: FetchAddressTransactionsResponse["results"][number];
}

// Map transaction types to icons
const TxTypeIcon: Record<Transaction["tx_type"], LucideIcon> = {
  coinbase: BlocksIcon,
  token_transfer: ArrowLeftRightIcon,
  smart_contract: CodeSquareIcon,
  contract_call: FunctionSquareIcon,
  poison_microblock: ActivityIcon,
};

// Get display information based on transaction type
function getTransactionInfo(result: TransactionDetailProps["result"]) {
  const tx = result.tx;

  switch (tx.tx_type) {
    case "coinbase":
      return {
        primaryTitle: `Block #${tx.block_height}`,
        secondaryTitle: "",
        tags: ["Coinbase"],
      };

    case "token_transfer":
      return {
        primaryTitle: `Transfer ${formatStx(tx.token_transfer.amount)} STX`,
        secondaryTitle: `To ${abbreviateAddress(tx.token_transfer.recipient_address)}`,
        tags: ["Token Transfer"],
      };

    case "smart_contract":
      return {
        primaryTitle: tx.smart_contract.contract_id,
        secondaryTitle: "",
        tags: ["Contract Deployment"],
      };

    case "contract_call":
      return {
        primaryTitle: tx.contract_call.function_name,
        secondaryTitle: tx.contract_call.contract_id.split(".")[1],
        tags: ["Contract Call"],
      };

    case "poison_microblock":
      return {
        primaryTitle: "Microblock",
        secondaryTitle: "",
        tags: ["Microblock"],
      };

    default:
      return {
        primaryTitle: "Unknown Transaction",
        secondaryTitle: "",
        tags: [],
      };
  }
}

export function TransactionDetail({ result }: TransactionDetailProps) {
  const Icon = TxTypeIcon[result.tx.tx_type];
  const { primaryTitle, secondaryTitle, tags } = getTransactionInfo(result);
  const tx = result.tx;

  return (
    <div className="flex items-center p-4 border-l-2 border-transparent hover:border-blue-500 transition-all justify-between">
      <div className="flex items-center gap-4">
        <Icon className="h-10 w-10 rounded-full p-2 border border-gray-700" />

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="font-medium">{primaryTitle}</span>
            {secondaryTitle && (
              <span className="text-gray-500">({secondaryTitle})</span>
            )}
          </div>
          <div className="flex items-center gap-1 font-bold text-xs text-gray-500">
            {tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
            <span>•</span>
            <span className="font-normal">
              By{" "}
              <Link
                href={`/${tx.sender_address}`}
                className="hover:underline transition-all"
              >
                {abbreviateAddress(tx.sender_address)}
              </Link>
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-end gap-2">
        <div className="flex items-center gap-2">
          <Link
            href={`https://explorer.hiro.so/txid/${tx.tx_id}`}
            target="_blank"
            className="hover:underline"
          >
            {abbreviateTxnId(tx.tx_id)}
          </Link>
          <span>•</span>
          <span suppressHydrationWarning>
            {new Date(tx.block_time * 1000).toLocaleString()}
          </span>
        </div>

        <div className="flex items-center gap-1 font-bold text-xs text-gray-500">
          <span>Block #{tx.block_height}</span>
          <span>•</span>
          <span>Nonce {tx.nonce}</span>
        </div>
      </div>
    </div>
  );
}
```

### Transaction List Component with Pagination

```typescript
// components/txns-list.tsx

"use client";

import {
  fetchAddressTransactions,
  type FetchAddressTransactionsResponse,
} from "@/lib/fetch-address-transactions";
import { TransactionDetail } from "./txn-details";
import { useState } from "react";

interface TransactionsListProps {
  address: string;
  transactions: FetchAddressTransactionsResponse;
}

export function TransactionsList({
  address,
  transactions,
}: TransactionsListProps) {
  const [allTxns, setAllTxns] = useState(transactions);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(
    transactions.results.length < transactions.total
  );

  async function loadMoreTxns() {
    if (isLoading || !hasMore) return;

    setIsLoading(true);

    try {
      const newTxns = await fetchAddressTransactions({
        address,
        offset: allTxns.offset + allTxns.limit,
      });

      setAllTxns({
        ...newTxns,
        results: [...allTxns.results, ...newTxns.results],
      });

      // Check if there are more transactions to load
      setHasMore(
        allTxns.results.length + newTxns.results.length < allTxns.total
      );
    } catch (error) {
      console.error("Failed to load more transactions:", error);
      alert("Failed to load more transactions");
    } finally {
      setIsLoading(false);
    }
  }

  if (allTxns.results.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No transactions found for this address
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col border rounded-md divide-y border-gray-800 divide-gray-800">
        {allTxns.results.map((tx) => (
          <div key={tx.tx.tx_id}>
            <TransactionDetail result={tx} />
          </div>
        ))}
      </div>

      {hasMore && (
        <button
          type="button"
          onClick={loadMoreTxns}
          disabled={isLoading}
          className="px-4 py-2 rounded-lg w-fit border border-gray-800 mx-auto text-center hover:bg-gray-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Loading..." : "Load More"}
        </button>
      )}

      {!hasMore && allTxns.results.length > 0 && (
        <div className="text-center text-gray-500 text-sm">
          Showing all {allTxns.total} transactions
        </div>
      )}
    </div>
  );
}
```

### Dynamic Route Page

```typescript
// app/[address]/page.tsx

import { TransactionsList } from "@/components/txns-list";
import { fetchAddressTransactions } from "@/lib/fetch-address-transactions";
import { ExternalLinkIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createAddress } from "@stacks/transactions";

export default async function AddressPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = await params;

  // Validate address
  try {
    createAddress(address);
  } catch (error) {
    notFound();
  }

  // Fetch initial transactions
  let initialTransactions;
  try {
    initialTransactions = await fetchAddressTransactions({ address });
  } catch (error) {
    return (
      <main className="flex h-[100vh-4rem] flex-col p-8 gap-8">
        <div className="text-center text-red-500">
          Failed to load transactions. Please try again later.
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-[100vh-4rem] flex-col p-8 gap-8">
      <div className="flex items-center gap-4">
        <h1 className="text-3xl font-bold">{address}</h1>
        <Link
          href={`https://explorer.hiro.so/address/${address}`}
          target="_blank"
          className="rounded-lg flex gap-1 bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
        >
          <ExternalLinkIcon className="h-4 w-4" />
          View on Hiro Explorer
        </Link>
      </div>

      <TransactionsList address={address} transactions={initialTransactions} />
    </main>
  );
}
```

### Root Layout

```typescript
// app/layout.tsx

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "My Stacks App",
  description: "A Stacks blockchain explorer",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex min-h-screen flex-col gap-8 w-full">
          <Navbar />
          {children}
        </div>
      </body>
    </html>
  );
}
```

### Homepage

```typescript
// app/page.tsx

"use client";

import { useStacks } from "@/hooks/use-stacks";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { userData, isLoading } = useStacks();
  const router = useRouter();

  useEffect(() => {
    // Auto-redirect if wallet is connected
    if (userData?.profile?.stxAddress?.mainnet) {
      router.push(`/${userData.profile.stxAddress.mainnet}`);
    }
  }, [userData, router]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-24">
        <div>Loading...</div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-24">
      <h1 className="text-4xl font-bold">Welcome to My Stacks App</h1>
      <p className="text-gray-500">
        Connect your wallet or search for an address to view transaction history
      </p>
    </main>
  );
}
```

---

## Best Practices

### 1. Error Handling

```typescript
// Always handle API errors gracefully
try {
  const data = await fetchAddressTransactions({ address });
} catch (error) {
  console.error("Error fetching transactions:", error);
  // Show user-friendly error message
  return <ErrorMessage message="Failed to load transactions" />;
}
```

### 2. Loading States

```typescript
// Always show loading states
const [isLoading, setIsLoading] = useState(false);

async function fetchData() {
  setIsLoading(true);
  try {
    // Fetch data
  } finally {
    setIsLoading(false);
  }
}
```

### 3. Type Safety

```typescript
// Use TypeScript types for API responses
interface ApiResponse {
  data: Transaction[];
  total: number;
}

// Validate data at runtime if needed
function isValidTransaction(tx: unknown): tx is Transaction {
  return (
    typeof tx === "object" &&
    tx !== null &&
    "tx_id" in tx &&
    "tx_type" in tx
  );
}
```

### 4. Pagination

```typescript
// Implement proper pagination
const LIMIT = 20;

async function loadMore(offset: number) {
  const newData = await fetchData({ offset, limit: LIMIT });
  
  // Check if there's more data
  const hasMore = offset + LIMIT < total;
  
  return { newData, hasMore };
}
```

### 5. Address Validation

```typescript
// Always validate addresses before using them
import { createAddress } from "@stacks/transactions";

function validateAddress(address: string): boolean {
  try {
    createAddress(address);
    return true;
  } catch {
    return false;
  }
}
```

### 6. Network Selection

```typescript
// Support both mainnet and testnet
const isMainnet = address.startsWith("SP");
const apiUrl = isMainnet
  ? "https://api.hiro.so"
  : "https://api.testnet.hiro.so";
```

---

## Common Patterns

### Pattern 1: Fetching with React Query

```typescript
// Using React Query for better data fetching
import { useQuery } from "@tanstack/react-query";

function useAddressTransactions(address: string, offset: number = 0) {
  return useQuery({
    queryKey: ["transactions", address, offset],
    queryFn: () => fetchAddressTransactions({ address, offset }),
    enabled: !!address,
  });
}

// Usage in component
function MyComponent({ address }: { address: string }) {
  const { data, isLoading, error } = useAddressTransactions(address);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading transactions</div>;

  return <TransactionList transactions={data.results} />;
}
```

### Pattern 2: Real-time Updates with WebSockets

```typescript
// Subscribe to new transactions
function useTransactionSubscription(address: string) {
  useEffect(() => {
    const ws = new WebSocket(
      `wss://api.hiro.so/extended/v2/addresses/${address}/transactions`
    );

    ws.onmessage = (event) => {
      const newTransaction = JSON.parse(event.data);
      // Update UI with new transaction
    };

    return () => ws.close();
  }, [address]);
}
```

### Pattern 3: Caching API Responses

```typescript
// Simple cache implementation
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute

async function fetchWithCache(key: string, fetcher: () => Promise<any>) {
  const cached = cache.get(key);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const data = await fetcher();
  cache.set(key, { data, timestamp: Date.now() });
  return data;
}
```

### Pattern 4: Formatting Transaction Data

```typescript
// Helper to format transaction for display
function formatTransaction(tx: Transaction) {
  switch (tx.tx_type) {
    case "token_transfer":
      return {
        title: `Transfer ${formatStx(tx.token_transfer.amount)} STX`,
        description: `To ${abbreviateAddress(tx.token_transfer.recipient_address)}`,
        icon: "ArrowLeftRight",
      };
    case "contract_call":
      return {
        title: tx.contract_call.function_name,
        description: tx.contract_call.contract_id,
        icon: "FunctionSquare",
      };
    // ... other cases
  }
}
```

---

## Testing Your Application

### Running the Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to see your application.

### Testing Wallet Connection

1. Click "Connect Wallet"
2. Select your wallet (Leather or Xverse)
3. Approve the connection
4. Verify your address appears in the UI

### Testing Address Search

1. Enter a valid Stacks address (e.g., `SP2AWE8GJ52MKEAGGBTTNEEXZSM9VF8CTYK7ZCZDC`)
2. Press Enter or click search
3. Verify transactions load correctly

### Common Issues and Solutions

**Issue: "window is not defined" error**
- **Solution:** This is a known issue with `@stacks/connect`. Use version 7.7.1 or ensure components using it are marked with `"use client"`.

**Issue: Transactions not loading**
- **Solution:** 
  - Verify the address is valid
  - Check network (mainnet vs testnet)
  - Ensure API endpoint is correct
  - Check browser console for errors

**Issue: Wallet connection not persisting**
- **Solution:** Ensure `AppConfig` includes `"store_write"` permission.

---

## Resources

- [Stacks.js Documentation](https://stacks.js.org/)
- [Hiro API Documentation](https://docs.hiro.so/api)
- [Stacks Explorer](https://explorer.stacks.co)
- [Leather Wallet](https://leather.io/)
- [Xverse Wallet](https://www.xverse.app/)
- [Next.js Documentation](https://nextjs.org/docs)

---

## Example: Complete Integration

```typescript
// Complete example: Fetch and display account balance
"use client";

import { useStacks } from "@/hooks/use-stacks";
import { useEffect, useState } from "react";

export function AccountBalance() {
  const { getMainnetAddress } = useStacks();
  const [balance, setBalance] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const address = getMainnetAddress();

  useEffect(() => {
    if (!address) return;

    async function fetchBalance() {
      setIsLoading(true);
      try {
        const response = await fetch(
          `https://api.hiro.so/extended/v2/addresses/${address}/stx`
        );
        const data = await response.json();
        setBalance(data.balance);
      } catch (error) {
        console.error("Failed to fetch balance:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchBalance();
  }, [address]);

  if (!address) {
    return <div>Connect your wallet to view balance</div>;
  }

  if (isLoading) {
    return <div>Loading balance...</div>;
  }

  return (
    <div>
      <h2>Account Balance</h2>
      <p>{balance ? `${(parseInt(balance) / 1_000_000).toFixed(2)} STX` : "N/A"}</p>
    </div>
  );
}
```

---

Happy building! 🚀
