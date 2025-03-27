document.addEventListener('DOMContentLoaded', async function() {
    const urlParams = new URLSearchParams(window.location.search);
    const blockchainNetwork = urlParams.get('network') || 'KANBAN'; // Default to 'KANBAN' if not specified
    let ticker;

    let apiUrl;

    try {
        const response = await fetch('./config/environment.json');
        const config = await response.json();
        const environment = config.environment; // Get the current environment (debug or production)
        apiUrl = config.apiServers[environment][blockchainNetwork];
        if (!apiUrl) {
            throw new Error(`API server not configured for ${blockchainNetwork}`);
        }
        updateLogo(blockchainNetwork);
        if (blockchainNetwork.endsWith("TEST")) {
            ticker = blockchainNetwork.slice(0, -4);
        } else {
            ticker = blockchainNetwork;
        }
    } catch (error) {
        //console.error('Error loading configuration:', error);
        return;
    }

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

    // Function to get query parameter by name
    function getQueryParam(name) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name);
    }

    // Load block details
    async function loadBlockDetails() {
        const blockNumber = getQueryParam('blockNumber');
        const blockHash = getQueryParam('blockHash');
        let blockData;

        if (blockNumber) {
            blockData = await fetchBlockchainData(`block/${blockNumber}`);
        } else if (blockHash) {
            blockData = await fetchBlockchainData(`block/${blockHash}`);
        }

        if (blockData) {
            const blockInfoDiv = document.getElementById('block-info');
            const previousBlockExists = parseInt(blockData.number, 16) > 0;
            const nextBlockExists = true;

            blockInfoDiv.innerHTML = `
                <div id="block-navigation">
                    ${previousBlockExists ? `<a href="kbblock.html?blockNumber=${parseInt(blockData.number,16) - 1}&network=${blockchainNetwork}">${(parseInt(blockData.number,16) - 1).toLocaleString()}</a>` : ''} |
                    ${nextBlockExists ? `<a href="kbblock.html?blockNumber=${parseInt(blockData.number,16) + 1}&network=${blockchainNetwork}">${(parseInt(blockData.number,16) + 1).toLocaleString()}</a>` : ''}
                </div>
                <table id="block-info-table">
                    <tr>
                        <th>Height</th>
                        <td>${parseInt(blockData.number,16).toLocaleString()}</td>
                    </tr>
                    <tr>
                        <th>Hash</th>
                        <td>
                            ${blockData.hash}
                            <button id="copy-button"><i class="fas fa-copy"></i></button>
                        </td>
                    </tr>
                    <tr>
                        <th>Time</th>
                        <td>${new Date(parseInt(blockData.timestamp, 16) * 1000).toLocaleString()}</td>
                    </tr>
                    <tr>
                        <th>Transactions</th>
                        <td>${blockData.transactions.length.toLocaleString()}</td>
                    </tr>
                    <tr>
                        <th>Size</th>
                        <td>${parseInt(blockData.size,16).toLocaleString()} bytes</td>
                    </tr>
                </table>
                <h3>Transactions</h3>
                <ul id="transaction-list">
                    ${blockData.transactions.map(tx => `<li><a href="kbtransaction.html?txid=${tx.hash}&network=${blockchainNetwork}" class="monospace">${tx.hash}</a></li>`).join('')}
                </ul>
            `;

            // Add event listener to copy button
            document.getElementById('copy-button').addEventListener('click', function() {
                navigator.clipboard.writeText(blockData.hash).then(() => {
                    alert('Block hash copied to clipboard');
                }).catch(err => {
                    console.error('Failed to copy block hash: ', err);
                });
            });
        } else {
            console.error('Failed to load block data');
        }
    }

    document.getElementById('logo-link').href = `../kanban.html?network=${blockchainNetwork}`;

    // Load block details on the block detail page
    loadBlockDetails();
});