import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// 카테고리 관련 API
export const categoryApi = {
    // 모든 카테고리 조회
    getAllCategories: async () => {
        const response = await api.get('/api/categories');
        return response.data;
    },

    // 카테고리 생성
    createCategory: async (categoryData) => {
        const response = await api.post('/api/categories', categoryData);
        return response.data;
    },

    // 카테고리 삭제
    deleteCategory: async (categoryId) => {
        await api.delete(`/api/categories/${categoryId}`);
    },
};

// 파일 관련 API
export const fileApi = {
    // 카테고리별 파일 목록 조회
    getFilesByCategory: async (categoryId) => {
        const response = await api.get(`/api/files/category/${categoryId}`);
        return response.data;
    },

    // 파일 업로드
    uploadFile: async (categoryId, file) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await api.post(`/api/files/upload/${categoryId}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    // 파일 삭제
    deleteFile: async (fileId) => {
        await api.delete(`/api/files/${fileId}`);
    },

    // 파일 다운로드
    downloadFile: async (fileId) => {
        const response = await api.get(`/api/files/download/${fileId}`, {
            responseType: 'blob',
        });
        return response.data;
    },

    // 임베딩 생성
    generateEmbedding: async (categoryId, options) => {
        const response = await api.post(`/api/embeddings/generate/${categoryId}`, options);
        return response.data;
    },
}; 