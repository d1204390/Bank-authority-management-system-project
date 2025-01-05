// main.js
import { createApp } from 'vue';
import App from './App.vue';
import router from './router/index.js';
import axios from 'axios';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import {
    TitleComponent,
    TooltipComponent,
    GridComponent,
    LegendComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import VChart from 'vue-echarts';

// 設置 Axios 的基礎 URL
axios.defaults.baseURL = 'http://localhost:5000';  // 根據您的後端伺服器的地址和端口進行調整

// 添加請求攔截器
axios.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, error => {
    return Promise.reject(error);
});

// 註冊 ECharts 必要的組件
echarts.use([
    BarChart,
    LineChart,
    PieChart,
    TitleComponent,
    TooltipComponent,
    GridComponent,
    LegendComponent,
    CanvasRenderer
]);

const app = createApp(App);

// 註冊 vue-echarts 組件
app.component('v-chart', VChart);

app.use(router);
app.use(ElementPlus);
app.mount('#app');