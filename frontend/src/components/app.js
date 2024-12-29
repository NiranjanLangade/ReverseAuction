import React, { useState, useEffect } from "react";
import Web3 from "web3";
import contractABI from "./ReverseAuctionABI.json"; // Place the ABI in the same folder

const CONTRACT_ADDRESS = "0xYourContractAddressHere";

const App = () => {
  const [web3, setWeb3] = useState(null);
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [auctionInfo, setAuctionInfo] = useState({});
  const [bidAmount, setBidAmount] = useState("");

  // Initialize Web3 and Contract
  useEffect(() => {
    const init = async () => {
      if (window.ethereum) {
        const web3Instance = new Web3(window.ethereum);
        setWeb3(web3Instance);

        await window.ethereum.request({ method: "eth_requestAccounts" });
        const accounts = await web3Instance.eth.getAccounts();
        setAccount(accounts[0]);

        const contractInstance = new web3Instance.eth.Contract(contractABI, CONTRACT_ADDRESS);
        setContract(contractInstance);

        const N = await contractInstance.methods.N().call();
        const M = web3Instance.utils.fromWei(await contractInstance.methods.M().call(), "ether");
        const endTime = await contractInstance.methods.auctionEndTime().call();

        setAuctionInfo({ N, M, endTime });
      } else {
        alert("MetaMask is not installed!");
      }
    };
    init();
  }, []);

  // Submit a Bid
  const submitBid = async () => {
    if (contract && web3) {
      const weiAmount = web3.utils.toWei(bidAmount, "ether");
      try {
        await contract.methods.bid().send({ from: account, value: weiAmount });
        alert("Bid submitted successfully!");
      } catch (error) {
        console.error("Error submitting bid:", error);
      }
    }
  };

  // End Auction
  const endAuction = async () => {
    if (contract) {
      try {
        await contract.methods.endAuction().send({ from: account });
        alert("Auction ended successfully!");
      } catch (error) {
        console.error("Error ending auction:", error);
      }
    }
  };

  return (
    <div style={{ fontFamily: "Arial, sans-serif", padding: "20px" }}>
      <h1>Reverse Auction</h1>
      {account && <p>Connected Account: {account}</p>}

      <h2>Auction Details</h2>
      <p>Number of Winners (N): {auctionInfo.N}</p>
      <p>Maximum Bid Amount (M): {auctionInfo.M} ETH</p>
      <p>Auction Ends At: {new Date(auctionInfo.endTime * 1000).toLocaleString()}</p>

      <hr />

      <h2>Submit a Bid</h2>
      <input
        type="text"
        placeholder="Enter bid amount in ETH"
        value={bidAmount}
        onChange={(e) => setBidAmount(e.target.value)}
      />
      <button onClick={submitBid} style={{ marginLeft: "10px" }}>
        Submit Bid
      </button>

      <hr />

      <h2>End Auction</h2>
      <button onClick={endAuction}>End Auction</button>
    </div>
  );
};

export default App;
