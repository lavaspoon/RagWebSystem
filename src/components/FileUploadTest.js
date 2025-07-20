import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Plus, Trash2, Upload, Download, Copy, FileText, Folder, FolderOpen } from 'lucide-react';

const RAGFileManager = () => {
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [files, setFiles] = useState([]);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [addingToParent, setAddingToParent] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [uploadStatus, setUploadStatus] = useState('');

    const API_BASE = 'http://localhost:8050/api';

    // 카테고리 목록 조회
    const fetchCategories = async () => {
        try {
            console.log('카테고리 목록 조회 시작');
            const response = await fetch(`${API_BASE}/categories`);
            console.log('카테고리 조회 응답:', response.status);

            if (response.ok) {
                const data = await response.json();
                console.log('조회된 카테고리 데이터:', data);

                // 카테고리 데이터에 parent 정보를 명시적으로 설정
                const processCategories = (categories, parentCategory = null) => {
                    return categories.map(category => {
                        const processedCategory = {
                            ...category,
                            parent: parentCategory
                        };

                        if (category.children && category.children.length > 0) {
                            processedCategory.children = processCategories(category.children, processedCategory);
                        }

                        return processedCategory;
                    });
                };

                const categoriesArray = Array.isArray(data) ? data : [data];
                const processedCategories = processCategories(categoriesArray);

                setCategories(processedCategories);
                console.log('처리된 카테고리:', processedCategories);

                return processedCategories; // 처리된 카테고리 반환
            } else {
                throw new Error('카테고리 조회 실패');
            }
        } catch (err) {
            console.error('카테고리 조회 오류:', err);
            setError(err.message);
            return null;
        }
    };

    // 파일 목록 조회
    const fetchFiles = async (categoryId) => {
        if (!categoryId) return;
        try {
            const response = await fetch(`${API_BASE}/documents/category/${categoryId}`);
            if (response.ok) {
                const data = await response.json();
                setFiles(data);
            } else {
                throw new Error('파일 조회 실패');
            }
        } catch (err) {
            console.error('파일 조회 오류:', err);
            setError(err.message);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    useEffect(() => {
        if (selectedCategory) {
            fetchFiles(selectedCategory.id);
        } else {
            setFiles([]);
        }
    }, [selectedCategory]);

    // 카테고리 선택 시 자동 펼치기/닫기 처리
    const selectCategory = (category) => {
        // 먼저 선택된 카테고리 설정
        setSelectedCategory(category);

        // 1depth 카테고리(루트)인 경우 자동 펼치기 및 다른 루트들 닫기
        if (isFirstDepth(category)) {
            const updateCategories = (cats) => {
                return cats.map(cat => {
                    if (cat.id === category.id) {
                        // 선택된 루트 카테고리는 펼치기
                        return { ...cat, isExpanded: true };
                    } else if (isFirstDepth(cat)) {
                        // 다른 루트 카테고리들은 닫기
                        return { ...cat, isExpanded: false };
                    }
                    return cat;
                });
            };
            setCategories(updateCategories(categories));
        }
    };
    const toggleCategory = (categoryId) => {
        const updateCategories = (cats) => {
            return cats.map(cat => {
                if (cat.id === categoryId) {
                    return { ...cat, isExpanded: !cat.isExpanded };
                }
                if (cat.children) {
                    return { ...cat, children: updateCategories(cat.children) };
                }
                return cat;
            });
        };
        setCategories(updateCategories(categories));
    };

    // 카테고리 추가 - 간단하고 확실한 방법
    const addCategory = async (parentId = null) => {
        if (!newCategoryName.trim()) return;

        try {
            const params = new URLSearchParams();
            params.append('name', newCategoryName);
            if (parentId) {
                params.append('parentId', parentId);
            }

            console.log('카테고리 생성 요청:', { name: newCategoryName, parentId });

            const response = await fetch(`${API_BASE}/categories`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: params
            });

            if (response.ok) {
                const result = await response.json();
                console.log('생성된 카테고리:', result);

                // 모달 닫기
                setNewCategoryName('');
                setShowModal(false);
                setAddingToParent(null);

                // 강제로 전체 새로고침
                const updatedCategories = await fetchCategories();

                // 현재 선택된 카테고리가 부모인 경우, 강제로 다시 선택
                if (parentId && selectedCategory && selectedCategory.id === parentId && updatedCategories) {
                    const findCategoryById = (cats, id) => {
                        for (let cat of cats) {
                            if (cat.id === id) return cat;
                            if (cat.children) {
                                const found = findCategoryById(cat.children, id);
                                if (found) return found;
                            }
                        }
                        return null;
                    };

                    const refreshedCategory = findCategoryById(updatedCategories, parentId);
                    if (refreshedCategory) {
                        console.log('카테고리 강제 업데이트:', refreshedCategory);
                        setSelectedCategory(refreshedCategory);
                    }
                }

                setUploadStatus(`카테고리 '${result.name}'가 생성되었습니다.`);
                setTimeout(() => setUploadStatus(''), 3000);
            } else {
                const errorText = await response.text();
                throw new Error(`카테고리 생성 실패: ${errorText}`);
            }
        } catch (err) {
            console.error('카테고리 생성 오류:', err);
            setError(err.message);
        }
    };

    // 카테고리 삭제
    const deleteCategory = async (categoryId) => {
        if (!window.confirm('정말 삭제하시겠습니까?')) return;

        try {
            const response = await fetch(`${API_BASE}/categories/${categoryId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                await fetchCategories();
                if (selectedCategory?.id === categoryId) {
                    setSelectedCategory(null);
                }
                setUploadStatus('카테고리가 삭제되었습니다.');
                setTimeout(() => setUploadStatus(''), 3000);
            } else {
                throw new Error('카테고리 삭제 실패');
            }
        } catch (err) {
            console.error('카테고리 삭제 오류:', err);
            setError(err.message);
        }
    };

    // 파일 업로드 후 파일 개수 업데이트
    const handleFileUpload = async (event) => {
        // 1depth 카테고리인 경우 업로드 차단
        if (selectedCategory && isFirstDepth(selectedCategory)) {
            setUploadStatus('1depth 카테고리에는 파일을 업로드할 수 없습니다. 하위 카테고리를 생성한 후 업로드해주세요.');
            setTimeout(() => setUploadStatus(''), 5000);
            event.target.value = '';
            return;
        }

        const uploadedFiles = Array.from(event.target.files);
        if (!selectedCategory || uploadedFiles.length === 0) {
            setUploadStatus('카테고리를 선택하고 파일을 선택해주세요.');
            return;
        }

        setLoading(true);
        setUploadStatus(`${uploadedFiles.length}개 파일 업로드 중...`);

        try {
            const formData = new FormData();
            formData.append('categoryId', selectedCategory.id);

            uploadedFiles.forEach((file) => {
                formData.append('files', file);
            });

            const response = await fetch(`${API_BASE}/documents/upload-multiple`, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const results = await response.json();
                setUploadStatus(`${results.length}개 파일 업로드 성공!`);
                setTimeout(() => setUploadStatus(''), 3000);

                // 파일 목록 새로고침
                await fetchFiles(selectedCategory.id);
            } else {
                const errorText = await response.text();
                throw new Error(`업로드 실패: ${errorText}`);
            }
        } catch (err) {
            console.error('파일 업로드 오류:', err);
            setError(err.message);
        } finally {
            setLoading(false);
            event.target.value = '';
        }
    };

    // 파일 삭제
    const deleteFile = async (fileId) => {
        if (!window.confirm('정말 삭제하시겠습니까?')) return;

        try {
            const response = await fetch(`${API_BASE}/documents/${fileId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                await fetchFiles(selectedCategory.id);
                setUploadStatus('파일이 삭제되었습니다.');
                setTimeout(() => setUploadStatus(''), 3000);
            } else {
                throw new Error('파일 삭제 실패');
            }
        } catch (err) {
            console.error('파일 삭제 오류:', err);
            setError(err.message);
        }
    };

    // 파일 다운로드
    const downloadFile = async (fileId, fileName) => {
        try {
            const response = await fetch(`${API_BASE}/documents/download/${fileId}`);
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } else {
                throw new Error('파일 다운로드 실패');
            }
        } catch (err) {
            console.error('파일 다운로드 오류:', err);
            setError(err.message);
        }
    };

    // 카테고리 depth 확인 함수 수정
    const getCategoryDepth = (category) => {
        if (!category) return 0;
        return category.parent ? 2 : 1; // parent가 있으면 2depth, 없으면 1depth
    };

    // 1depth 카테고리인지 확인 (루트 카테고리, 하위 폴더만 생성 가능)
    const isFirstDepth = (category) => {
        return category && !category.parent; // parent가 없으면 1depth (루트)
    };

    // 2depth 카테고리인지 확인 (루트의 하위 카테고리, 파일 업로드만 가능)
    const isSecondDepth = (category) => {
        return category && category.parent && !category.parent.parent; // parent가 있고 parent의 parent가 없으면 2depth
    };
    const generateEmbedding = async (categoryId) => {
        setUploadStatus('임베딩 생성 기능은 준비 중입니다.');
        setTimeout(() => setUploadStatus(''), 3000);
    };

    // 재귀적으로 카테고리 렌더링 - 2depth 제한
    const renderCategory = (category, level = 0) => {
        return (
            <div key={category.id} className="category-item">
                <div
                    className={`category-header ${selectedCategory?.id === category.id ? 'selected' : ''}`}
                    style={{ paddingLeft: `${level * 1.5 + 0.5}rem` }}
                    onClick={() => selectCategory(category)}
                >
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleCategory(category.id);
                        }}
                        style={{ visibility: category.children && category.children.length > 0 ? 'visible' : 'hidden' }}
                    >
                        {category.isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                    <span className="category-icon">
                        {category.isExpanded ? <FolderOpen size={18} /> : <Folder size={18} />}
                    </span>
                    <span className="category-name">{category.name}</span>
                    {/* 하위 카테고리 개수 표시 */}
                    {category.children && category.children.length > 0 && (
                        <span style={{ fontSize: '12px', color: '#6c757d', marginLeft: 'auto', marginRight: '8px' }}>
                            ({category.children.length})
                        </span>
                    )}
                    <div className="category-actions">
                        {/* 1depth에서만 하위 카테고리 추가 가능 */}
                        {isFirstDepth(category) && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowModal(true);
                                    setAddingToParent(category.id);
                                }}
                                title="하위 카테고리 추가 (2depth)"
                            >
                                <Plus size={14} />
                            </button>
                        )}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                deleteCategory(category.id);
                            }}
                            title="카테고리 삭제"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                </div>
                {/* 1depth의 하위 카테고리만 표시 (2depth) */}
                {category.isExpanded && category.children && isFirstDepth(category) &&
                    category.children.map(child => renderCategory(child, level + 1))
                }
            </div>
        );
    };

    return (
        <>
            <style>{`
                .rag-file-manager {
                    display: flex;
                    height: 100vh;
                    background-color: #f8f9fa;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
                }

                .file-manager-container {
                    display: flex;
                    width: 100%;
                    height: 100%;
                }

                .sidebar {
                    width: 320px;
                    background-color: white;
                    border-right: 1px solid #e9ecef;
                    display: flex;
                    flex-direction: column;
                }

                .sidebar-header {
                    padding: 1rem;
                    border-bottom: 1px solid #e9ecef;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .sidebar-header h2 {
                    margin: 0;
                    font-size: 1.25rem;
                    font-weight: 600;
                    color: #1a1a1a;
                }

                .sidebar-header button {
                    background: #3b82f6;
                    color: white;
                    border: none;
                    padding: 0.5rem;
                    cursor: pointer;
                    border-radius: 0.375rem;
                    transition: background-color 0.2s;
                }

                .sidebar-header button:hover {
                    background-color: #2563eb;
                }

                .category-tree {
                    flex: 1;
                    overflow-y: auto;
                    padding: 0.5rem;
                }

                .category-item {
                    margin: 0.125rem 0;
                }

                .category-header {
                    display: flex;
                    align-items: center;
                    padding: 0.5rem;
                    cursor: pointer;
                    border-radius: 0.375rem;
                    transition: background-color 0.2s;
                    position: relative;
                }

                .category-header:hover {
                    background-color: #f8f9fa;
                }

                .category-header.selected {
                    background-color: #dbeafe;
                    border: 1px solid #93c5fd;
                }

                .category-header button {
                    background: none;
                    border: none;
                    padding: 0.25rem;
                    margin-right: 0.25rem;
                    cursor: pointer;
                    color: #6c757d;
                    border-radius: 0.25rem;
                    transition: background-color 0.2s;
                }

                .category-header button:hover {
                    background-color: #e9ecef;
                }

                .category-icon {
                    margin-right: 0.5rem;
                    color: #3b82f6;
                    display: flex;
                    align-items: center;
                }

                .category-name {
                    flex: 1;
                    font-size: 0.875rem;
                    font-weight: 500;
                    color: #1a1a1a;
                }

                .category-actions {
                    display: flex;
                    gap: 0.25rem;
                    opacity: 0;
                    transition: opacity 0.2s;
                }

                .category-header:hover .category-actions {
                    opacity: 1;
                }

                .category-actions button {
                    background: none;
                    border: none;
                    padding: 0.25rem;
                    cursor: pointer;
                    color: #6c757d;
                    border-radius: 0.25rem;
                    transition: background-color 0.2s;
                }

                .category-actions button:hover {
                    background-color: #e9ecef;
                }

                .main-content {
                    flex: 1;
                    padding: 2rem;
                    overflow-y: auto;
                }

                .content-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 2rem;
                }

                .content-header h2 {
                    margin: 0;
                    font-size: 1.5rem;
                    font-weight: 600;
                    color: #1a1a1a;
                }

                .header-actions {
                    display: flex;
                    gap: 1rem;
                }

                .header-actions button {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.75rem 1rem;
                    background-color: white;
                    border: 1px solid #e9ecef;
                    border-radius: 0.5rem;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-weight: 500;
                }

                .header-actions button:hover {
                    background-color: #f8f9fa;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }

                .header-actions button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                /* 1depth용 카드 레이아웃만 */
                .file-list {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                    gap: 1rem;
                }

                .file-item {
                    background-color: white;
                    border: 1px solid #e9ecef;
                    border-radius: 0.75rem;
                    padding: 1.25rem;
                    transition: all 0.2s;
                    position: relative;
                }

                .file-item:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                }

                .file-info {
                    display: flex;
                    align-items: flex-start;
                    gap: 0.75rem;
                    margin-bottom: 1rem;
                }

                .file-info svg {
                    color: #3b82f6;
                    flex-shrink: 0;
                    margin-top: 0.125rem;
                }

                .file-details {
                    flex: 1;
                    min-width: 0;
                }

                .file-name {
                    font-size: 0.875rem;
                    font-weight: 500;
                    color: #1a1a1a;
                    word-break: break-word;
                    margin-bottom: 0.25rem;
                }

                .file-meta {
                    font-size: 0.75rem;
                    color: #6c757d;
                }

                .file-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 0.5rem;
                }

                .file-actions button {
                    background: none;
                    border: none;
                    padding: 0.375rem;
                    cursor: pointer;
                    color: #6c757d;
                    border-radius: 0.375rem;
                    transition: all 0.2s;
                }

                .file-actions button:hover {
                    background-color: #f8f9fa;
                    color: #1a1a1a;
                }

                /* 2depth용 대시보드 컨테이너 */
                .file-dashboard-container {
                    width: 100%;
                }

                /* 2depth용 대시보드 테이블 레이아웃 */
                .file-dashboard {
                    background-color: white;
                    border-radius: 0.75rem;
                    border: 1px solid #e9ecef;
                    overflow: hidden;
                }

                .file-table {
                    width: 100%;
                }

                .file-table-header {
                    display: grid;
                    grid-template-columns: 40px 1fr 100px 120px 100px;
                    gap: 1rem;
                    padding: 1rem 1.5rem;
                    background-color: #f8f9fa;
                    border-bottom: 1px solid #e9ecef;
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: #6c757d;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .file-table-body {
                    max-height: 60vh;
                    overflow-y: auto;
                }

                .file-table-row {
                    display: grid;
                    grid-template-columns: 40px 1fr 100px 120px 100px;
                    gap: 1rem;
                    padding: 1rem 1.5rem;
                    border-bottom: 1px solid #f1f3f4;
                    transition: background-color 0.2s;
                    align-items: center;
                }

                .file-table-row:hover {
                    background-color: #f8f9fa;
                }

                .file-table-row:last-child {
                    border-bottom: none;
                }

                .table-col-icon {
                    display: flex;
                    justify-content: center;
                    color: #3b82f6;
                }

                .table-col-name {
                    min-width: 0;
                }

                .file-name-display {
                    font-size: 0.875rem;
                    font-weight: 500;
                    color: #1a1a1a;
                    word-break: break-all;
                    line-height: 1.4;
                }

                .table-col-size,
                .table-col-date {
                    font-size: 0.75rem;
                    color: #6c757d;
                    text-align: center;
                }

                .table-col-actions {
                    display: flex;
                    justify-content: center;
                }

                .table-actions {
                    display: flex;
                    gap: 0.25rem;
                }

                .action-btn {
                    background: none;
                    border: none;
                    padding: 0.375rem;
                    cursor: pointer;
                    border-radius: 0.375rem;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .download-btn {
                    color: #059669;
                }

                .download-btn:hover {
                    background-color: #d1fae5;
                    color: #047857;
                }

                .delete-btn {
                    color: #dc2626;
                }

                .delete-btn:hover {
                    background-color: #fee2e2;
                    color: #b91c1c;
                }

                /* 2depth 빈 상태 */
                .file-empty-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 300px;
                    color: #6c757d;
                    text-align: center;
                    background-color: white;
                    border-radius: 0.75rem;
                    border: 1px solid #e9ecef;
                }

                .file-info {
                    display: flex;
                    align-items: flex-start;
                    gap: 0.75rem;
                    margin-bottom: 1rem;
                }

                .file-info svg {
                    color: #3b82f6;
                    flex-shrink: 0;
                    margin-top: 0.125rem;
                }

                .file-details {
                    flex: 1;
                    min-width: 0;
                }

                .file-name {
                    font-size: 0.875rem;
                    font-weight: 500;
                    color: #1a1a1a;
                    word-break: break-word;
                    margin-bottom: 0.25rem;
                }

                .file-meta {
                    font-size: 0.75rem;
                    color: #6c757d;
                }

                .file-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 0.5rem;
                }

                .file-actions button {
                    background: none;
                    border: none;
                    padding: 0.375rem;
                    cursor: pointer;
                    color: #6c757d;
                    border-radius: 0.375rem;
                    transition: all 0.2s;
                }

                .file-actions button:hover {
                    background-color: #f8f9fa;
                    color: #1a1a1a;
                }

                .no-selection {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100%;
                    color: #6c757d;
                    font-size: 1.125rem;
                }

                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: rgba(0, 0, 0, 0.5);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 1000;
                }

                .modal {
                    background-color: white;
                    border-radius: 0.75rem;
                    padding: 2rem;
                    width: 100%;
                    max-width: 400px;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
                }

                .modal h3 {
                    margin: 0 0 1.5rem 0;
                    font-size: 1.25rem;
                    font-weight: 600;
                    color: #1a1a1a;
                }

                .modal input {
                    width: 100%;
                    padding: 0.75rem;
                    border: 1px solid #e9ecef;
                    border-radius: 0.5rem;
                    margin-bottom: 1.5rem;
                    font-size: 0.875rem;
                    box-sizing: border-box;
                }

                .modal input:focus {
                    outline: none;
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                }

                .modal-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 1rem;
                }

                .modal-actions button {
                    padding: 0.75rem 1.5rem;
                    border: none;
                    border-radius: 0.5rem;
                    cursor: pointer;
                    font-weight: 500;
                    transition: background-color 0.2s;
                }

                .modal-actions button:first-child {
                    background-color: #f8f9fa;
                    color: #6c757d;
                }

                .modal-actions button:first-child:hover {
                    background-color: #e9ecef;
                }

                .modal-actions button:last-child {
                    background-color: #3b82f6;
                    color: white;
                }

                .modal-actions button:last-child:hover {
                    background-color: #2563eb;
                }

                .status-message {
                    position: fixed;
                    bottom: 2rem;
                    right: 2rem;
                    background-color: #d1fae5;
                    color: #065f46;
                    padding: 1rem 1.25rem;
                    border-radius: 0.5rem;
                    border: 1px solid #a7f3d0;
                    z-index: 1000;
                    font-weight: 500;
                }

                .error-message {
                    position: fixed;
                    bottom: 2rem;
                    right: 2rem;
                    background-color: #fee2e2;
                    color: #dc2626;
                    padding: 1rem 1.25rem;
                    border-radius: 0.5rem;
                    border: 1px solid #fca5a5;
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    z-index: 1000;
                    font-weight: 500;
                }

                .error-message button {
                    background: none;
                    border: none;
                    padding: 0;
                    cursor: pointer;
                    color: #dc2626;
                    font-size: 1.25rem;
                    line-height: 1;
                }

                .loading-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: rgba(255, 255, 255, 0.8);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 1000;
                }

                .loading-spinner {
                    width: 40px;
                    height: 40px;
                    border: 4px solid #f3f3f3;
                    border-top: 4px solid #3b82f6;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>

            <div className="rag-file-manager">
                <div className="file-manager-container">
                    {/* 왼쪽 사이드바 - 카테고리 트리 */}
                    <div className="sidebar">
                        <div className="sidebar-header">
                            <h2>카테고리</h2>
                            <button onClick={() => { setShowModal(true); setAddingToParent(null); }}>
                                <Plus size={20} />
                            </button>
                        </div>
                        <div className="category-tree">
                            {categories.map(category => renderCategory(category))}
                        </div>
                    </div>

                    {/* 오른쪽 메인 영역 - 파일 목록 */}
                    <div className="main-content">
                        {selectedCategory ? (
                            <>
                                <div className="content-header">
                                    <h2>
                                        {selectedCategory.name}
                                        <span style={{
                                            fontSize: '0.75rem',
                                            color: '#6c757d',
                                            marginLeft: '0.5rem',
                                            fontWeight: 'normal'
                                        }}>
                                            {isFirstDepth(selectedCategory) ? '(1depth - 루트 카테고리)' :
                                                isSecondDepth(selectedCategory) ? `(2depth - 파일 ${files.length}개)` :
                                                    '(depth 확인 중...)'}
                                        </span>
                                    </h2>
                                    <div className="header-actions">
                                        {/* 2depth에서만 파일 업로드 가능 */}
                                        {isSecondDepth(selectedCategory) && (
                                            <>
                                                <input
                                                    type="file"
                                                    id="file-upload"
                                                    multiple
                                                    onChange={handleFileUpload}
                                                    style={{ display: 'none' }}
                                                />
                                                <button
                                                    onClick={() => document.getElementById('file-upload').click()}
                                                    disabled={loading}
                                                >
                                                    <Upload size={20} />
                                                    <span>파일 업로드</span>
                                                </button>
                                                <button onClick={() => generateEmbedding(selectedCategory.id)}>
                                                    <Copy size={20} />
                                                    <span>임베딩 생성</span>
                                                </button>
                                            </>
                                        )}

                                        {/* 1depth에서는 헤더 액션 버튼 제거 */}
                                    </div>
                                </div>
                                <div className={isFirstDepth(selectedCategory) ? "file-list" : "file-dashboard-container"}>
                                    {isFirstDepth(selectedCategory) ? (
                                        /* 1depth - 하위 카테고리 목록 표시 */
                                        <>
                                            {/* 첫 번째에 항상 카테고리 생성 박스 표시 */}
                                            <div
                                                className="file-item"
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    backgroundColor: '#f8f9fa',
                                                    border: '2px dashed #e9ecef',
                                                    color: '#6c757d',
                                                    textAlign: 'center',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                                onClick={() => {
                                                    setShowModal(true);
                                                    setAddingToParent(selectedCategory.id);
                                                }}
                                                onMouseOver={(e) => {
                                                    e.currentTarget.style.backgroundColor = '#f1f5f9';
                                                    e.currentTarget.style.borderColor = '#3b82f6';
                                                }}
                                                onMouseOut={(e) => {
                                                    e.currentTarget.style.backgroundColor = '#f8f9fa';
                                                    e.currentTarget.style.borderColor = '#e9ecef';
                                                }}
                                            >
                                                <Plus size={24} style={{ marginBottom: '0.5rem', color: '#3b82f6' }} />
                                                <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#1a1a1a', marginBottom: '0.25rem' }}>
                                                    새 하위 카테고리
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>
                                                    2depth 카테고리 생성
                                                </div>
                                            </div>

                                            {/* 기존 하위 카테고리들 표시 */}
                                            {selectedCategory.children && selectedCategory.children.length > 0 &&
                                                selectedCategory.children.map(childCategory => (
                                                    <div
                                                        key={childCategory.id}
                                                        className="file-item"
                                                        onClick={() => setSelectedCategory(childCategory)}
                                                        style={{ cursor: 'pointer' }}
                                                    >
                                                        <div className="file-info">
                                                            <Folder size={24} style={{ color: '#3b82f6' }} />
                                                            <div className="file-details">
                                                                <div className="file-name">{childCategory.name}</div>
                                                                <div className="file-meta">
                                                                    2depth 카테고리 • 파일 업로드 가능
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="file-actions">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    deleteCategory(childCategory.id);
                                                                }}
                                                                title="카테고리 삭제"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))
                                            }
                                        </>
                                    ) : (
                                        /* 2depth - 파일 목록을 리스트 형식 대시보드로 표시 */
                                        files.length > 0 ? (
                                            <div className="file-dashboard">
                                                <div className="file-table">
                                                    <div className="file-table-header">
                                                        <div className="table-col-icon"></div>
                                                        <div className="table-col-name">파일명</div>
                                                        <div className="table-col-size">크기</div>
                                                        <div className="table-col-date">업로드일</div>
                                                        <div className="table-col-actions">작업</div>
                                                    </div>
                                                    <div className="file-table-body">
                                                        {files.map(file => (
                                                            <div key={file.id} className="file-table-row">
                                                                <div className="table-col-icon">
                                                                    <FileText size={18} />
                                                                </div>
                                                                <div className="table-col-name">
                                                                    <div className="file-name-display">{file.fileName}</div>
                                                                </div>
                                                                <div className="table-col-size">
                                                                    {(file.fileSize / 1024).toFixed(1)} KB
                                                                </div>
                                                                <div className="table-col-date">
                                                                    {file.uploadDate ? new Date(file.uploadDate).toLocaleDateString('ko-KR') : '-'}
                                                                </div>
                                                                <div className="table-col-actions">
                                                                    <div className="table-actions">
                                                                        <button
                                                                            onClick={() => downloadFile(file.id, file.fileName)}
                                                                            title="다운로드"
                                                                            className="action-btn download-btn"
                                                                        >
                                                                            <Download size={14} />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => deleteFile(file.id)}
                                                                            title="삭제"
                                                                            className="action-btn delete-btn"
                                                                        >
                                                                            <Trash2 size={14} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            /* 2depth - 파일이 없을 때 */
                                            <div className="file-empty-state">
                                                <FileText size={48} style={{ marginBottom: '1rem', color: '#adb5bd' }} />
                                                <p style={{ margin: '0', fontSize: '0.875rem' }}>
                                                    업로드된 파일이 없습니다.<br/>
                                                    "파일 업로드" 버튼을 클릭해서 파일을 추가해보세요.
                                                </p>
                                            </div>
                                        )
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="no-selection">
                                <p>카테고리를 선택해주세요</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* 새 카테고리 추가 모달 */}
                {showModal && (
                    <div className="modal-overlay">
                        <div className="modal">
                            <h3>
                                {addingToParent ? '2depth 카테고리 추가' : '1depth 카테고리 추가'}
                            </h3>
                            {addingToParent && (
                                <p style={{
                                    margin: '0 0 1rem 0',
                                    fontSize: '0.875rem',
                                    color: '#6c757d',
                                    backgroundColor: '#f8f9fa',
                                    padding: '0.5rem',
                                    borderRadius: '0.25rem'
                                }}>
                                    💡 2depth 카테고리에서는 파일 업로드만 가능합니다.
                                </p>
                            )}
                            <input
                                type="text"
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                placeholder="카테고리 이름"
                                onKeyPress={(e) => e.key === 'Enter' && addCategory(addingToParent)}
                            />
                            <div className="modal-actions">
                                <button onClick={() => {
                                    setShowModal(false);
                                    setNewCategoryName('');
                                    setAddingToParent(null);
                                }}>
                                    취소
                                </button>
                                <button onClick={() => addCategory(addingToParent)}>
                                    추가
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 상태 메시지 표시 */}
                {uploadStatus && (
                    <div className="status-message">
                        {uploadStatus}
                    </div>
                )}

                {/* 에러 메시지 표시 */}
                {error && (
                    <div className="error-message">
                        {error}
                        <button onClick={() => setError(null)}>✕</button>
                    </div>
                )}

                {/* 로딩 인디케이터 */}
                {loading && (
                    <div className="loading-overlay">
                        <div className="loading-spinner"></div>
                    </div>
                )}
            </div>
        </>
    );
};

export default RAGFileManager;