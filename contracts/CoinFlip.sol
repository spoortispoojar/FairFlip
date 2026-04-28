// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract CoinFlip {

    address public player1;
    address public player2;

    uint public betAmount;

    bytes32 public hash1;
    bytes32 public hash2;

    uint public secret1;
    uint public secret2;

    bool public revealed1;
    bool public revealed2;

    bool public gameEnded;

    uint public revealDeadline;

    uint public constant REVEAL_TIME = 2 minutes;

    // ------------------ JOIN GAME ------------------
    function joinGame() public payable {
        require(msg.value > 0, "Send ETH");

        if (player1 == address(0)) {
            player1 = msg.sender;
            betAmount = msg.value;
        } else {
            require(player2 == address(0), "Game full");
            require(msg.value == betAmount, "Equal bet required");
            player2 = msg.sender;
        }
    }

    // ------------------ COMMIT ------------------
    function commit(bytes32 _hash) public {
        require(msg.sender == player1 || msg.sender == player2, "Not a player");

        if (msg.sender == player1) {
            require(hash1 == 0, "Already committed");
            hash1 = _hash;
        } else {
            require(hash2 == 0, "Already committed");
            hash2 = _hash;
        }

        // Start reveal timer when both committed
        if (hash1 != 0 && hash2 != 0) {
            revealDeadline = block.timestamp + REVEAL_TIME;
        }
    }

    // ------------------ REVEAL ------------------
    function reveal(uint _secret) public {
        require(block.timestamp <= revealDeadline, "Reveal time over");
        require(msg.sender == player1 || msg.sender == player2, "Not a player");

        bytes32 computedHash = keccak256(abi.encodePacked(_secret));

        if (msg.sender == player1) {
            require(!revealed1, "Already revealed");
            require(computedHash == hash1, "Invalid secret");

            secret1 = _secret;
            revealed1 = true;
        } else {
            require(!revealed2, "Already revealed");
            require(computedHash == hash2, "Invalid secret");

            secret2 = _secret;
            revealed2 = true;
        }

        if (revealed1 && revealed2) {
            decideWinner();
        }
    }

    // ------------------ DECIDE WINNER ------------------
    function decideWinner() internal {
        require(!gameEnded, "Game ended");

        uint result = (secret1 + secret2) % 2;

        address winner;

        if (result == 0) {
            winner = player1;
        } else {
            winner = player2;
        }

        gameEnded = true;

        payable(winner).transfer(address(this).balance);
    }

    // ------------------ TIMEOUT ------------------
    function claimTimeout() public {
        require(block.timestamp > revealDeadline, "Still time left");
        require(!gameEnded, "Game ended");

        address winner;

        if (revealed1 && !revealed2) {
            winner = player1;
        } else if (revealed2 && !revealed1) {
            winner = player2;
        } else {
            revert("No valid winner");
        }

        gameEnded = true;

        payable(winner).transfer(address(this).balance);
    }
}