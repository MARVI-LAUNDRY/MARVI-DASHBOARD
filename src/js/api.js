const base = "https://marvi-api.onrender.com/api/"

export const getApi = (endpoint, token = '') => {
    return fetch(`${base}${endpoint}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    }).then(response => response.json());
};

export const postApi = (endpoint, data = {}, token = '') => {
    const isFormData = data instanceof FormData;
    const options = {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: isFormData ? data : JSON.stringify(data)
    };

    // Solo agregar Content-Type si NO es FormData
    if (!isFormData) {
        options.headers['Content-Type'] = 'application/json';
    }

    return fetch(`${base}${endpoint}`, options)
        .then(response => response.json());
};

export const putApi = (endpoint, data = {}, token = '') => {
    const isFormData = data instanceof FormData;
    const options = {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: isFormData ? data : JSON.stringify(data)
    };

    if (!isFormData) {
        options.headers['Content-Type'] = 'application/json';
    }

    return fetch(`${base}${endpoint}`, options)
        .then(response => response.json());
};

export const patchApi = (endpoint, data = {}, token = '') => {
    return fetch(`${base}${endpoint}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
    }).then(response => response.json());
};

export const deleteApi = (endpoint, token = '') => {
    return fetch(`${base}${endpoint}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    }).then(response => response.json());
};