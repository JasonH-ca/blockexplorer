bitcoin = require('bitcoinjs-lib');
document.addEventListener('DOMContentLoaded', async function() {
    const urlParams = new URLSearchParams(window.location.search);
    const blockchainNetwork = urlParams.get('network') || 'FAB'; // Default to 'FAB' if not specified
    let ticker;
    let apiUrl;
    let useBase58 = true;

    async function loadConfiguration() {
        try {
            const response = await fetch('./config/environment.json');
            const config = await response.json();
            const environment = config.environment; // Get the current environment (debug or production)
            apiUrl = config.apiServers[environment][blockchainNetwork];
            if (!apiUrl) {
                throw new Error(`API server not configured for ${blockchainNetwork} in ${environment} environment`);
            }
            updateLogo(blockchainNetwork)
            if (blockchainNetwork.endsWith("TEST")) {
                ticker = blockchainNetwork.slice(0, -4);
            } else {
                ticker = blockchainNetwork;
            }
        } catch (error) {
            console.error('Error loading configuration:', error);
            return;
        }
    }

    // Initial load
    await loadConfiguration();
    // Function to update the logo based on the selected network
    function updateLogo(network) {
        const logoImg = document.getElementById('logo-img');
        switch (network) {
            case 'FAB':
                logoImg.src = 'assets/fab-logo-o.png';
                break;
            case 'LTC':
                logoImg.src = 'assets/ltc-logo.png';
                break;
            case 'DOGE':
                logoImg.src = 'assets/doge-logo.png';
                break;
            case 'BCH':
                logoImg.src = 'assets/bch-logo.png';
                break;
            case 'FABTEST':
                logoImg.src = 'assets/fab-logo-t.png';
                break;
            default:
                logoImg.src = 'assets/fab-logo-o.png';
        }
    }

    let currentPage = 1;
    const pageSize = 20;

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

    // Function to convert address format
    function convertAddressFormat(address) {      
        if (!useBase58) {
            const decoded = bitcoin.address.fromBase58Check(address);
            return decoded.hash.toString('hex');
        } else {
            // Return Base58 format
            return address;
        }
    }

    // Function to load contracts
    async function loadContracts(page = 1, pageSize = 20) {
        const contractsData = await fetchBlockchainData(`contracts?page=${page}&pageSize=${pageSize}`);
        if (contractsData) {
            const contractsTableBody = document.querySelector('#contracts-table tbody');
            const rows = await Promise.all(contractsData.map(async address => {
                let addressTypeHtml = '';
                if (address.type && address.type !== '') {
                    addressTypeHtml = `<span class="address-type">${address.type ? ` ${address.type}` : ''}</span>`;
                }
                let infoHtml = '';
                if (address.symbol) {
                    infoHtml = `<span class="contract-info">${address.symbol}</span>`;
                }
                const shortTx = address.createtx.slice(0, 6) + '...' + address.createtx.slice(-6);
                const creationTxHtml = `<a href="transaction.html?txid=${address.createtx}&network=${blockchainNetwork}">${shortTx}</a>`;
                const formattedAddress = convertAddressFormat(address.address);
                let ownerHtml = '';
                if ( address.owner ) {
                    ownerHtml = `<a href="address.html?address=${address.owner}&network=${blockchainNetwork}">${address.owner}</a>`;
                }
                return `
                <tr>
                    <td class="address"><a href="address.html?address=${address.address}&network=${blockchainNetwork}">${formattedAddress}</a>${addressTypeHtml}</td>
                    <td class="info">${infoHtml}</td>
                    <td class="owner">${ownerHtml}</td>
                    <td class="creation-tx">${creationTxHtml}</td>
                </tr>
            `;
            }));
            contractsTableBody.innerHTML = rows.join('');
            updatePaginationControls(page, contractsData.length, pageSize);
        }
    }

    // Function to load FRC20 tokens
    async function loadFRC20Tokens(page = 1, pageSize = 20) {
        const frc20Data = await fetchBlockchainData(`frc20tokens?page=${page}&pageSize=${pageSize}`);
        if (frc20Data) {
            const frc20TableBody = document.querySelector('#frc20-table tbody');
            const rows = frc20Data.map(token => {
                const shortTx = token.createtx.slice(0, 6) + '...' + token.createtx.slice(-6);
                const creationTxHtml = `<a href="transaction.html?txid=${token.createtx}&network=${blockchainNetwork}">${shortTx}</a>`;
                const formattedAddress = convertAddressFormat(token.address);
                let ownerHtml = '';
                if ( token.owner ) {
                    ownerHtml = `<a href="address.html?address=${token.owner}&network=${blockchainNetwork}">${token.owner}</a>`;
                }
                return `
                <tr>
                    <td class="address"><a href="address.html?address=${token.address}&network=${blockchainNetwork}">${formattedAddress}</a></td>
                    <td class="symbol">${token.symbol}</td>
                    <td class="name">${token.name}</td>
                    <td class="owner">${ownerHtml}</td>
                    <td class="creation-tx">${creationTxHtml}</td>
                </tr>
            `;
            }).join('');
            frc20TableBody.innerHTML = rows;
            updateFRC20PaginationControls(page, frc20Data.length, pageSize);
        }
    }

    // Function to update pagination controls
    function updatePaginationControls(page, dataLength, pageSize) {
        const prevPageButton = document.getElementById('prev-page');
        const nextPageButton = document.getElementById('next-page');
        const pageInfo = document.getElementById('page-info');

        prevPageButton.disabled = page === 1;
        nextPageButton.disabled = dataLength < pageSize;
        pageInfo.textContent = `${page}`;
    }

    // Function to update FRC20 pagination controls
    function updateFRC20PaginationControls(page, dataLength, pageSize) {
        const prevPageButton = document.getElementById('frc20-prev-page');
        const nextPageButton = document.getElementById('frc20-next-page');
        const pageInfo = document.getElementById('frc20-page-info');

        prevPageButton.disabled = page === 1;
        nextPageButton.disabled = dataLength < pageSize;
        pageInfo.textContent = `${page}`;
    }

    // Event listeners for pagination buttons
    document.getElementById('prev-page').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            loadContracts(currentPage, pageSize);
        }
    });

    document.getElementById('next-page').addEventListener('click', () => {
        currentPage++;
        loadContracts(currentPage, pageSize);
    });

    document.getElementById('frc20-prev-page').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            loadFRC20Tokens(currentPage, pageSize);
        }
    });

    document.getElementById('frc20-next-page').addEventListener('click', () => {
        currentPage++;
        loadFRC20Tokens(currentPage, pageSize);
    });

    document.getElementById('logo-link').href = `../index.html?network=${blockchainNetwork}`;

    // Tab switching logic
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));

            button.classList.add('active');
            document.getElementById(`${button.dataset.tab}-tab`).classList.add('active');

            if (button.dataset.tab === 'contracts') {
                loadContracts(currentPage, pageSize);
            } else if (button.dataset.tab === 'frc20') {
                loadFRC20Tokens(currentPage, pageSize);
            }
        });
    });

    // Event listener for address format toggle
    document.getElementById('address-format').addEventListener('change', (event) => {
        useBase58 = event.target.checked;
        // Reload the current tab to apply the new address format
        const activeTab = document.querySelector('.tab-button.active').dataset.tab;
        if (activeTab === 'contracts') {
            loadContracts(currentPage, pageSize);
        } else if (activeTab === 'frc20') {
            loadFRC20Tokens(currentPage, pageSize);
        }
    });

    // Initialize the page by loading the first page of contracts
    loadContracts(currentPage, pageSize);
});