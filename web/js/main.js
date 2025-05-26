document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const foodSelect = document.getElementById('food-select');
    const routeSelect = document.getElementById('route-select');
    const simulateModeSelect = document.getElementById('simulate-transport-mode-select');
    const mapContainer = document.getElementById('map');
    const chartCanvas = document.getElementById('carbon-chart');
    const infoContent = document.getElementById('info-content');

    // --- Global State & Data ---
    let allFoodsData = [];
    let transportFactors = {};
    let map = null;
    let carbonChart = null;
    let currentMapLayers = []; // To keep track of markers and lines
    let currentSelectedFoodIndex = null; // Store current food selection
    let currentSelectedRouteIndex = null; // Store current route selection

    // --- Helper Function for Polyline Style based on Emission ---
    function getPolylineStyleByEmission(transportCarbon) {
        let color = '#66BB6A'; // Default: Medium Green (Low emission)
        let weight = 3;

        if (transportCarbon >= 2.0) {
            color = '#EF5350'; // Bright Red (Very High emission)
            weight = 6;
        } else if (transportCarbon >= 0.5) {
            color = '#FFA726'; // Bright Orange (High emission)
            weight = 5;
        } else if (transportCarbon >= 0.1) {
            color = '#FFEE58'; // Bright Yellow (Medium emission)
            weight = 4;
        }
        return { color, weight };
    }

    // --- Initialize Map (Leaflet) ---
    function initMap() {
        map = L.map(mapContainer).setView([20, 0], 2); // Default view (latitude, longitude, zoom)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { // CartoDB Voyager
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(map);
    }

    // --- Initialize Chart (Chart.js) ---
    function initChart() {
        const ctx = chartCanvas.getContext('2d');
        carbonChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['生产碳足迹', '运输碳足迹'],
                datasets: [{
                    label: '碳排放 (kg CO2eq/kg 食物)',
                    data: [0, 0],
                    backgroundColor: [
                        'rgba(27, 94, 32, 0.75)',  // Darker Green for production (from index.html header gradient start)
                        'rgba(76, 175, 80, 0.75)'   // Lighter Green for transport (from index.html header gradient end)
                    ],
                    borderColor: [
                        'rgba(27, 94, 32, 1)',
                        'rgba(76, 175, 80, 1)'
                    ],
                    borderWidth: 1,
                    borderRadius: 5,
                    hoverBackgroundColor: [
                        'rgba(27, 94, 32, 0.9)',
                        'rgba(76, 175, 80, 0.9)'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 1.5,
                animation: { // Explicitly configure animation
                    duration: 1200, // Animation duration in milliseconds
                    easing: 'easeInOutQuart' // Easing function for the animation
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'kg CO2eq / kg 食物',
                            color: '#1b5e20', // Dark green text
                            font: {
                                size: 14,
                                weight: '500' // Medium weight
                            }
                        },
                        grid: {
                            display: true,
                            color: 'rgba(0,0,0,0.05)' // Softer grid lines
                        },
                        border: {
                            display: false // Hide Y-axis line, rely on grid
                        },
                        ticks: {
                            color: '#2e7d32', // Dark green ticks
                            padding: 8
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        border: {
                            display: false
                        },
                        ticks: {
                            color: '#2e7d32',
                            font: {
                                size: 13
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom', // Position legend at the bottom
                        labels: {
                            color: '#1b5e20',
                            font: {
                                size: 13
                            },
                            boxWidth: 15,
                            padding: 20 // Padding around legend items
                        }
                    },
                    title: {
                        display: false // Title is now in HTML structure (#chart-container h2)
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0,0,0,0.75)',
                        titleFont: { size: 14, weight: 'bold' },
                        bodyFont: { size: 13 },
                        padding: 10,
                        cornerRadius: 4,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += context.parsed.y.toFixed(3) + ' kg CO2eq/kg';
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    }

    // --- Load Data ---
    async function loadData() {
        try {
            // Path relative to index.html (located in web/)
            const foodsResponse = await fetch('../data/foods_with_routes.json');
            if (!foodsResponse.ok) throw new Error(`HTTP ${foodsResponse.status} while fetching foods_with_routes.json. Ensure data folder is sibling to web folder.`);
            allFoodsData = await foodsResponse.json();

            const factorsResponse = await fetch('../data/transport_factors.json');
            if (!factorsResponse.ok) throw new Error(`HTTP ${factorsResponse.status} while fetching transport_factors.json. Ensure data folder is sibling to web folder.`);
            transportFactors = await factorsResponse.json();
            
            populateFoodSelect();
            populateSimulateModeSelect();
        } catch (error) {
            console.error("Error loading data:", error);
            infoContent.innerHTML = `<p style="color: red;">数据加载失败: ${error.message}<br>请确保 <code>data</code> 文件夹与 <code>web</code> 文件夹位于同一目录下 (即都是 'Data visualize' 的直接子目录)，并且包含 <code>foods_with_routes.json</code> 和 <code>transport_factors.json</code> 文件。<br>建议通过本地HTTP服务器访问页面以获得最佳效果。</p>`;
        }
    }

    // --- Populate Food Select ---
    function populateFoodSelect() {
        if (!allFoodsData || allFoodsData.length === 0) {
            infoContent.innerHTML = '<p style="color: orange;">未加载到食物数据，请检查 <code>foods_with_routes.json</code> 文件是否存在且格式正确。</p>';
            return;
        }
        allFoodsData.forEach((food, index) => {
            const option = document.createElement('option');
            option.value = index; // Use index as value for easy lookup
            option.textContent = food.name;
            foodSelect.appendChild(option);
        });
    }

    // --- Populate Route Select ---
    function populateRouteSelect(foodIndex) {
        routeSelect.innerHTML = '<option value="">--请选择路线--</option>'; // Clear previous options
        const selectedFood = allFoodsData[foodIndex];
        if (selectedFood && selectedFood.routes && selectedFood.routes.length > 0) {
            selectedFood.routes.forEach((route, index) => {
                const option = document.createElement('option');
                option.value = index; // Use route index as value
                option.textContent = `${route.origin_country} -> ${route.destination_country}`;
                routeSelect.appendChild(option);
            });
            routeSelect.disabled = false;
        } else {
            routeSelect.disabled = true;
            infoContent.innerHTML = '<p>该食物没有可用的运输路线数据。</p>';
        }
    }

    // --- Populate Simulate Mode Select ---
    function populateSimulateModeSelect() {
        if (!transportFactors || Object.keys(transportFactors).length === 0) {
            console.warn("Transport factors not loaded, cannot populate simulate mode select.");
            return;
        }
        // First option is already in HTML: <option value="actual">--实际模式--</option>
        for (const mode in transportFactors) {
            const option = document.createElement('option');
            option.value = mode;
            // Simple capitalization for display
            option.textContent = mode.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '); 
            simulateModeSelect.appendChild(option);
        }
    }

    // --- Clear existing map layers ---
    function clearMapLayers() {
        currentMapLayers.forEach(layer => map.removeLayer(layer));
        currentMapLayers = [];
    }

    // --- Update Visualizations ---
    function updateVisualizations(foodIndex, routeIndex, simulatedMode = 'actual') {
        clearMapLayers();
        const food = allFoodsData[foodIndex];
        
        if (!food) {
            infoContent.innerHTML = '<p>未找到食物数据。</p>';
            carbonChart.data.datasets[0].data = [0, 0];
            carbonChart.update();
            return;
        }
        
        let productionCarbon = parseFloat(food.production_co2_per_kg) || 0;

        if (routeIndex === "" || routeIndex === null || !food.routes || !food.routes[routeIndex]) {
            infoContent.innerHTML = '<p>请选择一条有效的路线以查看完整信息和地图。</p>';
            carbonChart.data.datasets[0].data = [productionCarbon, 0];
            carbonChart.update();
            return;
        }
        
        const route = food.routes[routeIndex];

        // 1. Update Map
        const originCoords = [route.origin_lat, route.origin_lon];
        const destCoords = [route.destination_lat, route.destination_lon];

        const originMarker = L.marker(originCoords).addTo(map)
            .bindPopup(`<b>起点:</b> ${route.origin_country}<br>食物: ${food.name}`);
        const destMarker = L.marker(destCoords).addTo(map)
            .bindPopup(`<b>终点:</b> ${route.destination_country}`);
        
        const distanceKm = parseFloat(route.distance_km) || 0;
        
        // Determine the transport mode and factor to use
        let effectiveTransportMode = route.transport_mode;
        let isSimulation = false;
        if (simulatedMode && simulatedMode !== 'actual' && transportFactors[simulatedMode]) {
            effectiveTransportMode = simulatedMode;
            isSimulation = true;
        }
        
        const transportFactorPerTonneKm = parseFloat(transportFactors[effectiveTransportMode]) || 0;
        let currentTransportCarbon = 0;
        if (distanceKm > 0 && transportFactorPerTonneKm > 0) {
            currentTransportCarbon = (distanceKm * transportFactorPerTonneKm) / 1000000; // kg CO2eq for 1kg of food
        }
        currentTransportCarbon = parseFloat(currentTransportCarbon.toFixed(3));

        const polylineStyle = getPolylineStyleByEmission(currentTransportCarbon);

        let routeLine = L.polyline([originCoords, destCoords], {
            ...polylineStyle, 
            opacity: 0.85,    
            snakingSpeed: 500 
        }).addTo(map);

        // Adjust tooltip for simulated mode
        let tooltipContent = `<b>运输路线:</b> ${route.origin_country} → ${route.destination_country}<br>` +
                             `<b>距离:</b> ${distanceKm.toLocaleString()} km<br>` +
                             `<b>方式:</b> ${effectiveTransportMode.charAt(0).toUpperCase() + effectiveTransportMode.slice(1)}`;
        if (isSimulation) {
            tooltipContent += ` <i>(模拟)</i>`;
        }

        routeLine.bindTooltip(tooltipContent, {
            sticky: true, 
            opacity: 0.9,
            className: 'route-tooltip' 
        });

        routeLine.snakeIn();

        currentMapLayers.push(originMarker, destMarker, routeLine);
        map.fitBounds([originCoords, destCoords], { padding: [50, 50] });

        // 2. Calculate Carbon Footprints (currentTransportCarbon is already calculated)
        // productionCarbon is already defined
        // const transportFactorPerTonneKm = parseFloat(transportFactors[transportMode]) || 0; // Already defined above
        
        // let transportCarbon = 0; // Renamed to currentTransportCarbon and calculated above
        // if (distanceKm > 0 && transportFactorPerTonneKm > 0) {
        //      transportCarbon = (distanceKm * transportFactorPerTonneKm) / 1000000; // kg CO2eq for 1kg of food
        // }
        // transportCarbon = parseFloat(transportCarbon.toFixed(3));

        // 3. Update Chart
        carbonChart.data.datasets[0].data = [productionCarbon, currentTransportCarbon];
        carbonChart.update();

        // 4. Update Info Panel - indicate simulation if active
        const totalCarbon = productionCarbon + currentTransportCarbon;
        let infoHtml = `
            <p><strong>食物:</strong> ${food.name}</p>
            <p><strong>从:</strong> ${route.origin_country}</p>
            <p><strong>到:</strong> ${route.destination_country}</p>
            <p><strong>距离:</strong> ${distanceKm.toLocaleString()} km (估算)</p>
            <p><strong>运输方式:</strong> ${effectiveTransportMode.charAt(0).toUpperCase() + effectiveTransportMode.slice(1)}` + 
            (isSimulation ? ` <span style="color: #e65100; font-style: italic;">(模拟模式)</span>` : ` (因子: ${transportFactorPerTonneKm} gCO2eq/tonne-km)`) + `</p>
            <hr>
            <p><strong>生产碳足迹 (预估):</strong> ${productionCarbon.toFixed(2)} kg CO2eq/kg</p>
            <p><strong>运输碳足迹 (${isSimulation ? '模拟' : '预估'}):</strong> ${currentTransportCarbon.toFixed(3)} kg CO2eq/kg</p>
            <p><strong>总${isSimulation ? '模拟' : '预估'}碳足迹:</strong> ${totalCarbon.toFixed(3)} kg CO2eq/kg</p>
        `;
        if (isSimulation && route.transport_mode !== effectiveTransportMode) {
            const actualFactor = parseFloat(transportFactors[route.transport_mode]) || 0;
            let actualTransportCarbon = 0;
            if (distanceKm > 0 && actualFactor > 0) {
                actualTransportCarbon = (distanceKm * actualFactor) / 1000000;
            }
            actualTransportCarbon = parseFloat(actualTransportCarbon.toFixed(3));
            infoHtml += `<p style="font-size:0.9em; color: #555;"><i>实际运输方式 (${route.transport_mode}) 的碳足迹约为: ${actualTransportCarbon.toFixed(3)} kg CO2eq/kg</i></p>`;
        }
        infoContent.innerHTML = infoHtml;
    }

    // --- Event Listeners ---
    foodSelect.addEventListener('change', (event) => {
        currentSelectedFoodIndex = event.target.value; // Update global state
        currentSelectedRouteIndex = null; // Reset route selection
        
        routeSelect.innerHTML = '<option value="">--请先选择食物--</option>'; 
        routeSelect.disabled = true;
        simulateModeSelect.value = 'actual'; // Reset simulation dropdown
        simulateModeSelect.disabled = true; // Disable simulation dropdown

        clearMapLayers();
        infoContent.innerHTML = '<p>请选择食物和路线以查看详细信息。</p>';
        carbonChart.data.datasets[0].data = [0,0];
        carbonChart.update();

        if (currentSelectedFoodIndex !== "") {
            populateRouteSelect(currentSelectedFoodIndex);
            const food = allFoodsData[currentSelectedFoodIndex];
            if (food) { 
                 let productionCarbon = parseFloat(food.production_co2_per_kg) || 0;
                 carbonChart.data.datasets[0].data = [productionCarbon, 0];
                 carbonChart.update();
                 infoContent.innerHTML = '<p>请选择一条运输路线。</p>';
            }
        } 
    });

    routeSelect.addEventListener('change', (event) => {
        currentSelectedRouteIndex = event.target.value; // Update global state
        simulateModeSelect.value = 'actual'; // Reset simulation on new actual route selection
        
        if (currentSelectedFoodIndex !== null && currentSelectedRouteIndex !== "") {
            updateVisualizations(currentSelectedFoodIndex, currentSelectedRouteIndex, 'actual'); // Pass 'actual' mode
            simulateModeSelect.disabled = false; // Enable simulation dropdown
        } else if (currentSelectedFoodIndex !== null && currentSelectedRouteIndex === "") { 
            clearMapLayers();
            simulateModeSelect.disabled = true; // Disable simulation dropdown
            const food = allFoodsData[currentSelectedFoodIndex];
            if (food) {
                 let productionCarbon = parseFloat(food.production_co2_per_kg) || 0;
                 carbonChart.data.datasets[0].data = [productionCarbon, 0];
                 infoContent.innerHTML = '<p>请选择一条运输路线以查看完整碳足迹和地图。</p>';
            } else {
                carbonChart.data.datasets[0].data = [0,0];
                infoContent.innerHTML = '<p>请先选择食物。</p>';
            }
            carbonChart.update();
        }
    });

    // Event listener for the new simulateModeSelect dropdown
    simulateModeSelect.addEventListener('change', (event) => {
        const selectedSimMode = event.target.value;
        if (currentSelectedFoodIndex !== null && currentSelectedRouteIndex !== null && currentSelectedRouteIndex !== "") {
            updateVisualizations(currentSelectedFoodIndex, currentSelectedRouteIndex, selectedSimMode);
        }
    });

    // --- Initial Setup ---
    initMap();
    initChart();
    loadData();

}); 