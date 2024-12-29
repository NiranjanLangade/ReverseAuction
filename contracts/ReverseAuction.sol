// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ReverseAuction {
    address public auctionCreator;
    uint public maxBidAmount;
    uint public numberOfWinners;
    uint public auctionEndTime;
    uint public totalLockedAmount;

    struct Bid {
        address bidder;
        uint amount;
    }

    Bid[] public bids;
    mapping(address => bool) public hasBid;

    event AuctionCreated(address creator, uint numberOfWinners, uint maxBidAmount, uint endTime);
    event BidSubmitted(address bidder, uint amount);
    event WinnersSelected(address[] winners, uint reward);
    event RemainingFundsReturned(address creator, uint amount);

    modifier onlyCreator() {
        require(msg.sender == auctionCreator, "Only the auction creator can perform this action");
        _;
    }

    modifier auctionActive() {
        require(block.timestamp <= auctionEndTime, "Auction has ended");
        _;
    }

    constructor(uint _numberOfWinners, uint _maxBidAmount, uint _durationInMinutes) payable {
        require(_numberOfWinners > 0, "Number of winners must be greater than 0");
        require(_maxBidAmount > 0, "Max bid amount must be greater than 0");
        require(msg.value >= _numberOfWinners * _maxBidAmount, "Insufficient funds locked for the auction");

        auctionCreator = msg.sender;
        numberOfWinners = _numberOfWinners;
        maxBidAmount = _maxBidAmount;
        auctionEndTime = block.timestamp + (_durationInMinutes * 1 minutes);
        totalLockedAmount = msg.value;

        emit AuctionCreated(auctionCreator, numberOfWinners, maxBidAmount, auctionEndTime);
    }

    function submitBid() external payable auctionActive {
        require(msg.value <= maxBidAmount, "Bid exceeds max bid amount");
        require(!hasBid[msg.sender], "You have already submitted a bid");

        bids.push(Bid({
            bidder: msg.sender,
            amount: msg.value
        }));
        hasBid[msg.sender] = true;

        emit BidSubmitted(msg.sender, msg.value);
    }

    function selectWinners() external onlyCreator {
        require(block.timestamp > auctionEndTime, "Auction is still ongoing");
        require(bids.length >= numberOfWinners, "Not enough bids to select winners");

        // Sort bids by amount (ascending order)
        for (uint i = 0; i < bids.length; i++) {
            for (uint j = i + 1; j < bids.length; j++) {
                if (bids[i].amount > bids[j].amount) {
                    Bid memory temp = bids[i];
                    bids[i] = bids[j];
                    bids[j] = temp;
                }
            }
        }

        address[] memory winners = new address[](numberOfWinners);
        uint reward = bids[numberOfWinners - 1].amount;

        // Distribute rewards to winners
        for (uint i = 0; i < numberOfWinners; i++) {
            winners[i] = bids[i].bidder;
            payable(bids[i].bidder).transfer(reward);
        }

        // Return remaining funds to the creator
        uint remainingFunds = totalLockedAmount - (reward * numberOfWinners);
        if (remainingFunds > 0) {
            payable(auctionCreator).transfer(remainingFunds);
        }

        emit WinnersSelected(winners, reward);
        emit RemainingFundsReturned(auctionCreator, remainingFunds);
    }
}
