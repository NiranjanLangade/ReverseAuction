const ReverseAuction = artifacts.require("ReverseAuction");
const { expectRevert, time } = require("@openzeppelin/test-helpers");

contract("ReverseAuction", (accounts) => {
  const [creator, bidder1, bidder2, bidder3] = accounts;

  const N = 2; // Number of winners
  const M = 5; // Maximum bid amount in ether
  const duration = 1; // Duration in minutes

  let auction;

  beforeEach(async () => {
    // Deploy the contract
    auction = await ReverseAuction.new(
      N,
      M,
      duration,
      { from: creator, value: web3.utils.toWei((N * M).toString(), "ether") }
    );
  });

  it("should initialize correctly", async () => {
    const creatorAddress = await auction.creator();
    assert.equal(creatorAddress, creator, "Creator address is incorrect");

    const maxBid = await auction.M();
    assert.equal(maxBid.toString(), web3.utils.toWei(M.toString(), "ether"), "Max bid amount is incorrect");

    const lockedAmount = await auction.lockedAmount();
    assert.equal(lockedAmount.toString(), web3.utils.toWei((N * M).toString(), "ether"), "Locked amount is incorrect");
  });

  it("should allow whitelisting", async () => {
    await auction.whitelistAddress(bidder1, { from: creator });
    const isWhitelisted = await auction.whitelist(bidder1);
    assert.isTrue(isWhitelisted, "Whitelisting failed");
  });

  it("should accept valid bids", async () => {
    await auction.bid({ from: bidder1, value: web3.utils.toWei("3", "ether") });
    const bids = await auction.getBids();
    assert.equal(bids.length, 1, "Bid was not recorded");
    assert.equal(bids[0].bidder, bidder1, "Bidder address is incorrect");
    assert.equal(bids[0].amount, web3.utils.toWei("3", "ether"), "Bid amount is incorrect");
  });

  it("should reject bids above the maximum amount", async () => {
    await expectRevert(
      auction.bid({ from: bidder1, value: web3.utils.toWei("6", "ether") }),
      "Bid exceeds maximum amount"
    );
  });

  it("should sort bids correctly on endAuction", async () => {
    await auction.bid({ from: bidder1, value: web3.utils.toWei("3", "ether") });
    await auction.bid({ from: bidder2, value: web3.utils.toWei("2", "ether") });
    await auction.bid({ from: bidder3, value: web3.utils.toWei("1", "ether") });

    await time.increase(time.duration.minutes(duration + 1));

    const tx = await auction.endAuction({ from: creator });

    const event = tx.logs.find((e) => e.event === "WinnersAnnounced");
    const winners = event.args.winners;

    assert.equal(winners.length, N, "Incorrect number of winners");
    assert.equal(winners[0], bidder3, "First winner is incorrect");
    assert.equal(winners[1], bidder2, "Second winner is incorrect");
  });

  it("should refund remaining locked funds to the creator", async () => {
    await auction.bid({ from: bidder1, value: web3.utils.toWei("3", "ether") });
    await auction.bid({ from: bidder2, value: web3.utils.toWei("2", "ether") });

    const creatorInitialBalance = web3.utils.toBN(await web3.eth.getBalance(creator));

    await time.increase(time.duration.minutes(duration + 1));
    await auction.endAuction({ from: creator });

    const creatorFinalBalance = web3.utils.toBN(await web3.eth.getBalance(creator));

    assert.isTrue(creatorFinalBalance.gt(creatorInitialBalance), "Creator did not receive remaining funds");
  });

  it("should allow auction cancellation", async () => {
    await auction.bid({ from: bidder1, value: web3.utils.toWei("3", "ether") });
    const bidder1InitialBalance = web3.utils.toBN(await web3.eth.getBalance(bidder1));

    await auction.cancelAuction({ from: creator });

    const bidder1FinalBalance = web3.utils.toBN(await web3.eth.getBalance(bidder1));
    assert.isTrue(bidder1FinalBalance.gt(bidder1InitialBalance), "Bidder was not refunded");
  });

  it("should prevent bids after the auction ends", async () => {
    await time.increase(time.duration.minutes(duration + 1));
    await expectRevert(
      auction.bid({ from: bidder1, value: web3.utils.toWei("3", "ether") }),
      "Auction already ended"
    );
  });
});
