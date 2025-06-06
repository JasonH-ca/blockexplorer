document.addEventListener('DOMContentLoaded', async function() {
    const urlParams = new URLSearchParams(window.location.search);
    const blockchainNetwork = urlParams.get('network') || 'FAB'; // Default to 'FAB' if not specified
    let ticker;

    let apiUrl;

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
            } else if (blockchainNetwork === 'KANBAN') {
                ticker = 'FAB';
            } else {
                ticker = blockchainNetwork;
            }
            const searchnetwork = document.getElementById('search-network');
            searchnetwork.value = blockchainNetwork;
        } catch (error) {
            //console.error('Error loading configuration:', error);
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
            case 'KANBAN':
                logoImg.src = 'assets/kanban.png';
                break;
            default:
                logoImg.src = 'assets/fab-logo-o.png';
        }
    }

    let currentPage = 1;
    const pageSize = 20;
    let totalPages = 1;

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

    // Function to get total number of addresses
    async function getTotalAddresses() {
        const data = await fetchBlockchainData('totaladdresses');
        return data.totalAddresses; // Assuming the API returns an object with a 'total' property
    }

    // Function to load top addresses
    async function loadTopAddresses(page = 1, pageSize = 20) {
        const topAddressesData = await fetchBlockchainData(`topaddresses?page=${page}&pageSize=${pageSize}`);
        if (topAddressesData) {
            const topAddressesTableBody = document.querySelector('#top-addresses-table tbody');
            topAddressesTableBody.innerHTML = topAddressesData.map(address => {
                let addressTypeHtml = '';
                if (address.type && address.type !== '') {
                    addressTypeHtml = `<span class="address-type">${address.type ? ` ${address.type}` : ''}</span>`;
                }
                const addressLink = blockchainNetwork === 'KANBAN' ? 'kbaddress.html' : 'address.html';
                return `
                <tr>
                    <td class="address"><a href="${addressLink}?address=${address.address}&network=${blockchainNetwork}">${address.address}</a>${addressTypeHtml}</td>
                    <td class="balance">${parseFloat(address.balance).toLocaleString('en-US', { minimumFractionDigits: 8, maximumFractionDigits: 8 })}</td>
                </tr>
            `;
            }).join('');
            updatePaginationControls(page, topAddressesData.length, pageSize);
        }
    }

    // Function to update pagination controls
    function updatePaginationControls(page, dataLength, pageSize) {
        const firstPageButton = document.getElementById('first-page');
        const prevPageButton = document.getElementById('prev-page');
        const nextPageButton = document.getElementById('next-page');
        const lastPageButton = document.getElementById('last-page');
        const pageInfo = document.getElementById('page-info');

        firstPageButton.disabled = page === 1;
        prevPageButton.disabled = page === 1;
        nextPageButton.disabled = dataLength < pageSize || page === totalPages;
        lastPageButton.disabled = dataLength < pageSize || page === totalPages;
        pageInfo.textContent = `${page}/${totalPages}`;
    }

    // Event listeners for pagination buttons
    document.getElementById('first-page').addEventListener('click', () => {
        currentPage = 1;
        loadTopAddresses(currentPage, pageSize);
    });

    document.getElementById('prev-page').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            loadTopAddresses(currentPage, pageSize);
        }
    });

    document.getElementById('next-page').addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            loadTopAddresses(currentPage, pageSize);
        }
    });

    document.getElementById('last-page').addEventListener('click', () => {
        currentPage = totalPages;
        loadTopAddresses(currentPage, pageSize);
    });

    document.getElementById('go-to-page').addEventListener('click', () => {
        const pageInput = document.getElementById('page-input').value;
        const pageNumber = parseInt(pageInput, 10);
        if (pageNumber >= 1 && pageNumber <= totalPages) {
            currentPage = pageNumber;
            loadTopAddresses(currentPage, pageSize);
        } else {
            alert(`Please enter a valid page number between 1 and ${totalPages}`);
        }
    });

    document.getElementById('page-input').addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            document.getElementById('go-to-page').click();
        }
    });

    document.getElementById('logo-link').href = `../index.html?network=${blockchainNetwork}`;
    document.getElementById('ticker').textContent = ticker;
    
    // Initialize the page by getting the total number of addresses and loading the first page
    const totalAddresses = await getTotalAddresses();
    totalPages = Math.ceil(totalAddresses / pageSize);
    loadTopAddresses(currentPage, pageSize);
});