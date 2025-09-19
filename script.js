// Konfigurasi
        const config = {
            domain: 'https://rakapanelshopp.pteroweb.my.id',
            plta: 'ptla_EOCbtmo2KPe1UOd3ZEkVUrBuQRgnAarbTsbB0GH5vJD',
            pltc: 'ptlc_9rtMIv5v6aSzvVOrwrJ1EA01lNUh0Bugli5zDAYOut5',
            loc: '1',
            eggs: '15',
            nests: '5'
        };
        
        let debugMode = false;
        
        // Debug logger
        function debugLog(message, type = 'info') {
            const timestamp = new Date().toLocaleTimeString();
            const debugContent = document.getElementById('debugContent');
            const logEntry = `[${timestamp}] ${type.toUpperCase()}: ${message}\n`;
            debugContent.innerHTML += logEntry;
            debugContent.scrollTop = debugContent.scrollHeight;
            
            // Also log to console
            console.log(`[Panel Creator] ${logEntry}`);
        }
        
        // Toggle debug panel
        function toggleDebug() {
            debugMode = !debugMode;
            document.getElementById('debugInfo').style.display = debugMode ? 'block' : 'none';
            if (debugMode) {
                debugLog('Debug mode enabled');
            }
        }
        
        // Check connection status
        async function checkConnection() {
            const statusIndicator = document.getElementById('statusIndicator');
            const connectionStatus = document.getElementById('connectionStatus');
            
            try {
                debugLog('Checking connection to server...');
                statusIndicator.className = 'status-indicator status-checking';
                connectionStatus.textContent = 'Checking connection...';
                
                const response = await fetch(`${config.domain}/api/application/users?per_page=1`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${config.plta}`
                    },
                    signal: AbortSignal.timeout(10000) // 10 second timeout
                });
                
                if (response.ok) {
                    statusIndicator.className = 'status-indicator status-success';
                    connectionStatus.textContent = 'Connection OK';
                    debugLog('Connection successful');
                    return true;
                } else {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
            } catch (error) {
                statusIndicator.className = 'status-indicator status-error';
                connectionStatus.textContent = 'Connection failed';
                debugLog(`Connection failed: ${error.message}`, 'error');
                
                if (error.name === 'AbortError') {
                    showError('Connection timeout. Please check your internet connection.');
                } else if (error.message.includes('CORS')) {
                    showError('CORS error detected. This may be due to browser security restrictions.');
                } else if (error.message.includes('Failed to fetch')) {
                    showError('Network error. Please check if the server is accessible and try again.');
                } else {
                    showError(`Connection error: ${error.message}`);
                }
                
                return false;
            }
        }
        
        // Enhanced fetch with better error handling
        async function enhancedFetch(url, options = {}) {
            debugLog(`Making request to: ${url}`);
            debugLog(`Request options: ${JSON.stringify(options, null, 2)}`);
            
            try {
                // Add timeout and mode
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
                
                const response = await fetch(url, {
                    ...options,
                    signal: controller.signal,
                    mode: 'cors', // Explicitly set CORS mode
                    credentials: 'omit' // Don't send cookies
                });
                
                clearTimeout(timeoutId);
                
                debugLog(`Response status: ${response.status} ${response.statusText}`);
                debugLog(`Response headers: ${JSON.stringify([...response.headers.entries()])}`);
                
                const contentType = response.headers.get('content-type');
                let data;
                
                if (contentType && contentType.includes('application/json')) {
                    data = await response.json();
                } else {
                    const text = await response.text();
                    debugLog(`Response text: ${text}`);
                    throw new Error(`Expected JSON response, got: ${contentType}`);
                }
                
                debugLog(`Response data: ${JSON.stringify(data, null, 2)}`);
                
                // Don't throw error for 404 on email check - that's expected
                if (!response.ok && !(response.status === 404 && url.includes('/users/email/'))) {
                    const error = new Error(`HTTP ${response.status}: ${data.message || response.statusText}`);
                    error.data = data;
                    throw error;
                }
                
                return { response, data };
            } catch (error) {
                debugLog(`Request failed: ${error.message}`, 'error');
                
                if (error.name === 'AbortError') {
                    throw new Error('Request timeout. Server took too long to respond.');
                } else if (error.message.includes('Failed to fetch')) {
                    throw new Error('Network error. Please check your connection and server accessibility.');
                } else if (error.message.includes('CORS')) {
                    throw new Error('CORS policy error. The server may not allow requests from this domain.');
                } else {
                    throw error;
                }
            }
        }
        
        // Initialize app
        document.addEventListener('DOMContentLoaded', function() {
            debugLog('Application initialized');
            checkConnection();
        });
        
        // Package selection
        document.querySelectorAll('.package-option').forEach(option => {
            option.addEventListener('click', function() {
                document.querySelectorAll('.package-option').forEach(opt => opt.classList.remove('selected'));
                this.classList.add('selected');
                document.getElementById('selectedPackage').value = this.getAttribute('data-package');
                debugLog(`Package selected: ${this.getAttribute('data-package')}`);
            });
        });
        
        // Handle form submission
        document.getElementById('createPanelForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value.trim();
            const selectedPackage = document.getElementById('selectedPackage').value;
            
            if (!username || !selectedPackage) {
                showError('Harap isi username dan pilih paket!');
                return;
            }
            
            // Validate username
            if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
                showError('Username hanya boleh mengandung huruf, angka, underscore, dan dash!');
                return;
            }
            
            debugLog(`Starting panel creation for user: ${username}, package: ${selectedPackage}`);
            
            // Show loader
            showLoader('Memulai pembuatan panel...');
            hideAlerts();
            
            try {
                const result = await createPanel(username, selectedPackage);
                
                // Show results
                document.getElementById('panelId').textContent = result.userId;
                document.getElementById('panelEmail').textContent = result.email;
                document.getElementById('panelUsername').textContent = result.username;
                document.getElementById('panelPassword').textContent = result.password;
                document.getElementById('panelLink').href = config.domain;
                
                hideLoader();
                document.getElementById('resultPanel').style.display = 'block';
                
                debugLog('Panel creation completed successfully');
                
            } catch (error) {
                debugLog(`Panel creation failed: ${error.message}`, 'error');
                showError(`Terjadi kesalahan: ${error.message}`);
                hideLoader();
            }
        });
        
        // Show/hide functions
        function showLoader(text = 'Sedang memproses...') {
            document.getElementById('loadingText').textContent = text;
            document.getElementById('loader').style.display = 'block';
            document.getElementById('submitBtn').disabled = true;
        }
        
        function hideLoader() {
            document.getElementById('loader').style.display = 'none';
            document.getElementById('submitBtn').disabled = false;
        }
        
        function showError(message) {
            document.getElementById('errorMessage').textContent = message;
            document.getElementById('errorAlert').style.display = 'block';
            debugLog(`Error shown: ${message}`, 'error');
        }
        
        function showInfo(message) {
            document.getElementById('infoMessage').textContent = message;
            document.getElementById('infoAlert').style.display = 'block';
            debugLog(`Info shown: ${message}`, 'info');
        }
        
        function hideAlerts() {
            document.getElementById('errorAlert').style.display = 'none';
            document.getElementById('infoAlert').style.display = 'none';
            document.getElementById('resultPanel').style.display = 'none';
        }
        
        // Main panel creation function
        async function createPanel(username, packageType) {
            debugLog(`Creating panel with username: ${username}, package: ${packageType}`);
            
            // Get package specifications
            const { ram, disk, cpu } = getPackageSpecs(packageType);
            debugLog(`Package specs - RAM: ${ram}MB, Disk: ${disk}MB, CPU: ${cpu}%`);
            
            const email = `${username}@xpanel.id`;
            
            try {
                // Step 1: Check email availability
                showLoader('Memeriksa ketersediaan email...');
                debugLog('Step 1: Checking email availability');
                
                try {
                    const { data: emailCheck } = await enhancedFetch(
                        `${config.domain}/api/application/users/email/${encodeURIComponent(email)}`,
                        {
                            method: 'GET',
                            headers: {
                                'Accept': 'application/json',
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${config.plta}`
                            }
                        }
                    );
                    
                    // If we get user data back without errors, email exists
                    if (emailCheck && emailCheck.attributes) {
                        throw new Error('Email sudah digunakan! Silakan pilih username yang lain.');
                    }
                } catch (error) {
                    // Handle the check based on the actual API response
                    if (error.message.includes('404')) {
                        // 404 means email doesn't exist, which is good - we can proceed
                        debugLog('Email available (404 response expected)');
                    } else if (error.data && error.data.code === "ValidationException") {
                        const source = error.data.meta?.source_field || 
                                     (error.data.errors && error.data.errors[0]?.meta?.source_field);
                        if (source === "email" || source === "username") {
                            throw new Error(`${source.toUpperCase()} sudah digunakan! Silakan pilih yang lain.`);
                        }
                    } else if (!error.message.includes('404')) {
                        // If it's not a 404, it might be a real error
                        throw error;
                    }
                }
                
                // Step 2: Create user
                showLoader('Membuat user account...');
                debugLog('Step 2: Creating user account');
                
                const password = generatePassword(8); // Match original code length
                debugLog(`Generated password: ${password}`);
                
                const { data: userData } = await enhancedFetch(
                    `${config.domain}/api/application/users`,
                    {
                        method: 'POST',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${config.plta}`
                        },
                        body: JSON.stringify({
                            email: email,
                            username: username,
                            first_name: username,
                            last_name: username,
                            language: 'en',
                            password: password.toString()
                        })
                    }
                );
                
                if (userData.errors) {
                    throw new Error(userData.errors[0]?.detail || 'Gagal membuat user');
                }
                
                const user = userData.attributes;
                debugLog(`User created with ID: ${user.id}`);
                
                // Step 3: Get egg configuration
                showLoader('Mengambil konfigurasi server...');
                debugLog('Step 3: Getting egg configuration');
                
                const { data: eggData } = await enhancedFetch(
                    `${config.domain}/api/application/nests/${config.nests}/eggs/${config.eggs}`,
                    {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${config.pltc}`
                        }
                    }
                );
                
                if (eggData.errors) {
                    throw new Error('Gagal mengambil konfigurasi egg');
                }
                
                const startup_cmd = eggData.attributes.startup;
                debugLog(`Egg startup command: ${startup_cmd}`);
                
                // Step 4: Create server
                showLoader('Membuat server...');
                debugLog('Step 4: Creating server');
                
                const serverConfig = {
                    name: username,
                    description: 'panel pterodactyl',
                    user: user.id,
                    egg: parseInt(config.eggs),
                    docker_image: 'ghcr.io/parkervcp/yolks:nodejs_18',
                    startup: startup_cmd,
                    environment: {
                        INST: 'npm',
                        USER_UPLOAD: '0',
                        AUTO_UPDATE: '0',
                        CMD_RUN: 'npm start'
                    },
                    limits: {
                        memory: parseInt(ram),
                        swap: 0,
                        disk: parseInt(disk),
                        io: 500,
                        cpu: parseInt(cpu)
                    },
                    feature_limits: {
                        databases: 5,
                        backups: 5,
                        allocations: 5
                    },
                    deploy: {
                        locations: [parseInt(config.loc)],
                        dedicated_ip: false,
                        port_range: []
                    }
                };
                
                debugLog(`Server config: ${JSON.stringify(serverConfig, null, 2)}`);
                
                const { data: serverData } = await enhancedFetch(
                    `${config.domain}/api/application/servers`,
                    {
                        method: 'POST',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${config.pltc}`
                        },
                        body: JSON.stringify(serverConfig)
                    }
                );
                
                if (serverData.errors) {
                    throw new Error(serverData.errors[0]?.detail || 'Gagal membuat server');
                }
                
                debugLog(`Server created successfully with ID: ${serverData.attributes?.id}`);
                
                return {
                    userId: user.id,
                    email: email,
                    username: username,
                    password: password,
                    package: packageType,
                    ram: ram,
                    disk: disk,
                    cpu: cpu
                };
                
            } catch (error) {
                debugLog(`Panel creation error: ${error.message}`, 'error');
                
                // Handle specific error cases
                if (error.message.includes('email') || error.message.includes('username')) {
                    throw new Error('Username atau email sudah digunakan! Silakan pilih yang lain.');
                } else if (error.message.includes('ValidationException')) {
                    throw new Error('Data tidak valid. Periksa kembali input Anda.');
                } else if (error.message.includes('timeout')) {
                    throw new Error('Server tidak merespons. Coba lagi dalam beberapa menit.');
                } else if (error.message.includes('Network')) {
                    throw new Error('Masalah koneksi jaringan. Periksa koneksi internet Anda.');
                }
                
                throw error;
            }
        }
        
        // Get package specifications
        function getPackageSpecs(packageType) {
            const specs = {
                '1gb': { ram: '1024', disk: '1024', cpu: '40' },
                '2gb': { ram: '2048', disk: '2048', cpu: '60' },
                '3gb': { ram: '3072', disk: '3072', cpu: '80' },
                '4gb': { ram: '4096', disk: '4096', cpu: '100' },
                '5gb': { ram: '5120', disk: '5120', cpu: '120' },
                '6gb': { ram: '6144', disk: '6144', cpu: '140' },
                '7gb': { ram: '7168', disk: '7168', cpu: '160' },
                '8gb': { ram: '8192', disk: '8192', cpu: '180' },
                '9gb': { ram: '9216', disk: '9216', cpu: '200' },
                '10gb': { ram: '10240', disk: '10240', cpu: '220' },
                'unli': { ram: '0', disk: '0', cpu: '0' }
            };
            
            return specs[packageType] || specs['1gb'];
        }
        
        // Generate secure password (match original 8 chars)
        function generatePassword(length = 8) {
            const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
            let password = '';
            for (let i = 0; i < length; i++) {
                password += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return password;
        }
        
        // Copy to clipboard function
        async function copyToClipboard(elementId) {
            const text = document.getElementById(elementId).textContent;
            try {
                await navigator.clipboard.writeText(text);
                showInfo('Teks berhasil disalin ke clipboard!');
                setTimeout(() => hideAlerts(), 3000);
            } catch (error) {
                debugLog(`Copy failed: ${error.message}`, 'error');
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = text;
                document.body.appendChild(textArea);
                textArea.select();
                try {
                    document.execCommand('copy');
                    showInfo('Teks berhasil disalin ke clipboard!');
                    setTimeout(() => hideAlerts(), 3000);
                } catch (fallbackError) {
                    showError('Gagal menyalin teks. Silakan salin manual.');
                }
                document.body.removeChild(textArea);
            }
        }