const ReverseAuction = artifacts.require("ReverseAuction");

module.exports = async function (deployer, network, accounts) {
  const N = 3; // Number of winners
  const M = 10; // Maximum bid amount in ether
  const duration = 5; // Auction duration in minutes
  const lockedAmount = N * M; // Total amount locked by the creator

  // Deploy the contract with constructor parameters
  await deployer.deploy(
    ReverseAuction,
    N,
    M,
    duration,
    { value: web3.utils.toWei(lockedAmount.toString(), "ether"), from: accounts[0] }
  );

  const instance = await ReverseAuction.deployed();
  console.log("ReverseAuction deployed at address:", instance.address);
};
