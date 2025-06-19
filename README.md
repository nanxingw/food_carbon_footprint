# 舌尖上的足迹 - 食物碳足迹数据可视化

一个交互式的数据可视化网站，帮助用户了解食物从生产到餐桌的碳足迹影响。

## 🌟 功能特点

### 📊 现有功能（已增强）
- **食物里程与碳足迹**：可视化展示食物从产地到餐桌的运输路线和碳排放
- **营养价值 vs 碳足迹**：比较不同食物在提供营养素时的碳排放效率
- **饮食碳足迹模拟器**：对比不同饮食习惯的环境影响
- **食物浪费影响计算器**：计算个人食物浪费的碳足迹

### 🚀 新增功能
- **3D地球食物运输可视化**：使用Three.js创建的沉浸式3D地球，实时展示食物运输路线
- **碳足迹时光机**：穿越时空查看1950-2050年饮食碳足迹的历史变迁与未来预测
- **全球饮食碳足迹热力图**：实时展示全球各地区的饮食习惯和碳足迹分布

## 🎨 技术亮点

### 前端技术栈
- **Three.js**：3D图形渲染和WebGL实现
- **D3.js**：高级数据可视化和动态图表
- **Chart.js**：响应式图表库
- **Leaflet.js**：交互式地图可视化
- **GSAP**：流畅的动画效果
- **WebGL**：高性能图形渲染

### 数据可视化特性
- 实时数据更新和动画过渡
- 3D交互式地球模型
- 粒子系统和着色器效果
- 响应式设计，适配各种设备
- 数据驱动的故事叙述
- 热力图和时间轴可视化

## 🚀 在线访问

访问 [https://nanxingw.github.io/food_carbon_footprint/](https://nanxingw.github.io/food_carbon_footprint/) 查看在线演示

## 💻 本地运行

1. 克隆仓库：
```bash
git clone https://github.com/nanxingw/food_carbon_footprint.git
```

2. 使用本地服务器运行（推荐）：
```bash
# Python 3
python -m http.server 8000

# 或者使用 Node.js 的 http-server
npx http-server
```

3. 在浏览器中访问 `http://localhost:8000`

## 📁 项目结构

```
├── web/                    # 网站文件
│   ├── index.html         # 主页（已更新）
│   ├── food_explorer_3d.html    # 3D地球可视化（新）
│   ├── carbon_timeline.html     # 碳足迹时光机（新）
│   ├── global_heatmap.html      # 全球热力图（新）
│   ├── css/               # 样式文件
│   ├── js/                # JavaScript文件
│   └── ...                # 其他页面
├── data/                  # 数据文件
│   ├── earth_3d_data.json       # 3D地球数据（新）
│   ├── timeline_data.json       # 时间线数据（新）
│   ├── global_heatmap_data.json # 热力图数据（新）
│   └── ...                      # 其他数据
└── generate_data/         # 数据生成脚本（已增强）
```

## 🛠️ 技术栈

- HTML5 + CSS3
- JavaScript (ES6+)
- Three.js - 3D图形和WebGL
- Chart.js - 数据可视化
- Leaflet.js - 地图可视化
- D3.js - 高级数据可视化
- GSAP - 动画库
- Chroma.js - 颜色处理

## 📊 数据说明

本项目使用增强的模拟数据生成器，包含：
- 3D地球运输路线数据
- 历史和未来预测数据（1950-2050）
- 全球各国饮食碳足迹数据
- 实时运输模拟数据

## 🔄 更新日志

### v2.0 (2024)
- 新增3D地球食物运输可视化
- 新增碳足迹时光机功能
- 新增全球饮食碳足迹热力图
- 增强现有功能的视觉效果
- 添加GSAP动画效果
- 优化响应式设计

### v1.0
- 初始版本发布
- 基础四大功能实现

## 📝 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 🙏 致谢

感谢所有开源库的贡献者，特别是Three.js、D3.js和Chart.js社区。 