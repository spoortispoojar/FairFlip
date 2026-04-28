import { useState } from "react";
import { ethers } from "ethers";

const contractAddress = "0x5afdbc1bf61604325c922ca872c88b64ed6b3608";

const abi = [
  {
    inputs: [],
    name: "joinGame",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes32", name: "_hash", type: "bytes32" }],
    name: "commit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_secret", type: "uint256" }],
    name: "reveal",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

function App() {
  const [account, setAccount] = useState("");
  const [contract, setContract] = useState(null);
  const [eth, setEth] = useState("");
  const [number, setNumber] = useState("");
  const [secret, setSecret] = useState("");
  const [status, setStatus] = useState("");

  // 🔹 Connect Wallet
  async function connectWallet() {
    try {
      if (!window.ethereum) {
        alert("MetaMask not installed");
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      const contractInstance = new ethers.Contract(
        contractAddress,
        abi,
        signer
      );

      setAccount(address);
      setContract(contractInstance);
      setStatus("Wallet connected");
    } catch (err) {
      console.log(err);
      setStatus("Wallet connection failed");
    }
  }

  // 🔹 Join Game
  async function joinGame() {
    try {
      if (!contract) {
        setStatus("Connect wallet first");
        return;
      }

      if (!eth || eth.trim() === "") {
        setStatus("Enter ETH amount");
        return;
      }

      const tx = await contract.joinGame({
        value: ethers.parseEther(eth),
      });

      await tx.wait();
      setStatus("Joined game successfully");
    } catch (err) {
      console.log(err);
      setStatus("Join failed");
    }
  }

  // 🔹 Commit
  async function commit() {
    try {
      if (!contract) {
        setStatus("Connect wallet first");
        return;
      }

      if (!number || !secret) {
        setStatus("Enter number and secret");
        return;
      }

      const hash = ethers.keccak256(
        ethers.solidityPacked(["uint256", "string"], [number, secret])
      );

      const tx = await contract.commit(hash);
      await tx.wait();

      setStatus("Committed successfully");
    } catch (err) {
      console.log(err);
      setStatus("Commit failed");
    }
  }

  // 🔹 Reveal
  async function reveal() {
    try {
      if (!contract) {
        setStatus("Connect wallet first");
        return;
      }

      if (!number) {
        setStatus("Enter number");
        return;
      }

      const tx = await contract.reveal(number);
      await tx.wait();

      setStatus("Revealed successfully");
    } catch (err) {
      console.log(err);
      setStatus("Reveal failed");
    }
  }

  return (
    <div style={{ padding: "20px" }}>
      <h2>🎲 Dice Game</h2>

      <button onClick={connectWallet}>Connect Wallet</button>
      <p>{account}</p>

      <h3>Join Game</h3>
      <input
        placeholder="Enter ETH"
        value={eth}
        onChange={(e) => setEth(e.target.value)}
      />
      <button onClick={joinGame}>Join</button>

      <h3>Commit</h3>
      <input
        placeholder="Enter Number"
        value={number}
        onChange={(e) => setNumber(e.target.value)}
      />
      <input
        placeholder="Enter Secret"
        value={secret}
        onChange={(e) => setSecret(e.target.value)}
      />
      <button onClick={commit}>Commit</button>

      <h3>Reveal</h3>
      <button onClick={reveal}>Reveal</button>

      <h3>Status:</h3>
      <p>{status}</p>
    </div>
  );
}

export default App;