// 3D地球食物运输可视化
class FoodExplorer3D {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.earth = null;
        this.controls = null;
        this.routes = [];
        this.vessels = [];
        this.particles = [];
        this.animationSpeed = 1;
        this.totalCarbon = 0;
        this.earthData = null;
        
        this.init();
    }

    async init() {
        try {
            // 加载数据
            await this.loadData();
            
            // 初始化Three.js场景
            this.initScene();
            this.initLights();
            this.createEarth();
            this.createAtmosphere();
            this.createStars();
            this.initControls();
            
            // 如果有数据，填充路线选择器
            if (this.earthData) {
                this.populateRouteSelector();
                this.startVesselsAnimation();
            }
            
            // 开始渲染循环
            this.animate();
            
            // 添加事件监听
            this.addEventListeners();
            
            // 成功初始化后隐藏加载画面
            setTimeout(() => {
                document.getElementById('loading-screen').style.opacity = '0';
                setTimeout(() => {
                    document.getElementById('loading-screen').style.display = 'none';
                }, 1000);
            }, 1000);
            
        } catch (error) {
            console.error('Initialization failed:', error);
            this.showError('初始化失败: ' + error.message);
            
            // 即使失败也尝试隐藏加载画面
            setTimeout(() => {
                document.getElementById('loading-screen').style.opacity = '0';
                setTimeout(() => {
                    document.getElementById('loading-screen').style.display = 'none';
                }, 1000);
            }, 2000);
        }
    }

    async loadData() {
        try {
            console.log('Loading earth data...');
            const response = await fetch('../data/earth_3d_data.json');
            console.log('Response status:', response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            this.earthData = await response.json();
            console.log('Earth data loaded successfully:', this.earthData);
        } catch (error) {
            console.error('Failed to load earth data:', error);
            // 提供一个基本的备用数据
            this.earthData = {
                transport_paths: [
                    {
                        from: { name: "上海", lat: 31.2304, lon: 121.4737 },
                        to: { name: "洛杉矶", lat: 34.0522, lon: -118.2437 },
                        mode: "ship",
                        goods: "电子产品",
                        total_distance: 11453,
                        carbon_per_km: 0.012,
                        animation_duration: 10000
                    }
                ],
                real_time_vessels: []
            };
            this.showError('数据加载失败，使用默认数据');
        }
    }

    showError(message) {
        const loadingText = document.querySelector('.loading-text');
        if (loadingText) {
            loadingText.textContent = '❌ ' + message;
            loadingText.style.color = '#ff5252';
        }
    }

    initScene() {
        // 创建场景
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x000011, 100, 1000);

        // 创建相机
        const container = document.getElementById('canvas-container');
        this.camera = new THREE.PerspectiveCamera(
            45,
            container.clientWidth / container.clientHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 0, 300);

        // 创建渲染器
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(this.renderer.domElement);
    }

    initLights() {
        // 环境光
        const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(ambientLight);

        // 主光源（模拟太阳）
        const sunLight = new THREE.DirectionalLight(0xffffff, 1);
        sunLight.position.set(100, 50, 100);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        this.scene.add(sunLight);

        // 点光源（地球发光效果）
        const earthGlow = new THREE.PointLight(0x4444ff, 0.5, 200);
        earthGlow.position.set(0, 0, 0);
        this.scene.add(earthGlow);
    }

    createEarth() {
        // 创建地球几何体
        const earthGeometry = new THREE.SphereGeometry(100, 64, 64);
        
        // 创建基础材质（作为备用）
        const earthMaterial = new THREE.MeshPhongMaterial({
            color: 0x2233ff,
            emissive: 0x112244,
            shininess: 10
        });

        // 创建地球网格
        this.earth = new THREE.Mesh(earthGeometry, earthMaterial);
        this.earth.receiveShadow = true;
        this.earth.castShadow = true;
        this.scene.add(this.earth);

        // 添加云层
        const cloudGeometry = new THREE.SphereGeometry(101, 64, 64);
        const cloudMaterial = new THREE.MeshPhongMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.4,
            depthWrite: false
        });
        this.clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
        this.scene.add(this.clouds);

        // 尝试加载纹理（可选）
        try {
            const textureLoader = new THREE.TextureLoader();
            textureLoader.setCrossOrigin('anonymous');
            
            // 加载地球纹理
            textureLoader.load(
                'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg',
                (texture) => {
                    earthMaterial.map = texture;
                    earthMaterial.needsUpdate = true;
                },
                undefined,
                (error) => {
                    console.warn('Earth texture failed to load, using fallback color');
                }
            );
        } catch (error) {
            console.warn('Texture loading not available, using basic materials');
        }
    }

    createAtmosphere() {
        try {
            // 创建大气层光晕效果
            const atmosphereGeometry = new THREE.SphereGeometry(110, 64, 64);
            const atmosphereMaterial = new THREE.ShaderMaterial({
                vertexShader: `
                    varying vec3 vNormal;
                    void main() {
                        vNormal = normalize(normalMatrix * normal);
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    varying vec3 vNormal;
                    void main() {
                        float intensity = pow(0.8 - dot(vNormal, vec3(0, 0, 1.0)), 2.0);
                        gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * intensity;
                    }
                `,
                blending: THREE.AdditiveBlending,
                side: THREE.BackSide,
                transparent: true
            });
            
            const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
            this.scene.add(atmosphere);
        } catch (error) {
            console.warn('Failed to create atmosphere effect:', error);
            // 如果shader失败，使用简单的半透明球体
            const atmosphereGeometry = new THREE.SphereGeometry(110, 64, 64);
            const atmosphereMaterial = new THREE.MeshBasicMaterial({
                color: 0x4488ff,
                transparent: true,
                opacity: 0.1,
                side: THREE.BackSide
            });
            const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
            this.scene.add(atmosphere);
        }
    }

    createStars() {
        // 创建星空背景
        const starsGeometry = new THREE.BufferGeometry();
        const starsMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 1,
            transparent: true,
            opacity: 0.8
        });

        const starsVertices = [];
        for (let i = 0; i < 10000; i++) {
            const x = (Math.random() - 0.5) * 2000;
            const y = (Math.random() - 0.5) * 2000;
            const z = -Math.random() * 2000;
            starsVertices.push(x, y, z);
        }

        starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
        const stars = new THREE.Points(starsGeometry, starsMaterial);
        this.scene.add(stars);
    }

    initControls() {
        // 初始化轨道控制器
        if (typeof THREE.OrbitControls !== 'undefined') {
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        } else {
            console.warn('OrbitControls not available, falling back to simple controls');
            // 作为备用方案，添加简单的鼠标控制
            this.setupSimpleControls();
            return;
        }
        
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.rotateSpeed = 0.5;
        this.controls.minDistance = 150;
        this.controls.maxDistance = 500;
    }

    setupSimpleControls() {
        let mouseX = 0, mouseY = 0;
        let targetX = 0, targetY = 0;
        
        document.addEventListener('mousemove', (event) => {
            mouseX = (event.clientX - window.innerWidth / 2) / 100;
            mouseY = (event.clientY - window.innerHeight / 2) / 100;
        });
        
        this.controls = {
            update: () => {
                targetX += (mouseX - targetX) * 0.05;
                targetY += (mouseY - targetY) * 0.05;
                
                this.camera.position.x = 300 * Math.sin(targetX * 0.5);
                this.camera.position.z = 300 * Math.cos(targetX * 0.5);
                this.camera.position.y = 100 * targetY;
                this.camera.lookAt(0, 0, 0);
            }
        };
    }

    populateRouteSelector() {
        const routeSelect = document.getElementById('route-select');
        
        if (this.earthData && this.earthData.transport_paths) {
            this.earthData.transport_paths.forEach((route, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = `${route.from.name} → ${route.to.name} (${route.goods})`;
                routeSelect.appendChild(option);
            });
        }
    }

    createRoute(routeData) {
        // 清除之前的路线
        this.clearCurrentRoute();

        // 创建路线曲线
        const curve = this.createCurveFromRoute(routeData);
        
        // 创建路线线条
        const points = curve.getPoints(100);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        
        // 根据运输方式设置颜色
        const color = this.getTransportColor(routeData.mode);
        const material = new THREE.LineBasicMaterial({
            color: color,
            linewidth: 3,
            transparent: true,
            opacity: 0.8
        });
        
        const line = new THREE.Line(geometry, material);
        this.scene.add(line);
        this.currentRoute = line;

        // 创建起点和终点标记
        this.createLocationMarker(routeData.from);
        this.createLocationMarker(routeData.to);

        // 创建运输动画
        this.createTransportAnimation(curve, routeData);

        // 更新信息面板
        this.updateRouteInfo(routeData);
    }

    createCurveFromRoute(routeData) {
        // 将经纬度转换为3D坐标
        const startPos = this.latLonToVector3(routeData.from.lat, routeData.from.lon, 102);
        const endPos = this.latLonToVector3(routeData.to.lat, routeData.to.lon, 102);
        
        // 计算控制点（用于创建曲线）
        const midPos = new THREE.Vector3().addVectors(startPos, endPos).multiplyScalar(0.5);
        const distance = startPos.distanceTo(endPos);
        midPos.normalize().multiplyScalar(102 + distance * 0.3); // 曲线高度

        // 创建贝塞尔曲线
        return new THREE.QuadraticBezierCurve3(startPos, midPos, endPos);
    }

    latLonToVector3(lat, lon, radius) {
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lon + 180) * (Math.PI / 180);
        
        const x = -radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.cos(phi);
        const z = radius * Math.sin(phi) * Math.sin(theta);
        
        return new THREE.Vector3(x, y, z);
    }

    getTransportColor(mode) {
        switch (mode) {
            case 'ship': return 0x00ff00; // 绿色 - 低碳
            case 'truck': return 0xffff00; // 黄色 - 中碳
            case 'air': return 0xff0000; // 红色 - 高碳
            default: return 0xffffff;
        }
    }

    createLocationMarker(location) {
        const position = this.latLonToVector3(location.lat, location.lon, 102);
        
        // 创建标记点
        const markerGeometry = new THREE.SphereGeometry(2, 16, 16);
        const markerMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            emissive: 0xffffff,
            emissiveIntensity: 0.5
        });
        const marker = new THREE.Mesh(markerGeometry, markerMaterial);
        marker.position.copy(position);
        this.scene.add(marker);
        
        // 创建光环效果
        const ringGeometry = new THREE.RingGeometry(3, 5, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.position.copy(position);
        ring.lookAt(new THREE.Vector3(0, 0, 0));
        this.scene.add(ring);
        
        // 保存标记以便后续清理
        if (!this.currentMarkers) this.currentMarkers = [];
        this.currentMarkers.push(marker, ring);
    }

    createTransportAnimation(curve, routeData) {
        // 创建运输工具模型
        const vehicleGeometry = new THREE.BoxGeometry(4, 2, 2);
        const vehicleMaterial = new THREE.MeshPhongMaterial({
            color: this.getTransportColor(routeData.mode),
            emissive: this.getTransportColor(routeData.mode),
            emissiveIntensity: 0.5
        });
        const vehicle = new THREE.Mesh(vehicleGeometry, vehicleMaterial);
        this.scene.add(vehicle);
        
        // 创建粒子尾迹
        const particleCount = 50;
        const particles = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        
        particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const particleMaterial = new THREE.PointsMaterial({
            size: 2,
            vertexColors: true,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });
        
        const particleSystem = new THREE.Points(particles, particleMaterial);
        this.scene.add(particleSystem);
        
        // 动画设置
        this.currentAnimation = {
            vehicle: vehicle,
            particleSystem: particleSystem,
            curve: curve,
            progress: 0,
            duration: routeData.animation_duration / 1000, // 转换为秒
            carbonPerSecond: (routeData.carbon_per_km * routeData.total_distance) / (routeData.animation_duration / 1000)
        };
    }

    clearCurrentRoute() {
        // 清除当前路线
        if (this.currentRoute) {
            this.scene.remove(this.currentRoute);
            this.currentRoute = null;
        }
        
        // 清除标记
        if (this.currentMarkers) {
            this.currentMarkers.forEach(marker => this.scene.remove(marker));
            this.currentMarkers = [];
        }
        
        // 清除动画
        if (this.currentAnimation) {
            this.scene.remove(this.currentAnimation.vehicle);
            this.scene.remove(this.currentAnimation.particleSystem);
            this.currentAnimation = null;
        }
    }

    startVesselsAnimation() {
        // 创建实时运输工具
        if (this.earthData && this.earthData.real_time_vessels) {
            const vesselsList = document.getElementById('vessels-list');
            
            this.earthData.real_time_vessels.slice(0, 5).forEach(vesselData => {
                // 创建3D模型
                const vessel = this.createVessel(vesselData);
                this.vessels.push(vessel);
                
                // 更新UI
                const vesselElement = document.createElement('div');
                vesselElement.className = 'vessel-item';
                vesselElement.innerHTML = `
                    <div class="vessel-type">${this.getVesselIcon(vesselData.type)} ${vesselData.id}</div>
                    <div class="vessel-cargo">运输: ${vesselData.cargo}</div>
                    <div>速度: ${vesselData.speed.toFixed(1)} km/h</div>
                `;
                vesselsList.appendChild(vesselElement);
            });
        }
    }

    createVessel(vesselData) {
        const geometry = new THREE.ConeGeometry(2, 4, 8);
        const material = new THREE.MeshPhongMaterial({
            color: this.getVesselColor(vesselData.type),
            emissive: this.getVesselColor(vesselData.type),
            emissiveIntensity: 0.3
        });
        const vessel = new THREE.Mesh(geometry, material);
        
        const position = this.latLonToVector3(vesselData.position.lat, vesselData.position.lon, 105);
        vessel.position.copy(position);
        vessel.userData = vesselData;
        
        this.scene.add(vessel);
        return vessel;
    }

    getVesselIcon(type) {
        switch (type) {
            case 'cargo_ship': return '🚢';
            case 'airplane': return '✈️';
            case 'truck': return '🚚';
            default: return '📦';
        }
    }

    getVesselColor(type) {
        switch (type) {
            case 'cargo_ship': return 0x0088ff;
            case 'airplane': return 0xff8800;
            case 'truck': return 0x88ff00;
            default: return 0xffffff;
        }
    }

    updateRouteInfo(routeData) {
        document.getElementById('route-name').textContent = `${routeData.from.name} → ${routeData.to.name}`;
        document.getElementById('transport-mode').textContent = this.getTransportModeText(routeData.mode);
        document.getElementById('cargo-type').textContent = routeData.goods;
        document.getElementById('total-distance').textContent = `${routeData.total_distance.toFixed(0)} km`;
        document.getElementById('carbon-emission').textContent = `${(routeData.carbon_per_km * routeData.total_distance).toFixed(2)} kg CO₂`;
    }

    getTransportModeText(mode) {
        switch (mode) {
            case 'ship': return '🚢 海运';
            case 'air': return '✈️ 空运';
            case 'truck': return '🚚 陆运';
            default: return mode;
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        // 更新控制器
        this.controls.update();
        
        // 旋转地球
        this.earth.rotation.y += 0.001 * this.animationSpeed;
        this.clouds.rotation.y += 0.0015 * this.animationSpeed;
        
        // 更新运输动画
        if (this.currentAnimation) {
            this.updateTransportAnimation();
        }
        
        // 更新实时运输工具
        this.updateVessels();
        
        // 渲染场景
        this.renderer.render(this.scene, this.camera);
    }

    updateTransportAnimation() {
        const anim = this.currentAnimation;
        
        // 更新进度
        anim.progress += (0.01 * this.animationSpeed) / anim.duration;
        if (anim.progress > 1) anim.progress = 0;
        
        // 更新运输工具位置
        const point = anim.curve.getPointAt(anim.progress);
        anim.vehicle.position.copy(point);
        
        // 更新运输工具朝向
        const tangent = anim.curve.getTangentAt(anim.progress);
        anim.vehicle.lookAt(point.clone().add(tangent));
        
        // 更新粒子尾迹
        const positions = anim.particleSystem.geometry.attributes.position.array;
        const colors = anim.particleSystem.geometry.attributes.color.array;
        
        for (let i = 0; i < 50; i++) {
            const t = Math.max(0, anim.progress - i * 0.002);
            const trailPoint = anim.curve.getPointAt(t);
            
            positions[i * 3] = trailPoint.x;
            positions[i * 3 + 1] = trailPoint.y;
            positions[i * 3 + 2] = trailPoint.z;
            
            const alpha = 1 - i / 50;
            colors[i * 3] = alpha;
            colors[i * 3 + 1] = alpha * 0.5;
            colors[i * 3 + 2] = 0;
        }
        
        anim.particleSystem.geometry.attributes.position.needsUpdate = true;
        anim.particleSystem.geometry.attributes.color.needsUpdate = true;
        
        // 更新碳排放计数
        this.totalCarbon += anim.carbonPerSecond * 0.016; // 假设60fps
        document.getElementById('total-carbon').textContent = (this.totalCarbon / 1000).toFixed(3);
    }

    updateVessels() {
        this.vessels.forEach(vessel => {
            // 简单的运动模拟
            vessel.userData.position.lon += vessel.userData.speed * 0.0001 * this.animationSpeed;
            if (vessel.userData.position.lon > 180) vessel.userData.position.lon = -180;
            
            const position = this.latLonToVector3(
                vessel.userData.position.lat,
                vessel.userData.position.lon,
                105
            );
            vessel.position.copy(position);
            vessel.lookAt(new THREE.Vector3(0, 0, 0));
        });
    }

    addEventListeners() {
        // 路线选择
        document.getElementById('route-select').addEventListener('change', (e) => {
            const routeIndex = parseInt(e.target.value);
            if (!isNaN(routeIndex) && this.earthData && this.earthData.transport_paths[routeIndex]) {
                this.createRoute(this.earthData.transport_paths[routeIndex]);
            }
        });
        
        // 速度控制
        document.getElementById('speed-control').addEventListener('input', (e) => {
            this.animationSpeed = parseFloat(e.target.value);
        });
        
        // 窗口大小调整
        window.addEventListener('resize', () => {
            const container = document.getElementById('canvas-container');
            this.camera.aspect = container.clientWidth / container.clientHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(container.clientWidth, container.clientHeight);
        });
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new FoodExplorer3D();
}); 