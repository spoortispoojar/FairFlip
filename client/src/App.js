import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './App.css';
import { contractAddress, getContractInstance, hashSecret } from './contract';

function App() {
  // State management
  const [account, setAccount] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  // Game state
  const [secret, setSecret] = useState('');
  const [revealSecret, setRevealSecret] = useState('');

  // Contract state
  const [betAmount, setBetAmount] = useState('0');
  const [player1, setPlayer1] = useState(null);
  const [player2, setPlayer2] = useState(null);
  const [revealed1, setRevealed1] = useState(false);
  const [revealed2, setRevealed2] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [statusType, setStatusType] = useState(''); // 'success', 'error', 'info'
  const [winner, setWinner] = useState(null);

  // Auto-connect to MetaMask on component mount
  useEffect(() => {
    const autoConnect = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({
            method: 'eth_accounts',
          });
          if (accounts.length > 0) {
            await initializeWallet(accounts[0]);
          }
        } catch (error) {
          console.error('Auto-connect error:', error);
        }
      }
    };
    autoConnect();
  }, []);

  // Listen for account changes
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          initializeWallet(accounts[0]);
        } else {
          disconnectWallet();
        }
      });

      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      }
    };
  }, []);

  /**
   * Initialize wallet connection
   */
  const initializeWallet = async (accountAddress) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const newSigner = await provider.getSigner();
      const contractInstance = getContractInstance(newSigner);

      setAccount(accountAddress);
      setSigner(newSigner);
      setContract(contractInstance);
      setIsConnected(true);

      showStatus('Wallet connected successfully!', 'success');
      await fetchGameStatus(contractInstance);
    } catch (error) {
      console.error('Wallet initialization error:', error);
      showStatus('Failed to initialize wallet', 'error');
    }
  };

  /**
   * Connect MetaMask wallet
   */
  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        showStatus('MetaMask is not installed', 'error');
        return;
      }

      setLoading(true);
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts && accounts.length > 0) {
        await initializeWallet(accounts[0]);
      }
    } catch (error) {
      console.error('Connect wallet error:', error);
      if (error.code === 4001) {
        showStatus('User rejected wallet connection', 'error');
      } else {
        showStatus('Failed to connect wallet', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Disconnect wallet
   */
  const disconnectWallet = () => {
    setAccount(null);
    setSigner(null);
    setContract(null);
    setIsConnected(false);
    setWinner(null);
    showStatus('Wallet disconnected', 'info');
  };

  /**
   * Fetch current game status from contract
   */
  const fetchGameStatus = async (contractInstance) => {
    try {
      const [betAmountData, p1, p2, rev1, rev2, ended] = await Promise.all([
        contractInstance.betAmount(),
        contractInstance.player1(),
        contractInstance.player2(),
        contractInstance.revealed1(),
        contractInstance.revealed2(),
        contractInstance.gameEnded(),
      ]);

      setBetAmount(ethers.formatEther(betAmountData));
      setPlayer1(p1);
      setPlayer2(p2);
      setRevealed1(rev1);
      setRevealed2(rev2);
      setGameEnded(ended);
    } catch (error) {
      console.error('Error fetching game status:', error);
    }
  };

  /**
   * Join the game (payable function)
   */
  const joinGame = async () => {
    try {
      if (!contract) {
        showStatus('Contract not initialized', 'error');
        return;
      }

      setLoading(true);
      showStatus('Joining game...', 'info');

      // Send transaction with the bet amount
      const tx = await contract.joinGame({
        value: ethers.parseEther(betAmount),
      });
      
      showStatus('Transaction sent, waiting for confirmation...', 'info');
      await tx.wait();

      showStatus('Successfully joined the game!', 'success');
      await fetchGameStatus(contract);
    } catch (error) {
      console.error('Join game error:', error);
      showStatus(`Error joining game: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Commit a move (hash of secret number)
   */
  const commitMove = async () => {
    try {
      if (!contract) {
        showStatus('Contract not initialized', 'error');
        return;
      }

      if (!secret || secret.trim() === '') {
        showStatus('Please enter a secret number', 'error');
        return;
      }

      setLoading(true);
      showStatus('Creating commit hash...', 'info');

      // Hash the secret number using keccak256
      const commitHash = ethers.keccak256(
        ethers.toBeHex(ethers.toBigInt(secret), 32)
      );

      showStatus('Submitting commit...', 'info');
      const tx = await contract.commit(commitHash);

      showStatus('Transaction sent, waiting for confirmation...', 'info');
      await tx.wait();

      showStatus('Move committed successfully!', 'success');
      setSecret('');
      await fetchGameStatus(contract);
    } catch (error) {
      console.error('Commit move error:', error);
      showStatus(`Error committing move: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Reveal the move (secret number only)
   */
  const revealMove = async () => {
    try {
      if (!contract) {
        showStatus('Contract not initialized', 'error');
        return;
      }

      if (!revealSecret || revealSecret.trim() === '') {
        showStatus('Please enter the secret from commit', 'error');
        return;
      }

      setLoading(true);
      showStatus('Submitting reveal...', 'info');

      // Convert secret to uint256 for the reveal call
      const secretBN = ethers.toBigInt(revealSecret);
      const tx = await contract.reveal(secretBN);

      showStatus('Transaction sent, waiting for confirmation...', 'info');
      await tx.wait();

      showStatus('Move revealed successfully!', 'success');
      setRevealSecret('');
      await fetchGameStatus(contract);
      await checkWinner();
    } catch (error) {
      console.error('Reveal move error:', error);
      showStatus(`Error revealing move: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Check and display the winner
   */
  const checkWinner = async () => {
    try {
      if (!contract) {
        showStatus('Contract not initialized', 'error');
        return;
      }

      setLoading(true);
      const ended = await contract.gameEnded();

      if (!ended) {
        showStatus('Game is still in progress. Both players need to reveal.', 'info');
        setWinner(null);
        return;
      }

      // Game has ended, determine winner based on contract state
      const rev1 = await contract.revealed1();
      const rev2 = await contract.revealed2();

      let winnerMsg = '';
      if (rev1 && rev2) {
        // Both revealed - need to check contract logic for winner determination
        // This would typically be encoded in the contract or determined from the secrets
        winnerMsg = 'Game ended! Check the contract state for winner.';
      } else if (rev1 && !rev2) {
        winnerMsg = 'Player 1 wins (Player 2 failed to reveal)!';
        setWinner(player1);
      } else if (rev2 && !rev1) {
        winnerMsg = 'Player 2 wins (Player 1 failed to reveal)!';
        setWinner(player2);
      } else {
        winnerMsg = 'No valid moves revealed.';
      }

      showStatus(winnerMsg, 'success');
    } catch (error) {
      console.error('Error checking winner:', error);
      showStatus('Could not determine game status', 'info');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Show status message
   */
  const showStatus = (message, type) => {
    setStatus(message);
    setStatusType(type);

    // Auto-clear status after 5 seconds
    setTimeout(() => {
      if (type !== 'error') {
        setStatus('');
        setStatusType('');
      }
    }, 5000);
  };

  return (
    <div className="container">
      <header className="header">
        <h1>⚡ Coin Flip DApp</h1>
        <p>A fair, transparent coin flip game on blockchain</p>
      </header>

      <main className="main">
        {/* Wallet Connection Section */}
        <div className="card">
          <h2>Wallet Connection</h2>
          {!isConnected ? (
            <button
              className="btn btn-primary"
              onClick={connectWallet}
              disabled={loading}
            >
              {loading ? 'Connecting...' : 'Connect MetaMask'}
            </button>
          ) : (
            <div className="wallet-info">
              <p>
                <strong>Connected Account:</strong>
              </p>
              <p className="account">{account}</p>
              <button
                className="btn btn-secondary"
                onClick={disconnectWallet}
              >
                Disconnect Wallet
              </button>
            </div>
          )}
        </div>

        {/* Status Messages */}
        {status && (
          <div className={`status status-${statusType}`}>
            {status}
          </div>
        )}

        {/* Game Status */}
        {isConnected && (
          <div className="card">
            <h3>Game Status</h3>
            <div className="game-info">
              <p>
                <strong>Bet Amount:</strong> {betAmount} ETH
              </p>
              <p>
                <strong>Player 1:</strong> {player1 ? `${player1.substring(0, 6)}...${player1.substring(38)}` : 'Not joined'}
              </p>
              <p>
                <strong>Player 2:</strong> {player2 ? `${player2.substring(0, 6)}...${player2.substring(38)}` : 'Not joined'}
              </p>
              <p>
                <strong>Player 1 Revealed:</strong> {revealed1 ? '✅ Yes' : '❌ No'}
              </p>
              <p>
                <strong>Player 2 Revealed:</strong> {revealed2 ? '✅ Yes' : '❌ No'}
              </p>
              <p>
                <strong>Game Ended:</strong> {gameEnded ? '✅ Yes' : '❌ No'}
              </p>
            </div>
          </div>
        )}

        {isConnected && (
          <>
            {/* Join Game Section */}
            <div className="card">
              <h2>Join Game</h2>
              <p>
                Send {betAmount} ETH to join the game and play against another player.
              </p>
              <button
                className="btn btn-primary"
                onClick={joinGame}
                disabled={loading || gameEnded}
              >
                {loading ? 'Joining...' : `Join Game (${betAmount} ETH)`}
              </button>
            </div>

            {/* Commit Move Section */}
            <div className="card">
              <h2>Commit Your Move</h2>
              <p>
                Enter a secret number. The hash of this number will be submitted on-chain.
                Keep this secret safe - you'll need it to reveal later!
              </p>

              <div className="form-group">
                <label htmlFor="secret">Secret Number:</label>
                <input
                  id="secret"
                  type="number"
                  placeholder="Enter a secret number (e.g., 12345)"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  disabled={loading}
                  className="input"
                />
              </div>

              <button
                className="btn btn-primary"
                onClick={commitMove}
                disabled={loading || !isConnected}
              >
                {loading ? 'Committing...' : 'Commit Move'}
              </button>
            </div>

            {/* Reveal Move Section */}
            <div className="card">
              <h2>Reveal Your Move</h2>
              <p>
                Enter the same secret number from the commit phase to reveal your move.
              </p>

              <div className="form-group">
                <label htmlFor="revealSecret">Secret Number (from commit):</label>
                <input
                  id="revealSecret"
                  type="number"
                  placeholder="Enter the same secret number"
                  value={revealSecret}
                  onChange={(e) => setRevealSecret(e.target.value)}
                  disabled={loading}
                  className="input"
                />
              </div>

              <button
                className="btn btn-primary"
                onClick={revealMove}
                disabled={loading || !isConnected}
              >
                {loading ? 'Revealing...' : 'Reveal Move'}
              </button>
            </div>

            {/* Game Result Section */}
            <div className="card">
              <h2>Game Result</h2>
              <button
                className="btn btn-success"
                onClick={checkWinner}
                disabled={loading}
              >
                {loading ? 'Checking...' : 'Check Game Result'}
              </button>

              {winner && (
                <div className="winner-display">
                  <p className="winner-text">🏆 Winner Found!</p>
                  <p className="winner-address">{winner}</p>
                </div>
              )}
            </div>
          </>
        )}

        {!isConnected && (
          <div className="card info-card">
            <p>👆 Connect your MetaMask wallet to start playing</p>
          </div>
        )}
      </main>

      <footer className="footer">
        <p>Contract Address: {contractAddress}</p>
        <p>
          Ensure both players commit and reveal their moves within the deadline to determine the winner.
        </p>
      </footer>
    </div>
  );
}

export default App;
