// This file contains JavaScript code to handle dynamic interactions on the blockchain browser website.

document.addEventListener('DOMContentLoaded', async function() {
    const urlParams = new URLSearchParams(window.location.search);
    let blockchainNetwork = urlParams.get('network') || 'KANBAN'; // Default to 'FAB' if not specified
    let apiUrl;
    let currentBlockHeight = null;
    let initialBlockHeight = null;
    let isViewingLatestBlocks = true;
    let previousChaintip = null;
    let currentTransactionPage = 1; // Track the current page for transactions
    const transactionsPageSize = 20; // Number of transactions per page

    // Function to set the network based on dropdown selection
    function setNetwork(network) {
        console.log('Network selected:', network);
        blockchainNetwork = network;
        loadConfiguration();
        updateLogo(network);
        updateLinks();
    }

    // Add event listeners to dropdown items
    document.querySelectorAll('.dropdown-content a').forEach(item => {
        item.addEventListener('click', event => {
            const selectedNetwork = event.target.getAttribute('data-network');
            const smartContractLink = document.getElementById('smart-contract-link');
            if (selectedNetwork === 'FAB' || selectedNetwork === 'FABTEST') {
                smartContractLink.style.display = 'inline';
            } else {
                smartContractLink.style.display = 'none';
            }
            item.parentElement.style.display = 'none';
            const searchnetwork = document.getElementById('search-network');
            searchnetwork.value = selectedNetwork;
            setNetwork(selectedNetwork);
            loadChainTip();

            // Navigate to kanban.html if KANBAN is selected
            if (selectedNetwork === 'KANBAN') {
                window.location.href = 'kanban.html';
            } else {
                window.location.href = 'index.html?network=' + selectedNetwork;
            }
        });

        item.addEventListener('touchend', event => {
            event.preventDefault(); // Prevent the default touch behavior
            const selectedNetwork = event.target.getAttribute('data-network');
            const smartContractLink = document.getElementById('smart-contract-link');
            if (selectedNetwork === 'FAB' || selectedNetwork === 'FABTEST') {
                smartContractLink.style.display = 'inline';
            } else {
                smartContractLink.style.display = 'none';
            }
            item.parentElement.style.display = 'none';
            const searchnetwork = document.getElementById('search-network');
            searchnetwork.value = selectedNetwork;
            setNetwork(selectedNetwork);
            loadChainTip();

            // Navigate to kanban.html if KANBAN is selected
            if (selectedNetwork === 'KANBAN') {
                window.location.href = 'kanban.html';
            } else {
                window.location.href = 'index.html?network=' + selectedNetwork;
            }
        });
    });

    const toggleDropdown = (event) => {
        event.preventDefault(); // Prevent the default touch behavior
        const dropdownContent = document.querySelector('.dropdown-content');
        dropdownContent.style.display = dropdownContent.style.display === 'block' ? 'none' : 'block';
    };

    document.querySelector('.dropbtn').addEventListener('click', toggleDropdown);
    document.querySelector('.dropbtn').addEventListener('touchend', toggleDropdown);

    async function loadConfiguration() {
        try {
            const response = await fetch('./src/config/environment.json');
            const config = await response.json();
            const environment = config.environment; // Get the current environment (debug or production)
            apiUrl = config.apiServers[environment][blockchainNetwork];
            if (!apiUrl) {
                throw new Error(`API server not configured for ${blockchainNetwork} in ${environment} environment`);
            }
            previousChaintip = null;
        } catch (error) {
            //console.error('Error loading configuration:', error);
            return;
        }
    }

    // Function to update the logo based on the selected network
    function updateLogo(network) {
        const logoImg = document.getElementById('logo-img');
        switch (network) {
            case 'FAB':
                logoImg.src = 'src/assets/fab-logo-o.png';
                break;
            case 'LTC':
                logoImg.src = 'src/assets/ltc-logo.png';
                break;
            case 'DOGE':
                logoImg.src = 'src/assets/doge-logo.png';
                break;
            case 'BCH':
                logoImg.src = 'src/assets/bch-logo.png';
                break;
            case 'FABTEST':
                logoImg.src = 'src/assets/fab-logo-t.png';
                break;
            case 'KANBAN':
                logoImg.src = 'src/assets/kanban.png';
                break;    
            default:
                logoImg.src = 'src/assets/fab-logo-o.png';
        }
    }

    // Initial load
    await loadConfiguration();
    updateLogo(blockchainNetwork);

    // Function to fetch blockchain data
    async function fetchBlockchainData(endpoint) {
        try {
            const response = await fetch(`${apiUrl}${blockchainNetwork}/${endpoint}`);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }

    // Function to calculate elapsed time
    function timeSince(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        let interval = Math.floor(seconds / 31536000);

        if (interval > 1) {
            return interval + " yr";
        }
        interval = Math.floor(seconds / 2592000);
        if (interval > 1) {
            return interval + " mon";
        }
        interval = Math.floor(seconds / 86400);
        if (interval > 1) {
            return interval + " day";
        }
        interval = Math.floor(seconds / 3600);
        if (interval > 1) {
            return interval + " hr";
        }
        interval = Math.floor(seconds / 60);
        if (interval > 1) {
            return interval + " min";
        }
        return Math.floor(seconds) + " sec";
    }

    // Function to update block times
    function updateBlockTimes() {
        const rows = document.querySelectorAll('#blocks-table tbody tr');
        rows.forEach(row => {
            const timeCell = row.cells[1];
            const blockTime = new Date(timeCell.getAttribute('data-time') * 1000);
            const now = new Date();
            const timeDifference = now - blockTime;
            const oneDay = 24 * 60 * 60 * 1000;

            const formattedTime = timeDifference > oneDay
                ? blockTime.toLocaleString()
                : `${timeSince(blockTime)} ago`;

            timeCell.textContent = formattedTime;
        });
    }

    // Function to load blocks
    async function loadBlocks(startBlockHeight) {
        const blocksTableBody = document.querySelector('#blocks-table tbody');
        const newRows = [];

        // Fetch a batch of blocks using the blockheaders endpoint
        const endBlockHeight = Math.max(startBlockHeight - 19, 1);
        const blockDataBatch = await fetchBlockchainData(`blocks?start=${startBlockHeight}&end=${endBlockHeight}`);

        if (blockDataBatch) {
            blockDataBatch.forEach(blockData => {
                const row = document.createElement('tr');
                const blockTime = new Date(parseInt(blockData.timestamp, 16) * 1000);
                const now = new Date();
                const timeDifference = now - blockTime;
                const oneDay = 24 * 60 * 60 * 1000;

                const formattedTime = timeDifference > oneDay
                    ? blockTime.toLocaleString()
                    : `${timeSince(blockTime)} ago`;
                row.innerHTML = `
                    <td><a href="src/kbblock.html?blockNumber=${parseInt(blockData.number,16)}&network=${blockchainNetwork}">${parseInt(blockData.number,16).toLocaleString()}</a></td>
                    <td data-time="${blockData.timestamp}">${formattedTime}</td>
                    <td>${blockData.transactions.length}</td>
                    <td class="size">${parseInt(blockData.size,16).toLocaleString()}</td>
                `;
                newRows.push(row);
            });
        }

        // Update the table without flashing
        blocksTableBody.innerHTML = '';
        newRows.forEach(row => blocksTableBody.appendChild(row));

        // Show or hide the "Prev" button based on the current block height
        const prevButton = document.getElementById('prev-button');
        if (currentBlockHeight >= initialBlockHeight) {
            prevButton.style.display = 'none';
        } else {
            prevButton.style.display = 'inline-block';
        }
    }

    // Function to load the latest 20 blocks
    async function loadChainTip() {
        const chaintip = await fetchBlockchainData('latest-block');
        if (chaintip && chaintip.blockNumber !== previousChaintip) {
            currentBlockHeight = chaintip.blockNumber;
            initialBlockHeight = chaintip.blockNumber;
            loadBlocks(currentBlockHeight);
            previousChaintip = chaintip.blockNumber;
            loadLatestTransactions();
        }
    }

    // Function to load the latest transactions with pagination
    async function loadLatestTransactions(page = 1) {
        try {
            const transactionsData = await fetchBlockchainData(`latesttxs?page=${page}&pageSize=${transactionsPageSize}`);
            const transactionsList = document.getElementById('transactions-list');
            if (!transactionsList) {
                console.error('Error: #transactions-list element not found in the DOM.');
                return;
            }
            transactionsList.innerHTML = transactionsData.map(tx => `
                <tr>
                    <td>
                        <a href="src/kbtransaction.html?txid=${tx.txHash}&network=${blockchainNetwork}">
                            ${tx.txHash.slice(0, 8)}...${tx.txHash.slice(-6)}
                        </a>
                    </td>
                    <td>
                        <a href="src/kbblock.html?blockNumber=${tx.blockNumber}&network=${blockchainNetwork}">
                            ${tx.blockNumber.toLocaleString()}
                        </a>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Error fetching latest transactions:', error);
        }

        // Show or hide the "Prev" button based on the current block height
        const prevButton = document.getElementById('prev-transactions-button');
        if (currentTransactionPage == 1) {
            prevButton.style.display = 'none';
        } else {
            prevButton.style.display = 'inline-block';
        }
    }

    // Event listeners for transaction pagination
    document.getElementById('next-transactions-button').addEventListener('click', function () {
        currentTransactionPage++;
        loadLatestTransactions(currentTransactionPage);
    });

    document.getElementById('prev-transactions-button').addEventListener('click', function () {
        if (currentTransactionPage > 1) {
            currentTransactionPage--;
            loadLatestTransactions(currentTransactionPage);
        }
    });

    // Load the latest blocks on the homepage
    if (document.querySelector('#blocks-table')) {
        loadChainTip();
    }

    // Event listener for the "Next" button
    document.getElementById('next-button').addEventListener('click', function() {
        if (currentBlockHeight !== null) {
            currentBlockHeight -= 20;
            isViewingLatestBlocks = false;
            loadBlocks(currentBlockHeight);
        }
    });

    // Event listener for the "Prev" button
    document.getElementById('prev-button').addEventListener('click', function() {
        if (currentBlockHeight !== null && currentBlockHeight + 20 <= initialBlockHeight) {
            currentBlockHeight += 20;
            isViewingLatestBlocks = false;
            loadBlocks(currentBlockHeight);
        }
    });

    // Refresh the block times every second
    setInterval(() => {
        if (document.querySelector('#blocks-table')) {
            updateBlockTimes();
        }
    }, 1000);

    // Check the chaintip every 2 seconds
    setInterval(() => {
        if (document.querySelector('#blocks-table') && isViewingLatestBlocks) {
            loadChainTip();
        }
    }, 2000);

    // Update the href attributes in the HTML
    function updateLinks() {
        document.getElementById('logo-link').href = `kanban.html?network=${blockchainNetwork}`;
        document.getElementById('top-addresses-link').href = `src/top-addresses.html?network=${blockchainNetwork}`;
        document.getElementById('smart-contract-link').href = `src/kbsmartcontracts.html?network=${blockchainNetwork}`;
    }

    // Initial link update
    updateLinks();

    // Show Smart Contract link if the current network is FAB or FABTEST
    if (blockchainNetwork === 'FAB' || blockchainNetwork === 'FABTEST' || blockchainNetwork === 'KANBAN') {
        const smartContractLink = document.getElementById('smart-contract-link');
        smartContractLink.style.display = 'inline';
    } else {
        const smartContractLink = document.getElementById('smart-contract-link');
        smartContractLink.style.display = 'none';
    }

    document.querySelector('.dropbtn').addEventListener('click', toggleDropdown);
    document.querySelector('.dropbtn').addEventListener('touchend', toggleDropdown);
});
