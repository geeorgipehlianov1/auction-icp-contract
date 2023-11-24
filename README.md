# Auctions Service

A simple DFINITY Canister smart contract for managing auctions.

## Features

- **Create Auctions:** Easily create new auctions with essential details.
- **Update Auctions:** Owners can update auction information.
- **End Auctions:** Owners can end auctions, marking them as inactive.
- **Retrieve Auctions:** Fetch auctions based on various criteria, such as ID, status, and owner.
- **Validation:** Ensure valid auction status before retrieval or creation.

## Usage

### Query Functions

1. **Get All Auctions:**
   - `/getAllAuctions`: Retrieve a list of all auctions.

2. **Get Auction by ID:**
   - `/getAuctionById/{auctionId}`: Retrieve details of a specific auction by ID.

3. **Get Owner's Auctions:**
   - `/getOwnersAuctions`: Retrieve auctions owned by the caller.

4. **Get Auctions by Status:**
   - `/getAuctionsByStatus/{status}`: Retrieve auctions with a specific status.

5. **Get Active Auctions:**
   - `/getActiveAuctions`: Retrieve auctions with an active status.

6. **Get Expired Auctions:**
   - `/getExpiredAuctions`: Retrieve auctions with an inactive status.

### Update Functions

7. **Create Auction:**
   - `/createAuction`: Create a new auction with provided details.

8. **Update Auction:**
   - `/updateAuction/{auctionId}`: Update details of an existing auction.

9. **End Auction:**
   - `/endAuction/{auctionId}`: End an auction, marking it as inactive.

10. **Delete Auction:**
    - `/deleteAuction/{auctionId}`: Delete an auction (owner only).

### Helper Function

11. **Is Auction Status Valid:**
    - **Function:** `isAuctionStatusValid(status: string)`
    - **Returns:** Boolean indicating whether the provided auction status is valid.
