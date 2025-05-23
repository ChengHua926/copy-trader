# Solana Copy Trader Analysis Tool

This project is a web application designed to analyze Solana wallet transactions to identify potential copy traders. It provides insights into wallets that mimic the trading behavior of a target wallet.

> ⚠️ **Important Notice (May 22nd):** The Moralis API, used for fetching detailed token swap data, has a free tier with usage limits. As of May 22nd, these limits may have been exhausted. If you are testing this project on this date, the backend processes relying on Moralis (specifically, fetching follower transaction details) will not not function as expected or could return incomplete data.

## Workflow: How We Identify Copy Traders

This tool follows a multi-step process to identify and score potential copy traders. Let's walk through an example: suppose you want to analyze the trading activity of **Wallet A**.

1.  **Initial Transaction Fetch:**
    *   The system first fetches the last 700 transactions associated with Wallet A. We look for `SWAP` or `TRANSFER` type transactions using the Helius API. 

2.  **Identifying Leader's Buys:**
    *   Next, we filter these 700 transactions to pinpoint instances where Wallet A actually *bought* a token. This is determined by checking if Wallet A was the `feePayer` for the transaction and if it received tokens in the `tokenTransfers` field.

3.  **Finding Follower Activity:**
    *   For each identified buy transaction by Wallet A, we note the `token mint address` (the specific token Wallet A bought) and the `timestamp` of that purchase.
    *   Using the Moralis API, we then query for *all* transactions involving that same token mint that occurred from the moment Wallet A bought it up to 3 seconds later. This find other wallets that bought the same token very shortly after Wallet A.

4.  **Aggregating Follower Data:**
    *   Each instance where another wallet (let's call it Wallet B, C, etc.) buys the same token within that 3-second window after Wallet A is considered a potential copy trade.
    *   This "follower appearance" is recorded. We then aggregate these appearances to calculate per-follower metrics, such as how many times Wallet B copied Wallet A, the variety of tokens copied, and the average delay.

5.  **Scoring and Normalization:**
    *   Finally, the collected metrics for each potential follower wallet are normalized.
    *   A composite score is calculated based on factors like copy frequency, speed (delay), and breadth (variety of tokens copied). This score helps quantify the likelihood that a wallet is systematically copy trading Wallet A.

## Project Structure

The project is organized into two main directories:

*   `backend/`: Contains the FastAPI Python application that handles data fetching from Helius and Moralis APIs, processes transactions, analyzes copy trading patterns, and serves the results via a REST API.
*   `frontend/`: Contains the Next.js (React/TypeScript) application that provides the user interface for inputting a target wallet and displaying the copy trader analysis results.

## Prerequisites

Before you begin, ensure you have the following installed:

*   Python (version 3.8 or higher recommended)
*   `pip` (Python package installer)
*   Node.js (version 18.x or higher recommended)
*   `npm` (Node package manager, comes with Node.js)

## Backend Setup

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```

2.  **Create and activate a Python virtual environment (recommended):**
    *   On macOS and Linux:
        ```bash
        python3 -m venv venv
        source venv/bin/activate
        ```
    *   On Windows:
        ```bash
        python -m venv venv
        .\venv\Scripts\activate
        ```

3.  **Install backend dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Environment Variables (Important for Production):**
    The API keys for Helius and Moralis are currently hardcoded in `backend/api.py`. 

5.  **Run the backend server:**
    ```bash
    python api.py
    ```
    Alternatively, for development with auto-reloading:
    ```bash
    uvicorn api:app --reload
    ```
    The backend API will be accessible at `http://localhost:8000`.

## Frontend Setup

1.  **Navigate to the frontend directory (from the project root):**
    ```bash
    cd frontend
    ```

2.  **Install frontend dependencies:**
    ```bash
    npm install
    ```
    *(If you prefer using `yarn`, you can use `yarn install`)*

3.  **Environment Variables:**
    The frontend application expects the backend API to be running at `http://localhost:8000`. If your backend is running on a different URL, you may need to adjust the fetch requests in the frontend code (e.g., in `frontend/app/transactions/[wallet]/[follower]/page.tsx`).

4.  **Run the frontend development server:**
    ```bash
    npm run dev
    ```
    *(If you prefer using `yarn`, you can use `yarn dev`)*
    The frontend application will be accessible at `http://localhost:3000`.

## Running the Application

1.  Ensure the backend server is running (see Backend Setup).
2.  Ensure the frontend development server is running (see Frontend Setup).
3.  Open your web browser and navigate to `http://localhost:3000`.
4.  Enter a Solana wallet address and find the copy traders.

## Key Features

*   Fetches recent transactions for a given Solana wallet.
*   Filters transactions to identify potential memecoin purchases.
*   Retrieves swap data related to these purchases to find other wallets buying the same tokens shortly after.
*   Analyzes copy trading patterns based on frequency, speed, and breadth of copied trades.
*   Scores and categorizes potential follower wallets (High, Medium, Low Confidence).
*   Displays detailed copy transaction comparisons between the leader and follower.

## Tech Stack

*   **Backend:**
    *   Python
    *   FastAPI (Web framework)
    *   Pandas (Data analysis and manipulation)
    *   Requests (HTTP requests)
    *   Uvicorn (ASGI server)
*   **Frontend:**
    *   Next.js (React framework)
    *   React
    *   TypeScript
    *   Tailwind CSS (Styling)
*   **APIs:**
    *   Helius API (Solana transaction data)
    *   Moralis API (Solana token swap data)

## API Endpoints

The backend provides the following main API endpoints:

*   `POST /process-wallet`:
    *   **Request Body:** `{"wallet_address": "YOUR_WALLET_ADDRESS"}`
    *   **Description:** Initiates the full analysis pipeline for the given wallet address. This includes fetching transactions, filtering buys, fetching swaps, analyzing copy trades, and calculating follower scores.
    *   **Response:** A JSON object containing the analysis results, including follower scores and tier distribution.

*   `POST /get-copy-transactions`:
    *   **Request Body:** `{"target_wallet": "LEADER_WALLET_ADDRESS", "follower_wallet": "FOLLOWER_WALLET_ADDRESS"}`
    *   **Description:** Retrieves detailed transaction comparisons between a specified leader wallet and a follower wallet, showing the copied trades.
    *   **Response:** A list of copy transaction objects, each detailing the leader's buy, the follower's corresponding buy, and the delay.

*   `GET /`:
    *   **Description:** A health check endpoint for the API.
    *   **Response:** `{"status": "healthy", "message": "Copy Trader API is running"}`
