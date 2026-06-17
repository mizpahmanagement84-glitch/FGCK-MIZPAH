import axios from 'axios';

const defaultBaseUrl = typeof window !== 'undefined'
  ? `${window.location.origin}/api`
  : 'http://localhost:4000/api';
const baseURL = import.meta.env.VITE_API_BASE_URL || defaultBaseUrl;

const client = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json'
  }
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default client;
