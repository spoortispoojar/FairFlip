async function connectWallet() {
  if (window.ethereum) {
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    console.log("Connected account:", accounts[0]);
    await initContract();   // 👈 important
  } else {
    alert("Install MetaMask");
  }
}

let contract;

async function initContract() {
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();

  const contractAddress = "0x0000000000000000000000000000000000000000";
  const abi = [];

  contract = new ethers.Contract(contractAddress, abi, signer);
}

async function commitMove() {
  const secret = document.getElementById("secret").value;
  console.log("Commit with secret:", secret);
}

async function revealMove() {
  const choice = document.getElementById("choice").value;
  const secret = document.getElementById("secret").value;
  console.log("Reveal with:", choice, secret);
}