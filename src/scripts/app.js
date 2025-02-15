// This file contains JavaScript code to handle dynamic interactions on the blockchain browser website.

document.addEventListener('DOMContentLoaded', async function() {
    const urlParams = new URLSearchParams(window.location.search);
    let blockchainNetwork = urlParams.get('network') || 'FAB'; // Default to 'FAB' if not specified
    let apiUrl;

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
            setNetwork(selectedNetwork);
        });
    });

    document.querySelectorAll('.dropdown-content a').forEach(item => {
        item.addEventListener('click', () => {
            const network = item.getAttribute('data-network');
            const smartContractLink = document.getElementById('smart-contract-link');
            if (network === 'FAB' || network === 'FABTEST') {
                smartContractLink.style.display = 'inline';
            } else {
                smartContractLink.style.display = 'none';
            }
            item.parentElement.style.display = 'none';
        });
    });

    document.querySelector('.dropbtn').addEventListener('click', () => {
        const dropdownContent = document.querySelector('.dropdown-content');
        dropdownContent.style.display = dropdownContent.style.display === 'block' ? 'none' : 'block';
    });

    async function loadConfiguration() {
        try {
            const response = await fetch('./src/config/environment.json');
            const config = await response.json();
            const environment = config.environment; // Get the current environment (debug or production)
            apiUrl = config.apiServers[environment][blockchainNetwork];
            if (!apiUrl) {
                throw new Error(`API server not configured for ${blockchainNetwork} in ${environment} environment`);
            }
        } catch (error) {
            console.error('Error loading configuration:', error);
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
            default:
                logoImg.src = 'src/assets/fab-logo-o.png';
        }
    }

    // Initial load
    await loadConfiguration();
    updateLogo(blockchainNetwork);

    let currentBlockHeight = null;
    let initialBlockHeight = null;
    let isViewingLatestBlocks = true;

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

    // Function to load blocks
    async function loadBlocks(startBlockHeight) {
        const blocksTableBody = document.querySelector('#blocks-table tbody');
        const newRows = [];

        for (let i = 0; i < 20; i++) {
            const blockHeight = startBlockHeight - i;
            if (blockHeight < 1) break; // Ensure block height is not less than 1

            const blockData = await fetchBlockchainData(`block/${blockHeight}`);
            if (blockData) {
                const row = document.createElement('tr');
                const blockTime = new Date(blockData.time * 1000);
                const now = new Date();
                const timeDifference = now - blockTime;
                const oneDay = 24 * 60 * 60 * 1000;

                const formattedTime = timeDifference > oneDay
                    ? blockTime.toLocaleString()
                    : `${timeSince(blockTime)} ago`;

                row.innerHTML = `
                    <td><a href="src/block.html?blockNumber=${blockData.height}&network=${blockchainNetwork}">${blockData.height.toLocaleString()}</a></td>
                    <td>${formattedTime}</td>
                    <td>${blockData.tx.length}</td>
                    <td class="size">${blockData.size.toLocaleString()}</td>
                `;
                newRows.push(row);
            }
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
        if (chaintip) {
            currentBlockHeight = chaintip.blockNumber;
            initialBlockHeight = chaintip.blockNumber;
            loadBlocks(currentBlockHeight);
            //loadLatestTransactions();
        }
    }

    // Function to load the latest transactions
    async function loadLatestTransactions() {
        const latestTransactions = await fetchBlockchainData('latest-transactions');
        if (latestTransactions) {
            const transactionsList = document.getElementById('transactions-list');
            const newItems = [];

            latestTransactions.forEach(transaction => {
                const listItem = document.createElement('li');
                listItem.innerHTML = `<a href="transaction.html?txid=${transaction.txid}&network=${blockchainNetwork}">${transaction.txid}</a>`;
                newItems.push(listItem);
            });

            // Update the list without flashing
            transactionsList.innerHTML = '';
            newItems.forEach(item => transactionsList.appendChild(item));
        }
    }

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

    // Refresh the content every 5 seconds
    setInterval(() => {
        if (document.querySelector('#blocks-table') && isViewingLatestBlocks) {
            loadChainTip();
        }
    }, 1000);

    // Update the href attributes in the HTML
    function updateLinks() {
        document.getElementById('logo-link').href = `index.html?network=${blockchainNetwork}`;
        document.getElementById('top-addresses-link').href = `src/top-addresses.html?network=${blockchainNetwork}`;
        document.getElementById('smart-contract-link').href = `src/smartcontracts.html?network=${blockchainNetwork}`;
    }

    // Initial link update
    updateLinks();

    const smartContractLink = document.getElementById('smart-contract-link');
    const currentNetwork = document.getElementById('logo-img').getAttribute('data-network');

    // Show Smart Contract link if the current network is FAB or FABTEST
    if (currentNetwork === 'FAB' || currentNetwork === 'FABTEST') {
        smartContractLink.style.display = 'inline';
    }

    document.querySelectorAll('.dropdown-content a').forEach(item => {
        item.addEventListener('click', () => {
            const network = item.getAttribute('data-network');
            if (network === 'FAB' || network === 'FABTEST') {
                smartContractLink.style.display = 'inline';
            } else {
                smartContractLink.style.display = 'none';
            }
            item.parentElement.style.display = 'none';
        });
    });

    document.querySelector('.dropbtn').addEventListener('click', () => {
        const dropdownContent = document.querySelector('.dropdown-content');
        dropdownContent.style.display = dropdownContent.style.display === 'block' ? 'none' : 'block';
    });
});
